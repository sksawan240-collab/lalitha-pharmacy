const mongoose = require('mongoose');

/**
 * A customer's cart. Items reference products; quantities are re-validated
 * against live inventory on every cart read and again at order creation.
 */
const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        quantity: { type: Number, required: true, min: 1, max: 99 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;