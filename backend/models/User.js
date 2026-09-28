const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/** Stored securely as a bcrypt hash — plain passwords never persist. */
const passwordSchema = {
  type: String,
  required: [true, 'Password is required'],
  minlength: [8, 'Password must be at least 8 characters'],
  maxlength: 72,
  select: false,
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name is too short'],
      maxlength: 80,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
      index: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      match: [/^[0-9+\-\s()]{7,16}$/, 'Please provide a valid mobile number'],
      index: true,
    },
    password: passwordSchema,
    role: {
      type: String,
      enum: ['ADMIN', 'SALES_OPERATOR', 'SALES_MANAGER', 'CUSTOMER'],
      default: 'CUSTOMER',
      index: true,
    },
    isVerified: { type: Boolean, default: false },
    // Admin-created sales operators are pre-verified; customers must verify via OTP.
    mustChangePassword: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
      default: 'ACTIVE',
      index: true,
    },
    addresses: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        label: { type: String, default: 'Home', trim: true },
        addressLine1: { type: String, required: true, trim: true },
        addressLine2: { type: String, trim: true, default: '' },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: {
          type: String,
          required: true,
          match: [/^\d{4,6}$/, 'Please provide a valid pincode'],
        },
        isDefault: { type: Boolean, default: false },
      },
    ],
    profileImage: { type: String, default: '' },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });

/* ── Password helpers ─────────────────────────────────────── */

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  // Exceeds bcrypt 72-byte limit? Validation with maxlength:72 guards this.
  this.password = await bcrypt.hash(this.password, 12);
  if (this.isNew) this.passwordChangedAt = undefined;
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.passwordChangedAfter = function passwordChangedAfter() {
  // Session auth: sessions are validated against the live DB user on every
  // request (status/role), so no JWT iat comparison is needed. Kept as a
  // no-op for backwards compatibility.
  return false;
};

userSchema.methods.setPasswordResetToken = function setPasswordResetToken() {
  // Returns a plain random token; stores only its SHA-256 hash in the DB.
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  return token;
};

const User = mongoose.model('User', userSchema);
module.exports = User;