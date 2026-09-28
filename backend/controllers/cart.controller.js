const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');

const getCartDoc = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

/** Build a full cart view with live product data and price/GST totals. */
const buildCartView = async (cart) => {
  if (!cart.items.length) {
    return { items: [], subtotal: 0, gst: 0, discount: 0, total: 0 };
  }
  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } })
    .populate('category', 'name')
    .lean();
  const map = new Map(products.map((p) => [p._id.toString(), p]));
  const items = [];
  let subtotal = 0;
  let gst = 0;
  let discount = 0;

  for (const entry of cart.items) {
    const product = map.get(entry.product.toString());
    if (!product) continue; // deleted items skipped (still valid for others)
    const price = product.distributorPrice || 0;
    const base = price * entry.quantity;
    const lineDiscount = (base * (product.discountPercent || 0)) / 100;
    const lineGst = ((base - lineDiscount) * (product.gst || 0)) / 100;
    subtotal += base;
    discount += lineDiscount;
    gst += lineGst;

    items.push({
      productId: product._id,
      name: product.name,
      genericName: product.genericName,
      brandName: product.brandName,
      category: product.category?.name || '',
      image: product.image,
      price,
      mrp: product.mrp,
      gstPercent: product.gst || 0,
      discountPercent: product.discountPercent || 0,
      unit: product.unit,
      quantity: entry.quantity,
      availableStock: product.quantity,
      prescriptionRequired: product.prescriptionRequired || false,
      active: product.active,
      expired: product.expiryDate ? product.expiryDate < new Date() : false,
    });
  }

  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    total: Math.round((subtotal - discount + gst) * 100) / 100,
  };
};

/** GET /api/cart */
const getCart = asyncHandler(async (req, res) => {
  const cart = await getCartDoc(req.user._id);
  const view = await buildCartView(cart);
  ok(res, { data: { cart: view } });
});

/** POST /api/cart/items — { productId, quantity } */
const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.active) throw ApiError.notFound('Product not available');
  if (inventoryExpired(product)) throw ApiError.badRequest(`${product.name} has expired and cannot be ordered.`);
  if (quantity < 1 || quantity > 99) throw ApiError.badRequest('Quantity must be between 1 and 99');
  if (product.quantity < quantity) {
    throw ApiError.badRequest(`Only ${product.quantity} unit(s) of ${product.name} available in stock.`);
  }

  const cart = await getCartDoc(req.user._id);
  const existing = cart.items.find((i) => i.product.toString() === productId);
  if (existing) {
    const combined = existing.quantity + quantity;
    if (combined > product.quantity) {
      throw ApiError.badRequest(`Maximum available stock for ${product.name} is ${product.quantity} unit(s).`);
    }
    existing.quantity = combined;
  } else {
    cart.items.push({ product: productId, quantity });
  }
  await cart.save();

  const view = await buildCartView(cart);
  ok(res, { message: `${product.name} added to your cart`, data: { cart: view } });
});

/** PATCH /api/cart/items/:productId — { quantity } */
const updateQuantity = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw ApiError.badRequest('Quantity must be a whole number between 1 and 99');

  const cart = await getCartDoc(req.user._id);
  const entry = cart.items.find((i) => i.product.toString() === req.params.productId);
  if (!entry) throw ApiError.notFound('Item not found in cart');

  const product = await Product.findById(req.params.productId);
  if (product && qty > product.quantity) {
    throw ApiError.badRequest(`Only ${product.quantity} unit(s) of ${product.name} available in stock.`);
  }

  entry.quantity = qty;
  await cart.save();
  const view = await buildCartView(cart);
  ok(res, { message: 'Cart updated', data: { cart: view } });
});

/** DELETE /api/cart/items/:productId */
const removeItem = asyncHandler(async (req, res) => {
  const cart = await getCartDoc(req.user._id);
  const before = cart.items.length;
  cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  if (cart.items.length === before) throw ApiError.notFound('Item not found in cart');
  await cart.save();
  const view = await buildCartView(cart);
  ok(res, { message: 'Item removed from cart', data: { cart: view } });
});

/** DELETE /api/cart */
const clearCart = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } }, { upsert: true });
  ok(res, { message: 'Cart cleared', data: { cart: emptyView() } });
});

const emptyView = () => ({ items: [], subtotal: 0, gst: 0, discount: 0, total: 0 });
const inventoryExpired = (product) => product.expiryDate && product.expiryDate < new Date();

module.exports = { getCart, addItem, updateQuantity, removeItem, clearCart, buildCartView };