const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const paymentService = require('../services/payment.service');
const orderService = require('../services/order.service');
const notificationService = require('../services/notification.service');
const realtime = require('../services/realtime.service');
const emailService = require('../services/email.service');
const audit = require('../services/audit.service');
const { createInvoiceForOrder } = require('../services/invoice.service');
const { getInvoiceFilePath } = require('../services/invoice.service');

/**
 * POST /api/payments/verify — called by our backend after the client completes
 * Razorpay checkout. The signature (HMAC with server secret) is verified here;
 * the order is marked PAID only after a valid signature.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

  const valid = paymentService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) {
    throw ApiError.badRequest('Payment verification failed. Please contact support if money was deducted.');
  }

  const order = await Order.findOne({ orderId }).populate('customer', 'name email mobile');
  if (!order) throw ApiError.notFound('Order not found');
  if (order.payment?.status === 'PAID') {
    return ok(res, { message: 'Payment already confirmed', data: { order } });
  }

  order.payment.status = 'PAID';
  order.payment.transactionId = razorpayPaymentId;
  order.payment.paymentReference = razorpayOrderId;
  order.payment.paidAt = new Date();
  order.statusHistory.push({
    status: order.status,
    note: `Payment verified (${razorpayPaymentId})`,
    changedBy: req.user?._id,
  });
  await order.save();

  // Generate + email invoice for prepaid orders immediately.
  try {
    const invoice = await createInvoiceForOrder({ order });
    if (invoice.pdfPath) {
      await emailService.sendInvoiceEmail({
        to: order.customer.email,
        name: order.customer.name,
        orderId: order.orderId,
        invoiceNumber: invoice.invoiceNumber,
        total: order.total,
        pdfPath: invoice.pdfPath,
      });
    }
  } catch (e) {
    console.error('[payment] invoice error:', e.message);
  }

  await notificationService.notifyUser({
    user: order.customer._id,
    type: 'PAYMENT_UPDATE',
    title: 'Payment received',
    message: `Payment of ₹${order.total.toFixed(2)} for ${order.orderId} was successful.`,
    link: `/dashboard/orders/${order._id}`,
    icon: 'banknote',
  });
  realtime.emitToUser(order.customer._id, 'payment:update', { orderId: order.orderId, status: 'PAID' });
  await audit({ user: req.user || order.customer, action: 'PAYMENT_VERIFIED', resource: 'Order', resourceId: order._id, details: { orderId: order.orderId, txn: razorpayPaymentId }, req });

  ok(res, { message: 'Payment verified successfully', data: { order } });
});

/** POST /api/payments/cod-confirm — sales staff confirms COD payment on delivery. */
const confirmCod = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.body.orderId }).populate('customer', 'name email');
  if (!order) throw ApiError.notFound('Order not found');
  if (order.payment?.method !== 'CASH_ON_DELIVERY') throw ApiError.badRequest('This is not a COD order');

  order.payment.status = 'PAID';
  order.payment.paidAt = new Date();
  order.payment.transactionId = `COD-${Date.now()}`;
  await order.save();

  await notificationService.notifyUser({
    user: order.customer._id,
    type: 'PAYMENT_UPDATE',
    title: 'Payment received (COD)',
    message: `Cash payment of ₹${order.total.toFixed(2)} for ${order.orderId} confirmed.`,
    link: `/dashboard/orders/${order._id}`,
    icon: 'banknote',
  });
  await audit({ user: req.user, action: 'COD_CONFIRMED', resource: 'Order', resourceId: order._id, details: { orderId: order.orderId }, req });
  ok(res, { message: 'COD payment confirmed', data: { order } });
});

module.exports = { verifyPayment, confirmCod };