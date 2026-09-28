const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: 60,
      index: true,
    },
    slug: { type: String, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '', maxlength: 500 },
    icon: { type: String, default: '' }, // lucide icon name used by the UI
    isSystem: { type: Boolean, default: false }, // seeded categories cannot be deleted
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;