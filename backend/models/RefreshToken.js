const mongoose = require('mongoose');

/**
 * LEGACY — refresh tokens are REMOVED. Session auth stores server-side
 * sessions in the `sessions` collection via connect-mongo. This model is kept
 * only so old `RefreshToken.deleteMany` cleanup calls keep working.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    replacedBy: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;