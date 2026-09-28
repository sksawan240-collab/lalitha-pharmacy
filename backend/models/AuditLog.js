const mongoose = require('mongoose');

/** Immutable audit trail of important system actions. */
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String, default: '' },
    action: { type: String, required: true, index: true }, // LOGIN, PRODUCT_CREATED, ORDER_STATUS_CHANGED…
    resource: { type: String, default: '' },             // e.g. 'Product'
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;