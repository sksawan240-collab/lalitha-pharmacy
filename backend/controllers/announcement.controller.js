const Announcement = require('../models/Announcement');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const audit = require('../services/audit.service');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const realtime = require('../services/realtime.service');

/** GET /api/announcements — published announcements (public storefront). */
const listPublished = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({ published: true })
    .sort({ publishedAt: -1 })
    .limit(10);
  ok(res, { data: { announcements } });
});

/** GET /api/admin/announcements — all (admin). */
const listAll = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(100);
  ok(res, { data: { announcements } });
});

/** POST /api/admin/announcements */
const create = asyncHandler(async (req, res) => {
  const { title, content, type = 'UPDATE', important = false } = req.body;
  if (!title || !content) throw ApiError.badRequest('Title and content are required');

  const announcement = await Announcement.create({
    title,
    content,
    type,
    important: Boolean(important),
    published: false,
    createdBy: req.user._id,
  });
  await audit({ user: req.user, action: 'ANNOUNCEMENT_CREATED', resource: 'Announcement', resourceId: announcement._id, details: { title }, req });
  ok(res, { status: 201, message: 'Announcement draft created', data: { announcement } });
});

/**
 * PATCH /api/admin/announcements/:id/publish — publish + email ALL verified users
 * + broadcast real-time + create in-app notifications.
 */
const publish = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');

  if (!announcement.published) {
    announcement.published = true;
    announcement.publishedAt = new Date();
    await announcement.save();
  }

  const users = await User.find({ isVerified: true, status: 'ACTIVE', 'notificationPreferences.email': { $ne: false } });
  const emails = announcement.important
    ? users.map((u) => u.email)
    : users.filter((u) => u.notificationPreferences?.promotions).map((u) => u.email);

  let emailed = 0;
  for (const to of emails) {
    try {
      await emailService.sendAnnouncementEmail(to, { title: announcement.title, content: announcement.content, important: announcement.important });
      emailed += 1;
    } catch (e) {
      console.error('[announcement] email fail:', e.message);
    }
  }
  announcement.emailedTo = emailed;
  await announcement.save();

  // In-app notifications + realtime broadcast.
  const payload = { title: announcement.title, content: announcement.content.slice(0, 280), important: announcement.important };
  await notificationService.notifyAll({
    type: 'ANNOUNCEMENT',
    title: announcement.title,
    message: announcement.content.slice(0, 280),
    link: '/announcements',
    icon: 'megaphone',
    payload,
  });
  realtime.emitBroadcast('announcement:new', announcement);

  await audit({ user: req.user, action: 'ANNOUNCEMENT_PUBLISHED', resource: 'Announcement', resourceId: announcement._id, details: { title, emailed }, req });
  ok(res, { message: `Announcement published${emailed ? ` and emailed to ${emailed} user(s)` : ''}`, data: { announcement, emailed } });
});

/** PATCH /api/admin/announcements/:id — edit draft. */
const update = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');
  if (announcement.published) throw ApiError.badRequest('Published announcements cannot be edited');

  if (req.body.title) announcement.title = req.body.title;
  if (req.body.content !== undefined) announcement.content = req.body.content;
  if (req.body.type !== undefined) announcement.type = req.body.type;
  if (req.body.important !== undefined) announcement.important = Boolean(req.body.important);
  await announcement.save();
  ok(res, { message: 'Announcement updated', data: { announcement } });
});

/** DELETE /api/admin/announcements/:id */
const remove = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('Announcement not found');
  await announcement.deleteOne();
  await audit({ user: req.user, action: 'ANNOUNCEMENT_DELETED', resource: 'Announcement', resourceId: announcement._id, req });
  ok(res, { message: 'Announcement deleted' });
});

module.exports = { listPublished, listAll, create, publish, update, remove };