const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const stats = require('../services/stats.service');
const audit = require('../services/audit.service');
const inventoryService = require('../services/inventory.service');
const emailService = require('../services/email.service');
const env = require('../config/env');

const overview = asyncHandler(async (req, res) => {
  ok(res, { data: await stats.ADMIN_OVERVIEW() });
});

const analytics = asyncHandler(async (req, res) => {
  const [a, b, c, d, e] = await Promise.all([
    stats.orderStatusBreakdown(), stats.salesTrend(12),
    stats.topProducts(6), stats.ordersDaily(14), stats.customerGrowth(12),
  ]);
  ok(res, { data: { orderStatusBreakdown: a, salesTrend: b, topProducts: c, ordersDaily: d, customerGrowth: e } });
});

const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
  const q = {};
  if (req.query.role) q.role = req.query.role;
  if (req.query.status) q.status = req.query.status;
  if (req.query.q) { const re = new RegExp(req.query.q.trim(), 'i'); q.$or = [{ name: re }, { email: re }, { mobile: re }]; }
  const total = await User.countDocuments(q);
  const users = await User.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  ok(res, { data: { users, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

const createStaff = asyncHandler(async (req, res) => {
  const { name, email, mobile, role } = req.body;
  const staffRole = role || 'SALES_OPERATOR';
  if (staffRole !== 'SALES_OPERATOR') throw ApiError.forbidden('Only SALES_OPERATOR accounts can be created here');
  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) throw ApiError.conflict('A user with this email already exists');
  const temp = require('crypto').randomBytes(9).toString('hex').slice(0, 10) + 'Aa1!';
  const user = await User.create({ name, email, mobile, password: temp, role: staffRole, isVerified: true, mustChangePassword: true });
  if (env.emailConfigured) {
    emailService.sendMail({ to: user.email, subject: 'Your Lalitha Pharmacy staff account',
      html: '<p>Hello ' + name + '</p><p>Temp password: <b>' + temp + '</b></p><p>Login: ' + env.frontendUrl + '</p>' }).catch(() => {});
  } else { console.log('[staff-temp-password]', user.email, temp); }
  await audit({ user: req.user, action: 'USER_CREATED', resource: 'User', resourceId: user._id, details: { role: staffRole }, req });
  ok(res, { status: 201, message: 'Sales operator account created', data: { user } });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.toString() === req.user._id.toString() && (req.body.role || req.body.status === 'SUSPENDED')) {
    throw ApiError.badRequest('You cannot modify your own role or suspend yourself');
  }
  if (req.body.role && ['ADMIN', 'SALES_OPERATOR', 'CUSTOMER'].includes(req.body.role)) {
    await audit({ user: req.user, action: 'USER_ROLE_CHANGED', resource: 'User', resourceId: user._id, details: { from: user.role, to: req.body.role }, req });
    user.role = req.body.role;
  }
  if (req.body.status && ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(req.body.status)) user.status = req.body.status;
  await user.save();
  ok(res, { message: 'User updated', data: { user } });
});
const auditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
  const q = {};
  if (req.query.action) q.action = req.query.action;
  const total = await AuditLog.countDocuments(q);
  const logs = await AuditLog.find(q).populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  ok(res, { data: { logs, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

const lowStock = asyncHandler(async (req, res) => {
  const products = await Product.aggregate([
    { $match: { active: true, $expr: { $lte: ['$quantity', '$minimumStockLevel'] } } },
    { $sort: { quantity: 1 } },
    { $project: { name: 1, brandName: 1, quantity: 1, minimumStockLevel: 1, unit: 1, batchNumber: 1, image: 1 } },
  ]);
  ok(res, { data: { products } });
});

const expiryList = asyncHandler(async (req, res) => {
  const days = Math.min(365, parseInt(req.query.days || '30', 10));
  ok(res, { data: await inventoryService.getExpiryList({ days }) });
});

const runExpiryScan = asyncHandler(async (req, res) => {
  ok(res, { message: 'Expiry scan complete', data: await inventoryService.runExpiryScan({ days: parseInt(req.body.days || '30', 10) }) });
});

const reports = asyncHandler(async (req, res) => {
  const [sa, os, tp, inv] = await Promise.all([
    Sale.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    stats.topProducts(10),
    Product.find({}).select('name brandName quantity minimumStockLevel distributorPrice active').lean(),
  ]);
  ok(res, { data: { sales: sa.length ? sa[0] : { total: 0, count: 0 }, ordersByStatus: os, topProducts: tp, inventory: inv } });
});

const orderService = require('../services/order.service');

const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.q) {
    const re = new RegExp(req.query.q.trim(), 'i');
    query.$or = [{ orderId: re }, { 'shippingAddress.city': re }, { 'shippingAddress.addressLine1': re }];
  }
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('customer', 'name email mobile')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  ok(res, { data: { orders, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

const orderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customer', 'name email mobile');
  if (!order) throw ApiError.notFound('Order not found');
  ok(res, { data: { order } });
});

const changeOrderStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
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

module.exports = { overview, analytics, listUsers, createStaff, updateUser, auditLogs, lowStock, expiryList, runExpiryScan, reports, listOrders, orderDetail, changeOrderStatus };
