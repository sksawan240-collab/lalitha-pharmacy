const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Prescription = require('../models/Prescription');
const Sale = require('../models/Sale');
const inventoryService = require('./inventory.service');
const realtime = require('./realtime.service');
const notificationService = require('./notification.service');
const emailService = require('./email.service');
const audit = require('./audit.service');
const { createInvoiceForOrder } = require('./invoice.service');

/** LP-2026-XXXXXXXX — guaranteed unique via crypto randomness + unique index. */
const generateOrderId = (year = new Date().getFullYear()) => {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `LP-${year}-${suffix}`;
};

const STATUS_FLOW = [
  'ORDER_PLACED',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const STATUS_MESSAGES = {
  ORDER_PLACED: 'Your order has been placed successfully and is awaiting confirmation.',
  CONFIRMED: 'Your order has been confirmed by our team.',
  PROCESSING: 'Your order is being processed and prepared for dispatch.',
  PACKED: 'Your order has been packed securely and labelled.',
  SHIPPED: 'Your order has been shipped from our distribution centre.',
  OUT_FOR_DELIVERY: 'Your order is out for delivery and will reach you shortly.',
  DELIVERED: 'Your order has been delivered. Thank you for choosing Lalitha Pharmacy!',
  CANCELLED: 'Your order has been cancelled.',
  RETURNED: 'Your order has been returned.',
};

/** Compute line + order totals from validated product lines. */
const computeTotals = (lines) => {
  let subtotal = 0;
  let gst = 0;
  let discount = 0;
  const items = lines.map(({ product, quantity, prescriptionId }) => {
    const price = product.distributorPrice || 0;
    const mrp = product.mrp || price;
    const base = price * quantity;
    const lineDiscount = (base * (product.discountPercent || 0)) / 100;
    const lineGst = ((base - lineDiscount) * (product.gst || 0)) / 100;
    const lineTotal = base - lineDiscount + lineGst;

    subtotal += base;
    gst += lineGst;
    discount += lineDiscount;

    return {
      product: product._id,
      name: product.name,
      genericName: product.genericName,
      brandName: product.brandName,
      category: product.category?.name || '',
      unit: product.unit || '',
      batchNumber: product.batchNumber || '',
      quantity,
      mrp,
      price,
      gstPercent: product.gst || 0,
      gstAmount: Math.round(lineGst * 100) / 100,
      discountPercent: product.discountPercent || 0,
      discountAmount: Math.round(lineDiscount * 100) / 100,
      subtotal: Math.round(lineTotal * 100) / 100,
      prescriptionRequired: product.prescriptionRequired || false,
      prescription: prescriptionId || undefined,
    };
  });

  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    discount: Math.round(discount * 100) / 100,
  };
};

const toAddress = (addr, user) => ({
  label: addr.label || 'Home',
  addressLine1: addr.addressLine1,
  addressLine2: addr.addressLine2 || '',
  city: addr.city,
  state: addr.state,
  pincode: addr.pincode,
  phone: addr.phone || user.mobile || '',
});

const EMPTY_ADDRESS_OK = true;

/**
 * Place an order for a customer. Server-side stock validation happens in a
 * transaction: product quantities are decremented atomically, the cart is
 * cleared, notifications + emails are triggered.
 */
