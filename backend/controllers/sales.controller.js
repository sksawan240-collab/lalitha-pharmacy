const Order = require('../models/Order');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const stats = require('../services/stats.service');
const orderService = require('../services/order.service');
const inventoryService = require('../services/inventory.service');
const audit = require('../services/audit.service');

/** GET /api/sales/overview — sales operator KPI cards. */
const overview = asyncHandler(async (req, res) => {
  const data = await stats.salesOperatorOverview(req.user._id);
  ok(res, { data });
});

/** GET /api/sales/orders — all orders for processing (paginated + filterable). */
const orders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '15', 10));
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.q) {
    const re = new RegExp(req.query.q.trim(), 'i');
    query.$or = [{ orderId: re }, { 'shippingAddress.addressLine1': re }, { 'customer': null }];
    const userMatches = await User.find({ $or: [{ name: re }, { email: re }] }).select('_id');
    if (userMatches.length) query.$or.push({ customer: { $in: userMatches.map((u) => u._id) } });
  }

  const total = await Order.countDocuments(query);
  const ordersList = await Order.find(query)
    .populate('customer', 'name email mobile')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  ok(res, { data: { orders: ordersList, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

/** GET /api/sales/orders/:id — full detail incl. items + history. */
const orderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customer', 'name email mobile');
  if (!order) throw ApiError.notFound('Order not found');
  ok(res, { data: { order } });
});

/** PATCH /api/sales/orders/:id/status — advance/change order status. */
const changeStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  const allowed = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
  if (!allowed.includes(status)) throw ApiError.badRequest('Invalid order status');

  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const updated = await orderService.updateOrderStatus({
    orderId: order.orderId,
    newStatus: status,
    changedBy: req.user,
    note,
    req,
  });
  ok(res, { message: `Order marked as ${status.replace(/_/g, ' ').toLowerCase()}`, data: { order: updated } });
});

/** GET /api/sales/inventory — product availability view (read-only). */
const inventory = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const query = { active: true };
  if (q) query.$text = { $search: q };
  const products = await require('../models/Product')
    .find(query)
    .populate('category', 'name')
    .select('name brandName category quantity minimumStockLevel distributorPrice mrp prescriptionRequired expiryDate unit image')
    .sort({ name: 1 })
    .limit(200);
  ok(res, { data: { products } });
});

/** GET /api/sales/customers — customer directory for operators. */
const customers = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
  const query = { role: 'CUSTOMER' };
  if (q) {
    const re = new RegExp(q, 'i');
    query.$or = [{ name: re }, { email: re }, { mobile: re }];
  }
  const total = await User.countDocuments(query);
  const users = await User.find(query).select('name email mobile city state addresses createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  ok(res, { data: { customers: users, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

/** GET /api/sales/low-stock */
const lowStock = asyncHandler(async (req, res) => {
  const products = await require('../models/Product').aggregate([
    { $match: { active: true, $expr: { $lte: ['$quantity', '$minimumStockLevel'] } } },
    { $sort: { quantity: 1 } },
    { $project: { name: 1, brandName: 1, quantity: 1, minimumStockLevel: 1, unit: 1 } },
  ]);
  ok(res, { data: { products } });
});

/** GET /api/sales/sales — sales records (delivered orders). */
const salesRecords = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '15', 10));
  const total = await require('../models/Sale').countDocuments();
  const sales = await require('../models/Sale')
    .find({})
    .populate('customer', 'name email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  ok(res, { data: { sales, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

module.exports = { overview, orders, orderDetail, changeStatus, inventory, customers, lowStock, salesRecords };