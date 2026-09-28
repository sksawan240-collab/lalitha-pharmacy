const mongoose = require('mongoose');

/** Website announcements published by admins (optionally emailed to all users). */
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160, index: true },
    content: { type: String, required: true, maxlength: 5000 },
    type: {
      type: String,
      enum: ['NEW_PRODUCTS', 'SERVICES', 'UPDATE', 'IMPORTANT', 'MAINTENANCE'],
      default: 'UPDATE',
    },
    important: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    emailedTo: { type: Number, default: 0 },
    publishedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

announcementSchema.index({ published: 1, publishedAt: -1, important: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);
module.exports = Announcement;