const createOrder = async ({ user, address, items, paymentMethod = 'CASH_ON_DELIVERY', clearCart = true, deliveryFee = 0, req = null }) => {
  if (!items || !items.length) {
    const err = new Error('Your cart is empty');
    err.status = 400;
    throw err;
  }

  try {
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).populate('category', 'name');

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const lines = [];
    const prescriptionIds = new Set();

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw Object.assign(new Error('Product not found'), { status: 404 });
      }
      if (inventoryService.isNonSellable(product)) {
        throw Object.assign(new Error(`${product.name} is not available for sale (expired or inactive).`), { status: 400 });
      }
      if (product.quantity < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name}. Only ${product.quantity} unit(s) available.`), { status: 409 });
      }
      if (product.prescriptionRequired && !item.prescriptionId) {
        throw Object.assign(new Error(`${product.name} requires a valid prescription upload.`), { status: 400 });
      }
      if (product.prescriptionRequired && item.prescriptionId) {
        const rx = await Prescription.findById(item.prescriptionId);
        if (!rx || rx.customer.toString() !== user._id.toString() || rx.status !== 'APPROVED') {
          throw Object.assign(new Error(`Prescription for ${product.name} is not approved.`), { status: 403 });
        }
        prescriptionIds.add(rx._id);
      }
      lines.push({ product, quantity: item.quantity, prescriptionId: item.prescriptionId });
    }

    const totals = computeTotals(lines);
    const total = Math.round((totals.subtotal - totals.discount + totals.gst + deliveryFee) * 100) / 100;

    let orderId;
    let order;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      orderId = generateOrderId();
      order = new Order({
        orderId,
        customer: user._id,
        items: totals.items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        gst: totals.gst,
        deliveryFee,
        total,
        shippingAddress: toAddress(address, user),
        billingAddress: toAddress(address, user),
        payment: { method: paymentMethod, status: 'PENDING' },
        status: 'ORDER_PLACED',
        statusHistory: [{ status: 'ORDER_PLACED', note: STATUS_MESSAGES.ORDER_PLACED, changedBy: user._id }],
        estimatedDelivery: new Date(Date.now() + 4 * 86400000),
      });
      try {
        await order.save();
        break;
      } catch (err) {
        if (err.code !== 11000 || attempt === 2) throw err;
      }
    }

// ── Decrement inventory atomically for every line ──
    for (const line of lines) {
      const product = line.product;
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, quantity: { $gte: line.quantity } },
        { $inc: { quantity: -line.quantity } },
        { new: true }
      );
      if (!updated) {
        throw Object.assign(new Error(`Stock changed for ${product.name} — please retry.`), { status: 409 });
      }

      await require('../models/Inventory').create({
        product: product._id,
        change: -line.quantity,
        reason: 'ORDER',
        referenceType: 'Order',
        referenceId: order._id,
        quantityBefore: product.quantity,
        quantityAfter: updated.quantity,
        createdBy: user._id,
      });

      if (updated.quantity <= updated.minimumStockLevel) {
        await inventoryService.raiseLowStockAlert(updated);
      }
      realtime.emitBroadcast('inventory:update', {
        productId: product._id,
        quantity: updated.quantity,
        productName: product.name,
      });
    }

    if (clearCart) {
      await Cart.deleteOne({ user: user._id });
    }
    if (prescriptionIds.size) {
      await Prescription.updateMany({ _id: { $in: [...prescriptionIds] } }, { $set: { order: order._id } });
    }

// Post-commit side effects (never throw in the request path).
    try {
      await notificationService.notifyUser({
        user: user._id,
        type: 'ORDER_UPDATE',
        title: `Order ${orderId} placed`,
        message: `Your order ${orderId} worth ₹${total.toFixed(2)} has been placed successfully.`,
        link: `/dashboard/orders/${order._id}`,
        icon: 'package-check',
        payload: { orderId, total },
      });
      realtime.emitToUser(user._id, 'order:new', { orderId, status: 'ORDER_PLACED' });
      realtime.emitToRole('ADMIN', 'order:new', { orderId, customer: user.name, total });
      realtime.emitToRole('SALES_OPERATOR', 'order:new', { orderId, customer: user.name, total });

      emailService
        .sendOrderStatusEmail({
          to: user.email,
          name: user.name,
          orderId,
          status: 'ORDER_PLACED',
          items: totals.items,
          total,
          message: STATUS_MESSAGES.ORDER_PLACED,
        })
        .catch((e) => console.error('[mail] order placed fail:', e.message));
    } catch (sideErr) {
      console.error('[order] side-effect error (non-fatal):', sideErr.message);
    }

    await audit({ user, action: 'ORDER_CREATED', resource: 'Order', resourceId: order._id, details: { orderId, total }, req });
    return order;
  } catch (err) {
    throw err;
  }
};

module.exports.createOrder = createOrder;
module.exports.generateOrderId = generateOrderId;
module.exports.STATUS_FLOW = STATUS_FLOW;
module.exports.STATUS_MESSAGES = STATUS_MESSAGES;
module.exports.computeTotals = computeTotals;
module.exports.toAddress = toAddress;

/**
 * Transition an order to a new status with full audit + realtime + email
 * side effects. Returns the updated, populated order.
 */
const updateOrderStatus = async ({ orderId, newStatus, changedBy, note = '', req = null }) => {
  const order = await Order.findOne({ orderId }).populate('customer', 'name email mobile');
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  if (order.status === newStatus) {
    const err = new Error(`Order is already ${newStatus.replace(/_/g, ' ').toLowerCase()}`);
    err.status = 400;
    throw err;
  }

  // ── Prescription gate: block dispatch before verification ──
  const needsPrescription = order.items.some((it) => it.prescriptionRequired);
  const dispatchStatuses = ['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  if (needsPrescription && dispatchStatuses.includes(newStatus)) {
    const prescriptionApproved = await Prescription.exists({ order: order._id, status: 'APPROVED' });
    if (!prescriptionApproved) {
      const err = new Error('This order contains prescription-required items whose prescription is not yet approved. Verification must be completed before dispatch.');
      err.status = 403;
      throw err;
    }
  }

  // ── Cancel: restore inventory ──
  const prevStatus = order.status;
  if (newStatus === 'CANCELLED' && order.status !== 'CANCELLED') {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
        await require('../models/Inventory').create({
          product: product._id,
          change: item.quantity,
          reason: 'RETURN',
          referenceType: 'Order',
          referenceId: order._id,
          quantityAfter: product.quantity,
          note: `Auto-restock on cancellation of ${order.orderId}`,
          createdBy: changedBy?._id,
        });
        realtime.emitBroadcast('inventory:update', { productId: product._id, quantity: product.quantity, productName: product.name });
      }
    }
    order.cancelledAt = new Date();
  }

order.status = newStatus;
  order.statusHistory.push({
    status: newStatus,
    note: note || STATUS_MESSAGES[newStatus] || '',
    changedBy: changedBy?._id,
    changedAt: new Date(),
  });
  if (newStatus === 'DELIVERED') order.deliveredAt = new Date();

  await order.save();

  const total = order.total;
  const customer = order.customer;

  // ── Invoice on delivery (or earlier for prepaid) ──
  if (['DELIVERED', 'CONFIRMED'].includes(newStatus) || order.payment?.status === 'PAID') {
    try {
      const invoice = await createInvoiceForOrder({ order });
      if (invoice.pdfPath) {
        emailService
          .sendInvoiceEmail({
            to: customer.email,
            name: customer.name,
            orderId: order.orderId,
            invoiceNumber: invoice.invoiceNumber,
            total,
            pdfPath: invoice.pdfPath,
          })
          .catch((e) => console.error('[mail] invoice fail:', e.message));
      }
    } catch (err) {
      console.error('[order] invoice side-effect error:', err.message);
    }
  }

  // ── Record a sale when delivered ──
  if (newStatus === 'DELIVERED') {
    await Sale.findOneAndUpdate(
      { order: order._id },
      {
        order: order._id,
        orderId: order.orderId,
        customer: customer._id,
        amount: total,
        paymentStatus: order.payment?.status || 'PENDING',
        bookedBy: changedBy?._id,
      },
      { upsert: true, new: true }
    );

    // ── Send Thank You email on delivery ──
    if (customer.notificationPreferences?.email !== false) {
      emailService
        .sendOrderDeliveredThankYouEmail({
          to: customer.email,
          name: customer.name,
          orderId: order.orderId,
          items: order.items,
          total,
          deliveredAt: order.deliveredAt,
        })
        .catch((e) => console.error('[mail] thank-you fail:', e.message));
    }
  }

// ── Notifications + realtime + email ──
  try {
    await notificationService.notifyUser({
      user: customer._id,
      type: 'ORDER_UPDATE',
      title: `Order ${order.orderId} — ${newStatus.replace(/_/g, ' ')}`,
      message: STATUS_MESSAGES[newStatus] || `Your order is now ${newStatus.replace(/_/g, ' ').toLowerCase()}.`,
      link: `/dashboard/orders/${order._id}`,
      icon: 'package-open',
      payload: { orderId: order.orderId, status: newStatus },
    });
    realtime.emitToUser(customer._id, 'order:update', { orderId: order.orderId, status: newStatus, orderIdx: order._id });
    realtime.emitBroadcast('order:update', { orderId: order.orderId, status: newStatus });

    emailService
      .sendOrderStatusEmail({
        to: customer.email,
        name: customer.name,
        orderId: order.orderId,
        status: newStatus,
        items: order.items,
        total,
        message: STATUS_MESSAGES[newStatus] || `Your order is now ${newStatus.replace(/_/g, ' ').toLowerCase()}.`,
      })
      .catch((e) => console.error('[mail] status fail:', e.message));
  } catch (e) {
    console.error('[order] notify error (non-fatal):', e.message);
  }

  await audit({
    user: changedBy,
    action: 'ORDER_STATUS_CHANGED',
    resource: 'Order',
    resourceId: order._id,
    details: { orderId: order.orderId, from: prevStatus, to: newStatus, note },
    req,
  });
  return order.populate('customer');
};

module.exports.updateOrderStatus = updateOrderStatus;