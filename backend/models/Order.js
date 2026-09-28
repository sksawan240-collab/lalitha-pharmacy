const mongoose = require('mongoose');

/** A single product line inside an order (embedded document). */
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    genericName: { type: String, default: '' },
    brandName: { type: String, default: '' },
    category: { type: String, default: '' },
    unit: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }, // unit distributor price
    gstPercent: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true, min: 0 }, // price*qty - discount
    prescriptionRequired: { type: Boolean, default: false },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  },
  { _id: false }
);

/** Snapshot of the address at the time the order was placed. */
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true }, // LP-2026-XXXXXXXX
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true, default: [] },

    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    gst: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema, required: true },

    payment: {
      method: { type: String, enum: ['CASH_ON_DELIVERY', 'ONLINE', 'BANK_TRANSFER'], default: 'CASH_ON_DELIVERY' },
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'UNPAID'],
        default: 'PENDING',
      },
      transactionId: { type: String, default: '' },
      paymentReference: { type: String, default: '' },
      paidAt: { type: Date },
    },

    status: {
      type: String,
      enum: [
        'ORDER_PLACED',
        'CONFIRMED',
        'PROCESSING',
        'PACKED',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'RETURNED',
      ],
      default: 'ORDER_PLACED',
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, default: '' },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
      },
    ],

    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    isCODConfirmed: { type: Boolean, default: false },
    deliveryNotes: { type: String, default: '' },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for sales-operator created orders
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;