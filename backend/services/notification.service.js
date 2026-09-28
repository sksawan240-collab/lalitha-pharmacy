const Notification = require('../models/Notification');
const realtime = require('./realtime.service');

/**
 * Persist a notification and push it out over Socket.IO.
 * If `targetUsers` is an array, create one per user (use sparingly).
 */
const notifyUser = async ({ user, type, title, message, link = '', icon = 'bell', payload = {} }) => {
  const notification = await Notification.create({ user, type, title, message, link, icon, payload });
  realtime.emitToUser(user, 'notification:new', notification);
  return notification;
};

/** Broadcast-style notification (announcements, system-wide alerts). */
const notifyAll = async ({ type, title, message, link = '', icon = 'bell', payload = {}, roles = null }) => {
  const notification = await Notification.create({
    user: null, // broadcast record (queryable in admin lists)
    type,
    title,
    message,
    link,
    icon,
    payload,
    isBroadcast: true,
    read: false,
  });
  if (payload.targetRole) {
    realtime.emitToRole(payload.targetRole, 'notification:new', notification);
  } else {
    realtime.emitBroadcast('notification:new', notification);
  }
  return notification;
};

/** Broadcast to all users of the given roles (admin/sales staff). */
const notifyRoles = async ({ roles, type, title, message, link = '', icon = 'bell', payload = {} }) => {
  const users = await require('../models/User')
    .find({ role: { $in: roles } })
    .select('_id');
  const notifications = users.map((u) => ({
    user: u._id,
    type,
    title,
    message,
    link,
    icon,
    payload,
  }));
  const created = notifications.length ? await Notification.insertMany(notifications) : [];
  for (const n of created) realtime.emitToUser(n.user, 'notification:new', n);
  return created;
};

const markAllRead = async (userId) =>
  Notification.updateMany({ user: userId, read: false }, { read: true });

module.exports = { notifyUser, notifyAll, notifyRoles, markAllRead };