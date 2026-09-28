const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Inventory = require('../models/Inventory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const audit = require('../services/audit.service');
const realtime = require('../services/realtime.service');
const notificationService = require('../services/notification.service');
const inventoryService = require('../services/inventory.service');
const { publicUrl } = require('../middleware/upload.middleware');

const PRODUCT_FIELDS = [
  'name', 'genericName', 'brandName', 'category', 'description', 'manufacturer',
  'batchNumber', 'mfgDate', 'expiryDate', 'mrp', 'distributorPrice', 'gst',
  'discountPercent', 'quantity', 'minimumStockLevel', 'unit', 'prescriptionRequired', 'active',
];

/** POST /api/admin/products — ADMIN ONLY. Returns the live product. */
const createProduct = asyncHandler(async (req, res) => {
  const payload = {};
  for (const key of PRODUCT_FIELDS) {
    if (req.body[key] !== undefined) payload[key] = req.body[key];
  }
  if (req.file) payload.image = publicUrl('products', req.file.filename);

  if (!mongoose.isValidObjectId(payload.category)) throw ApiError.badRequest('Invalid category selected');
  const category = await Category.findById(payload.category);
  if (!category) throw ApiError.badRequest('Selected category does not exist');

  payload.createdBy = req.user._id;
  payload.updatedBy = req.user._id;

  const product = await Product.create(payload);

  if (product.quantity > 0) {
    await Inventory.create({
      product: product._id,
      change: product.quantity,
      reason: 'ADJUSTMENT',
      referenceType: 'Product',
      referenceId: product._id,
      quantityBefore: 0,
      quantityAfter: product.quantity,
      note: 'Initial stock on creation',
      createdBy: req.user._id,
    });
  }

  realtime.emitBroadcast('product:created', product);
  await notificationService.notifyUser({
    user: req.user._id,
    type: 'NEW_PRODUCT',
    title: 'Product published',
    message: `${product.name} is now live on the website.`,
    link: `/products/${product._id}`,
    icon: 'pill',
  });
  await audit({ user: req.user, action: 'PRODUCT_CREATED', resource: 'Product', resourceId: product._id, details: { name: product.name }, req });

  ok(res, { status: 201, message: 'Product created successfully and is now visible on the customer site.', data: { product } });
});

/** PATCH /api/admin/products/:id — ADMIN ONLY. */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  for (const key of PRODUCT_FIELDS) {
    if (req.body[key] !== undefined) product[key] = req.body[key];
  }
  if (req.file) product.image = publicUrl('products', req.file.filename);
  product.updatedBy = req.user._id;
  await product.save();

  realtime.emitBroadcast('product:updated', product);
  if (product.quantity <= product.minimumStockLevel) {
    await inventoryService.raiseLowStockAlert(product);
  }
  await audit({ user: req.user, action: 'PRODUCT_UPDATED', resource: 'Product', resourceId: product._id, details: { name: product.name }, req });

  ok(res, { message: 'Product updated successfully', data: { product } });
});

/** DELETE /api/admin/products/:id — ADMIN ONLY (soft delete + remove from catalogue). */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  product.active = false;
  product.quantity = 0;
  product.updatedBy = req.user._id;
  await product.save();

  realtime.emitBroadcast('product:deleted', { productId: product._id, name: product.name });
  await audit({ user: req.user, action: 'PRODUCT_DELETED', resource: 'Product', resourceId: product._id, details: { name: product.name }, req });

  ok(res, { message: 'Product removed from the catalogue' });
});

/** PATCH /api/admin/products/:id/stock — adjust inventory with ledger. */
const adjustStock = asyncHandler(async (req, res) => {
  const { change, note = '' } = req.body;
  const delta = Number(change);
  if (!delta || Math.abs(delta) > 100000) throw ApiError.badRequest('Provide a valid stock change amount');

  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  if (product.quantity + delta < 0) throw ApiError.badRequest('Stock cannot go below zero');

  const result = await inventoryService.changeStock({
    product,
    change: delta,
    reason: 'RESTOCK',
    referenceType: 'Product',
    referenceId: product._id,
    note: note || 'Manual stock adjustment',
    createdBy: req.user._id,
  });

  await audit({ user: req.user, action: 'INVENTORY_CHANGED', resource: 'Product', resourceId: product._id, details: { change: delta, note }, req });
  ok(res, { message: `Stock updated to ${result.product.quantity} units`, data: { product: result.product, lowStock: result.lowStock } });
});

/** GET /api/admin/products — full catalogue incl. inactive + filters (ADMIN/SALES). */
const adminListProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const q = (req.query.q || '').trim();
  const status = req.query.status || 'all';
  const category = req.query.category || 'all';
  const lowStockOnly = req.query.lowStock === 'true';

  const query = {};
  try {
    if (q) {
      // Use regex search if text index is not available, otherwise use $text
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { genericName: { $regex: q, $options: 'i' } },
        { brandName: { $regex: q, $options: 'i' } },
      ];
    }
    if (status === 'active') query.active = true;
    if (status === 'inactive') query.active = false;
    if (lowStockOnly) query.$expr = { $lte: ['$quantity', '$minimumStockLevel'] };
    if (category !== 'all') query.category = category;
  } catch (err) {
    console.error('[products] query build error:', err.message);
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  ok(res, { data: { products, total, page, limit }, meta: { total, page, limit, pages: Math.ceil(total / limit) || 0 } });
});

module.exports = { createProduct, updateProduct, deleteProduct, adjustStock, adminListProducts };