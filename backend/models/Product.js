const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 120, index: true },
    genericName: { type: String, trim: true, default: '', index: true },
    brandName: { type: String, trim: true, default: '', index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'], index: true },
    description: { type: String, default: '', maxlength: 3000 },
    manufacturer: { type: String, trim: true, default: '' },
    batchNumber: { type: String, trim: true, default: '', index: true },

    mfgDate: { type: Date },
    expiryDate: { type: Date, index: true },

    mrp: { type: Number, required: [true, 'MRP is required'], min: [0, 'MRP cannot be negative'] },
    distributorPrice: { type: Number, required: [true, 'Distributor price is required'], min: [0, 'Price cannot be negative'] },
    gst: { type: Number, min: 0, max: 100, default: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },

    quantity: { type: Number, required: [true, 'Available quantity is required'], min: 0, default: 0 },
    minimumStockLevel: { type: Number, min: 0, default: 5 },
    unit: { type: String, default: 'Strip', trim: true }, // Strip / Bottle / Box / Pack / Device / etc.

    image: { type: String, default: '', trim: true },
    prescriptionRequired: { type: Boolean, default: false },
    active: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Compound text index powering the product search API.
productSchema.index({
  name: 'text',
  genericName: 'text',
  brandName: 'text',
  manufacturer: 'text',
  description: 'text',
});
productSchema.index({ category: 1, active: 1 });
productSchema.index({ expiryDate: 1, active: 1 });
productSchema.index({ quantity: 1 });
productSchema.index({ active: 1, createdAt: -1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;