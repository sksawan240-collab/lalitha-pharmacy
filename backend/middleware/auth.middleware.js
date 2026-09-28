/**
 * SESSION AUTHENTICATION (no JWT anywhere).
 *
 * A server-side session (express-session + MongoDB store) holds only:
 *   req.session.userId  — MongoDB ObjectId string
 *   req.session.role    — ADMIN | SALES_OPERATOR | CUSTOMER
 *   req.session.loginAt — ISO timestamp of login
 *
 * The browser only receives a secure HTTP-only session cookie.
 * Reload/refresh logout is enforced by the frontend calling
 * POST /api/auth/logout which destroys this session.
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const loadSessionUser = async (req) => {
  if (!req.session || !req.session.userId) return null;
  const user = await User.findById(req.session.userId).select('-__v');
  if (!user) return null;
  if (user.status !== 'ACTIVE') return null;
  // Role changes take effect immediately — trust DB, not the session copy.
  req.session.role = user.role;
  return user;
};

/** Require a valid server-side session. */
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      throw ApiError.unauthorized('Please log in to continue');
    }
    const user = await loadSessionUser(req);
    if (!user) throw ApiError.unauthorized('Please log in to continue');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/** Optional session: attaches req.user when logged in, else continues anonymously. */
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await loadSessionUser(req);
      if (user) req.user = user;
    }
  } catch {
    /* anonymous caller */
  }
  next();
};

/** Role guard — used AFTER requireAuth. */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};

/** Require ADMIN role (session-backed). */
const requireAdmin = [requireAuth, authorize('ADMIN')];

/** Require SALES_OPERATOR role (session-backed). */
const requireSalesOperator = [requireAuth, authorize('SALES_OPERATOR')];

/** Require CUSTOMER role (session-backed). */
const requireCustomer = [requireAuth, authorize('CUSTOMER')];

const SELF_OR = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (roles.includes(req.user.role)) return next();
  if (req.params.id && req.user._id.toString() === req.params.id) return next();
  return next(ApiError.forbidden('You do not have permission to perform this action'));
};

// Backwards-compatible aliases (all session-backed, no JWT).
const authenticate = requireAuth;

module.exports = {
  requireAuth,
  requireAdmin,
  requireSalesOperator,
  requireCustomer,
  authenticate,
  optionalAuth,
  authorize,
  SELF_OR,
};