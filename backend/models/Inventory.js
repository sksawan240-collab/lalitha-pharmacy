const mongoose = require('mongoose');

/**
 * Inventory movement ledger. Physical stock is owned by the Product
 * document; this collection records every stock change for audit/traceability.
 */
const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    change: { type: Number, required: true }, // + restock, - order/sale/adjustment
    reason: {
      type: String,
      enum: ['ORDER', 'RESTOCK', 'ADJUSTMENT', 'RETURN', 'DAMAGED', 'EXPIRED', 'SALE'],
      required: true,
      index: true,
    },
    referenceType: { type: String, default: '' }, // e.g. 'Order', 'Product'
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    note: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

inventorySchema.index({ product: 1, createdAt: -1 });
inventorySchema.index({ reason: 1, createdAt: -1 });
inventorySchema.index({ createdAt: -1 });

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;