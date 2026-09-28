const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

/**
 * Dashboard analytics. Every number is computed from MongoDB — when no data
 * exists these helpers return empty/zero structures and the frontend shows
 * professional empty states instead. No hard-coded statistics anywhere.
 */

const countLowStock = async () => {
  const rows = await Product.aggregate([
    { $match: { active: true, $expr: { $lte: ['$quantity', '$minimumStockLevel'] } } },
    { $count: 'n' },
  ]);
  return rows.length ? rows[0].n : 0;
};

/** Admin landing overview: KPI cards. */
const ADMIN_OVERVIEW = async () => {
  const [totalOrders, totalCustomers, totalProducts, totalSales, sumSales, pendingOrders, completedOrders, lowStock, expiring] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: 'CUSTOMER' }),
    Product.countDocuments(),
    Sale.countDocuments(),
    Sale.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Order.countDocuments({ status: { $in: ['ORDER_PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'] } }),
    Order.countDocuments({ status: 'DELIVERED' }),
    countLowStock(),
    Product.countDocuments({ active: true, expiryDate: { $ne: null, $lte: new Date(Date.now() + 30 * 86400000) } }),
  ]);

  return {
    totalOrders,
    totalCustomers,
    totalProducts,
    totalSales,
    revenue: sumSales.length ? Math.round(sumSales[0].total * 100) / 100 : 0,
    pendingOrders,
    completedOrders,
    lowStock,
    expiring,
  };
};

/** Orders grouped by status — stacked bars / stat cards. */
const orderStatusBreakdown = async () => {
  const rows = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const statuses = ['ORDER_PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
  const map = new Map(rows.map((r) => [r._id, r.count]));
  return statuses.map((s) => ({ status: s, count: map.get(s) || 0 }));
};

/** Monthly sales trend (last N months) from actual sales records. */
const salesTrend = async (months = 12) => {
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - (months - 1));
  const rows = await Sale.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);
  return rows.map((r) => ({ month: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`, orders: r.count, revenue: Math.round(r.amount * 100) / 100 }));
};

/** Top selling products by delivered order quantity. */
const topProducts = async (limit = 6) => {
  const rows = await Order.aggregate([
    { $match: { status: { $in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'CONFIRMED'] } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.subtotal' } } },
    { $sort: { quantity: -1 } },
    { $limit: limit },
  ]);
  return rows;
};

/** Daily order counts + totals over the last N days. */
const ordersDaily = async (days = 14) => {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        amount: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, orders: r.count, amount: Math.round(r.amount * 100) / 100 }));
};

/** New customers per month (last N months). */
const customerGrowth = async (months = 12) => {
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - (months - 1));
  const rows = await User.aggregate([
    { $match: { role: 'CUSTOMER', createdAt: { $gte: start } } },
    { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);
  return rows.map((r) => ({ month: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`, customers: r.count }));
};

/** Sales operator view — orders processed and revenue handled. */
const salesOperatorOverview = async (userId) => {
  const delivered = await Order.countDocuments({ status: 'DELIVERED' });
  const pending = await Order.countDocuments({ status: { $in: ['ORDER_PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED'] } });
  const handledAmount = await Sale.aggregate([
    { $match: { bookedBy: userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const lowStock = await countLowStock();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
  return {
    delivered,
    pending,
    todayOrders,
    lowStock,
    handledAmount: handledAmount.length ? Math.round(handledAmount[0].total * 100) / 100 : 0,
  };
};

module.exports = {
  ADMIN_OVERVIEW,
  orderStatusBreakdown,
  salesTrend,
  topProducts,
  ordersDaily,
  customerGrowth,
  salesOperatorOverview,
  countLowStock,
};