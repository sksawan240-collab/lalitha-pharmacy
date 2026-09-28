const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Notification = require('../models/Notification');
const realtime = require('./realtime.service');
const emailService = require('./email.service');

/**
 * Record a stock movement in the ledger and persist the new quantity on the
 * product. Optionally triggers low-stock detection. Returns { product, lowStock }.
 */
const changeStock = async ({ product, change, reason, referenceType = '', referenceId = null, note = '', createdBy = null }) => {
  if (change === 0) return { product, lowStock: false };

  const quantityBefore = product.quantity;
  const quantityAfter = Math.max(0, quantityBefore + change);
  product.quantity = quantityAfter;
  if (reason === 'ORDER') {
    // Expired or deactivated products can still be decremented by returns etc.
  }
  await product.save();

  await Inventory.create({
    product: product._id,
    change,
    reason,
    referenceType,
    referenceId,
    quantityBefore,
    quantityAfter,
    note,
    createdBy,
  });

  realtime.emitBroadcast('inventory:update', {
    productId: product._id,
    quantity: quantityAfter,
    productName: product.name,
  });

  const lowStock = product.quantity <= product.minimumStockLevel;
  if (lowStock) await raiseLowStockAlert(product);

  return { product, lowStock };
};

/** Create a low-stock notification + email for admins/sales operators. */
const raiseLowStockAlert = async (product) => {
  const alert = { product: product._id, name: product.name, quantity: product.quantity, minimumStockLevel: product.minimumStockLevel };
  const staff = await require('../models/User').find({ role: { $in: ['ADMIN', 'SALES_OPERATOR'] }, status: 'ACTIVE' }).select('_id email');

  const notifications = staff.map((u) => ({
    user: u._id,
    type: 'LOW_STOCK',
    title: 'Low Stock Alert',
    message: `Low Stock Alert: ${product.name} has only ${product.quantity} units remaining.`,
    link: `/dashboard/inventory`,
    icon: 'package-minus',
    payload: alert,
  }));
  if (notifications.length) {
    await Notification.insertMany(notifications);
    for (const u of staff) {
      realtime.emitToUser(u._id, 'low-stock:alert', alert);
    }
  }
  realtime.emitToRole('ADMIN', 'low-stock:alert', alert);
  realtime.emitToRole('SALES_OPERATOR', 'low-stock:alert', alert);

  for (const u of staff) {
    if (u.email) emailService.sendLowStockEmail(u.email, alert).catch((e) => console.error('[low-stock] email fail:', e.message));
  }
  return alert;
};

/**
 * Expiry monitoring. Returns products that expire within `days` (default 30)
 * or are already expired. Also raises alerts for products newly crossing
 * the threshold since their last scan.
 */
const getExpiryList = async ({ activeOnly = true, days = 30, page = 1, limit = 50 } = {}) => {
  const query = { expiryDate: { $ne: null } };
  if (activeOnly) query.active = true;

  const now = new Date();
  const horizon = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  query.expiryDate = { $lte: horizon };

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name')
    .sort({ expiryDate: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const enriched = products.map((p) => ({
    ...p.toObject(),
    expiryState: p.expiryDate < now ? 'EXPIRED' : 'EXPIRING_SOON',
    daysUntilExpiry: Math.ceil((p.expiryDate.getTime() - Date.now()) / 86400000),
  }));
  return { total, products: enriched };
};

/** Blocked-from-sale helper: true when product has expired or is inactive. */
const isNonSellable = (product) =>
  !product.active || (product.expiryDate && product.expiryDate < new Date());

/** Scan and raise expiry alerts to staff (run on schedule or after edits). */
const runExpiryScan = async ({ days = 30 } = {}) => {
  const { products } = await getExpiryList({ days, limit: 200 });
  if (!products.length) return { raised: 0 };

  const staff = await require('../models/User').find({ role: { $in: ['ADMIN', 'SALES_OPERATOR'] }, status: 'ACTIVE' }).select('_id email');
  const notifications = [];
  for (const u of staff) {
    notifications.push({
      user: u._id,
      type: 'EXPIRY_ALERT',
      title: 'Expiry Alert',
      message: `${products.length} product(s) expire within ${days} days. Review Expiry Management.`,
      link: '/dashboard/expiry',
      icon: 'calendar-x',
      payload: { days, count: products.length },
    });
  }
  if (notifications.length) {
    await Notification.insertMany(notifications);
    for (const u of staff) realtime.emitToUser(u._id, 'expiry:alert', { days, count: products.length });
  }
  return { raised: notifications.length, count: products.length };
};

module.exports = { changeStock, raiseLowStockAlert, getExpiryList, isNonSellable, runExpiryScan };