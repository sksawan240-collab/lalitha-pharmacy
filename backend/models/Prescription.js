const mongoose = require('mongoose');

/**
 * Prescription uploads required for prescription-only products.
 * Dispatch is blocked until status is APPROVED.
 */
const prescriptionSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    filePath: { type: String, required: true },
    fileUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

prescriptionSchema.index({ customer: 1, status: 1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);
module.exports = Prescription;