const mongoose = require('mongoose');

/**
 * One-time passwords for registration/verification.
 * Stored as a SHA-256 hash, with short TTL, attempt limits and expiry.
 */
const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      enum: ['REGISTER', 'LOGIN', 'PASSWORD_RESET', 'CHANGE_EMAIL'],
      default: 'REGISTER',
      index: true,
    },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    consumed: { type: Boolean, default: false, index: true },
    // For RESEND cooldown + rate limiting tracking.
    lastSentAt: { type: Date, default: Date.now },
    resendCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, purpose: 1, consumed: 1 });
// Auto-delete expired OTPs from the collection.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);
module.exports = OTP;