const mongoose = require('mongoose');

/** One invoice per order (1:1). The PDF file path/URL links to the generated file. */
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true }, // LP-INV-2026-XXXXXX
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pdfPath: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    totalAmount: { type: Number, required: true, min: 0 },
    gst: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'PENDING' },
    notes: { type: String, default: '' },
    emailedAt: { type: Date },
  },
  { timestamps: true }
);

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;