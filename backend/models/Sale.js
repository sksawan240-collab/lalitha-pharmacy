const mongoose = require('mongoose');

/**
 * Sales records aggregated for the sales-operator dashboard.
 * Every delivered/paid order produces a sale record.
 */
const saleSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;