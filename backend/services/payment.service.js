const crypto = require('crypto');
const env = require('../config/env');

/** Razorpay instance (lazy) — only when credentials are configured. */
let razorpayInstance = null;
const getRazorpay = () => {
  if (!env.paymentConfigured) return null;
  if (!razorpayInstance) {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({ key_id: env.payment.key, key_secret: env.payment.secret });
  }
  return razorpayInstance;
};

/**
 * Create a Razorpay order for prepaid checkout.
 * Returns null when payments are not configured (COD-only mode).
 */
const createRazorpayOrder = async ({ amount, receipt, notes = {} }) => {
  const rzp = getRazorpay();
  if (!rzp) return null;
  return rzp.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt,
    notes,
  });
};

/**
 * Server-side verification of the Razorpay payment signature.
 * The client never tells the server "payment succeeded" — the signature
 * generated with the server-only secret proves it.
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!env.paymentConfigured) return false;
  const expected = crypto
    .createHmac('sha256', env.payment.secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
};

module.exports = { createRazorpayOrder, verifyPaymentSignature, getRazorpay };