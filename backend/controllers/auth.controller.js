const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const otpService = require('../services/otp.service');
const emailService = require('../services/email.service');
const audit = require('../services/audit.service');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');

const SESSION_COOKIE_NAME = () => env.session.name;

/**
 * Create the server-side login session. Only user id + role are stored.
 * The session cookie itself is HTTP-only and managed by express-session.
 * Regenerate on login to prevent session fixation.
 */
const createLoginSession = (req, user) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user._id.toString();
      req.session.role = user.role;
      req.session.loginAt = new Date().toISOString();
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });

const destroySession = (req, res) =>
  new Promise((resolve) => {
    const clear = () => {
      res.clearCookie(SESSION_COOKIE_NAME(), {
        httpOnly: true,
        secure: env.isProd,
        sameSite: env.isProd ? 'none' : 'lax',
        path: '/',
      });
      resolve();
    };
    if (!req.session) return clear();
    req.session.destroy(() => clear());
  });

const publicUser = (user) => {
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.passwordResetTokenHash;
  delete obj.passwordResetExpiresAt;
  delete obj.__v;
  return obj;
};

/** POST /api/auth/register — save user (unverified), send OTP email. */
const register = asyncHandler(async (req, res) => {
  const { name, email, mobile, password, address, city, state, pincode, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing && existing.isVerified) {
    throw ApiError.conflict('An account with this email already exists');
  }

  if (existing) {
    // Unverified account retrying registration: refresh their details and
    // send a brand-new OTP instead of dead-ending on a duplicate error.
    // Stale REGISTER OTPs are consumed first so a full re-submission always
    // produces a fresh code (bypassing the resend cooldown deliberately —
    // the auth rate-limiter still guards against abuse).
    existing.name = name;
    existing.mobile = mobile;
    existing.password = password;
    existing.addresses = [
      { label: 'Home', addressLine1: address, addressLine2: '', city, state, pincode, isDefault: true },
    ];
    await existing.save();

    await OTP.updateMany(
      { email: existing.email, purpose: 'REGISTER', consumed: false },
      { $set: { consumed: true } }
    );
    await otpService.createOtp({ email: existing.email, purpose: 'REGISTER' });
    await audit({ user: existing, action: 'REGISTER_RETRY', resource: 'User', resourceId: existing._id, details: { email }, req });

    return ok(res, {
      status: 201,
      message: 'You already have an unverified account — we sent a fresh OTP to your email to activate it.',
      data: { email: existing.email, requireOtp: true },
    });
  }

  const user = await User.create({
    name,
    email,
    mobile,
    password,
    role: role === 'SALES_MANAGER' ? 'SALES_MANAGER' : role === 'SALES_OPERATOR' ? 'SALES_OPERATOR' : 'CUSTOMER',
    isVerified: false,
    addresses: [
      { label: 'Home', addressLine1: address, addressLine2: '', city, state, pincode, isDefault: true },
    ],
  });

  await otpService.createOtp({ email: user.email, purpose: 'REGISTER' });
  await audit({ user, action: 'REGISTER', resource: 'User', resourceId: user._id, details: { email }, req });

  ok(res, {
    status: 201,
    message: 'Registration successful. We sent a 6-digit OTP to your email to activate your account.',
    data: { email: user.email, requireOtp: true },
  });
});

/** POST /api/auth/verify-otp — activate account. NEVER auto-login (spec). */
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const result = await otpService.verifyOtp({ email, code, purpose: 'REGISTER' });

  const user = await User.findOneAndUpdate({ email: result.email }, { isVerified: true }, { new: true });
  if (!user) throw ApiError.notFound('Account not found');

  await emailService.sendWelcomeEmail(user.email, user.name).catch(() => {});
  await audit({ user, action: 'ACCOUNT_VERIFIED', resource: 'User', resourceId: user._id, req });

  ok(res, {
    message: 'Account verified successfully. Please log in.',
    data: { user: publicUser(user), email: user.email },
  });
});

/** POST /api/auth/resend-otp */
const resendOtp = asyncHandler(async (req, res) => {
  const { email, purpose = 'REGISTER' } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (purpose === 'REGISTER' && !user) throw ApiError.notFound('No account found for this email');
  if (purpose === 'REGISTER' && user.isVerified) throw ApiError.badRequest('Account already verified — please log in');

  await otpService.createOtp({ email, purpose });
  ok(res, { message: 'A new OTP has been sent to your email.' });
});

/** POST /api/auth/login — verify credentials, create server-side session, set HTTP-only cookie. */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  if (user.status === 'SUSPENDED') throw ApiError.forbidden('This account has been suspended. Contact support.');

  const valid = await user.comparePassword(password);
  if (!valid) {
    await audit({ user, action: 'LOGIN_FAILED', resource: 'User', resourceId: user._id, status: 'FAILED', req });
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isVerified) {
    throw ApiError.badRequest('Please verify your email before logging in. Check your inbox for the OTP.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  await createLoginSession(req, user);
  const fresh = await User.findById(user._id);
  await audit({ user: fresh, action: 'LOGIN', resource: 'User', resourceId: user._id, req });

  ok(res, { message: `Welcome back, ${user.name}!`, data: { user: publicUser(fresh) } });
});

/** GET /api/auth/me — current session user (role comes from the server session). */
const me = asyncHandler(async (req, res) => {
  if (!req.session || !req.session.userId) throw ApiError.unauthorized('Please log in to continue');
  const user = await User.findById(req.session.userId);
  if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized('Please log in to continue');
  ok(res, { message: 'Session active', data: { user: publicUser(user) } });
});

/** POST /api/auth/logout — destroy server session + clear cookie. Idempotent. */
const logout = asyncHandler(async (req, res) => {
  const sessionUserId = req.session?.userId;
  let sessionUser = null;
  if (sessionUserId) {
    sessionUser = await User.findById(sessionUserId).catch(() => null);
  }
  await destroySession(req, res);
  await audit({
    user: sessionUser || req.user,
    action: 'LOGOUT',
    resource: 'User',
    resourceId: sessionUser?._id || req.user?._id,
    req,
  });
  ok(res, { message: 'Logged out successfully.' });
});

/** POST /api/auth/forgot-password — issue reset link email. */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't reveal whether the email exists — same response either way.
    return ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
  }

  const token = user.setPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetLink = `${env.frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  await emailService.sendPasswordResetEmail(user.email, user.name, resetLink).catch(() => {});
  await audit({ user, action: 'PASSWORD_RESET_REQUESTED', resource: 'User', resourceId: user._id, req });
  ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
});

/** POST /api/auth/reset-password */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, password } = req.body;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase(),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash');
  if (!user || !user.passwordResetTokenHash || user.passwordResetTokenHash !== hash) {
    throw ApiError.badRequest('Reset link is invalid or has expired. Please request a new one.');
  }

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.passwordChangedAt = new Date();
  await user.save();

  await audit({ user, action: 'PASSWORD_RESET_COMPLETED', resource: 'User', resourceId: user._id, req });
  // Sessions are server-side; force re-login by clearing THIS session cookie too.
  if (req.session) {
    await new Promise((resolve) => req.session.destroy(() => resolve()));
  }
  res.clearCookie(SESSION_COOKIE_NAME(), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
  });
  ok(res, { message: 'Password updated successfully. Please log in with your new password.' });
});

module.exports = { register, verifyOtp, resendOtp, login, me, logout, forgotPassword, resetPassword };