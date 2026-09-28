const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const notificationService = require('../services/notification.service');

/** GET /api/notifications — paginated history. */
const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
  const query = { user: req.user._id };

  const total = await Notification.countDocuments(query);
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  ok(res, { data: { notifications, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

/** GET /api/notifications/unread-count */
const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  ok(res, { data: { count } });
});

/** PATCH /api/notifications/:id/read */
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) return ok(res, { message: 'Notification read' });
  ok(res, { message: 'Notification marked as read', data: { notification } });
});

/** POST /api/notifications/read-all */
const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);
  ok(res, { message: 'All notifications marked as read' });
});

/** GET /api/admin/notifications — staff broadcast + their notifications. */
const staffList = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
  const query = { $or: [{ user: req.user._id }, { isBroadcast: true }] };
  const total = await Notification.countDocuments(query);
  const notifications = await Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  ok(res, { data: { notifications, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

module.exports = { list, unreadCount, markRead, markAllRead, staffList };