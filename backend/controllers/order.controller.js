const Order = require('../models/Order');
const InvoiceModel = require('../models/Invoice');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const orderService = require('../services/order.service');
const paymentService = require('../services/payment.service');
const notificationService = require('../services/notification.service');
const audit = require('../services/audit.service');
const realtime = require('../services/realtime.service');
const emailService = require('../services/email.service');
const { createInvoiceForOrder } = require('../services/invoice.service');
const { buildCartView } = require('./cart.controller');

/** POST /api/orders — place an order from cart (or explicit items). */
const placeOrder = asyncHandler(async (req, res) => {
  const user = req.user;
  const { addressId, address, items: explicitItems, paymentMethod = 'CASH_ON_DELIVERY' } = req.body;

  let addressObj;
  if (addressId) {
    const saved = user.addresses.find((a) => a._id.toString() === addressId);
    if (!saved) throw ApiError.badRequest('Saved address not found');
    addressObj = saved;
  } else if (address) {
    addressObj = address;
    const errs = [];
    if (!addressObj.addressLine1) errs.push('Address line 1');
    if (!addressObj.city) errs.push('City');
    if (!addressObj.state) errs.push('State');
    if (!String(addressObj.pincode || '').match(/^\d{4,6}$/)) errs.push('Pincode');
    if (errs.length) throw ApiError.badRequest(`Missing or invalid shipping fields: ${errs.join(', ')}`);
  } else {
    throw ApiError.badRequest('Please provide a shipping address');
  }

  let items = explicitItems;
  if (!items) {
    const cart = await require('../models/Cart').findOne({ user: user._id });
    if (!cart || !cart.items.length) throw ApiError.badRequest('Your cart is empty');
    items = cart.items.map((i) => ({ productId: i.product.toString(), quantity: i.quantity }));
  } else {
    items = items.map((i) => ({ productId: i.productId, quantity: i.quantity, prescriptionId: i.prescriptionId }));
  }

  const order = await orderService.createOrder({
    user,
    address: addressObj,
    items,
    paymentMethod,
    clearCart: !explicitItems,
    req,
  });

  let razorpayOrder = null;
  if (paymentMethod === 'ONLINE') {
    razorpayOrder = await paymentService.createRazorpayOrder({
      amount: order.total,
      receipt: order.orderId,
      notes: { orderId: order.orderId, customer: user.email },
    });
  }

  ok(res, {
    status: 201,
    message: 'Order placed successfully',
    data: { order, razorpayOrder },
  });
});

/** GET /api/orders/mine — my orders, newest first, paginated. */
const myOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(30, parseInt(req.query.limit || '10', 10));
  const query = { customer: req.user._id };
  if (req.query.status) query.status = req.query.status;

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  ok(res, { data: { orders, total, page, limit }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

/** GET /api/orders/:id — owner/admin/sales only. */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customer', 'name email mobile');
  if (!order) throw ApiError.notFound('Order not found');

  const isOwner = order.customer._id.toString() === req.user._id.toString();
  const staff = ['ADMIN', 'SALES_OPERATOR'].includes(req.user.role);
  if (!isOwner && !staff) throw ApiError.forbidden('You cannot view this order');

  ok(res, { data: { order } });
});

/** POST /api/orders/:id/cancel — customer cancels while still cancellable. */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.customer.toString() !== req.user._id.toString()) throw ApiError.forbidden('You cannot cancel this order');

  const cancellable = ['ORDER_PLACED', 'CONFIRMED'];
  if (!cancellable.includes(order.status)) {
    throw ApiError.badRequest(`Orders in "${order.status.replace(/_/g, ' ')}" status cannot be cancelled. Contact support.`);
  }
  if (order.payment?.method === 'ONLINE' && order.payment?.status === 'PAID') {
    throw ApiError.badRequest('This prepaid order requires a refund process — contact support to cancel.');
  }

  const updated = await orderService.updateOrderStatus({
    orderId: order.orderId,
    newStatus: 'CANCELLED',
    changedBy: req.user,
    note: `Cancelled by customer${req.body.reason ? ` — ${req.body.reason}` : ''}`,
    req,
  });
  ok(res, { message: 'Order cancelled. Stock has been restored.', data: { order: updated } });
});

/** GET /api/orders/:id/track — status timeline for customers. */
const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('orderId status statusHistory estimatedDelivery items total deliveryNotes');
  if (!order) throw ApiError.notFound('Order not found');
  if (order.customer.toString() !== req.user._id.toString() && !['ADMIN', 'SALES_OPERATOR'].includes(req.user.role)) {
    throw ApiError.forbidden('You cannot track this order');
  }
  ok(res, { data: { tracking: order } });
});

module.exports = { placeOrder, myOrders, getOrder, cancelOrder, trackOrder };