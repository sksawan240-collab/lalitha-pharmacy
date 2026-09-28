const mongoose = require('mongoose');

/** In-app notifications that also power real-time Socket.IO delivery. */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // null target means "broadcast" — every user sees it (e.g. announcements).
    type: {
      type: String,
      enum: [
        'ORDER_UPDATE',
        'PAYMENT_UPDATE',
        'NEW_PRODUCT',
        'LOW_STOCK',
        'EXPIRY_ALERT',
        'ANNOUNCEMENT',
        'SYSTEM',
      ],
      default: 'SYSTEM',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, default: '' },
    icon: { type: String, default: 'bell' },
    read: { type: Boolean, default: false, index: true },
    isBroadcast: { type: Boolean, default: false },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;