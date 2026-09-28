const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/auth.controller');
const { validate, F } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const env = require('../config/env');

const router = express.Router();

// Strict limiter for sensitive auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

router.post(
  '/register',
  authLimiter,
  validate([
    F.name,
    F.email,
    F.mobile,
    F.password,
    body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
    body('role').optional().isIn(['SALES_MANAGER', 'SALES_OPERATOR', 'CUSTOMER']).withMessage('Invalid role selected'),
    body('address').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Address is required'),
    body('city').isString().trim().notEmpty().withMessage('City is required'),
    body('state').isString().trim().notEmpty().withMessage('State is required'),
    body('pincode').matches(/^\d{4,6}$/).withMessage('Pincode must be 4–6 digits'),
  ]),
  controller.register
);

router.post('/verify-otp', authLimiter, validate([F.email, F.otp]), controller.verifyOtp);
router.post('/resend-otp', authLimiter, validate([F.email, body('purpose').optional().isIn(['REGISTER', 'PASSWORD_RESET', 'LOGIN'])]), controller.resendOtp);
router.post('/login', authLimiter, validate([F.email, F.password]), controller.login);
router.get('/me', controller.me);
// Logout must work with OR without a live session (idempotent — page-refresh logout).
router.post('/logout', controller.logout);
// Legacy refresh endpoint removed: sessions use HTTP-only cookies, no tokens.
// Kept as a 410 alias so old clients fail loudly instead of hanging.
router.post('/refresh', (req, res) =>
  res.status(410).json({ success: false, message: 'Token refresh removed. Session auth uses cookies — please log in again.' })
);
router.post('/forgot-password', authLimiter, validate([F.email]), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate([F.email, body('token').isString().isLength({ min: 20, max: 128 }), F.password]), controller.resetPassword);

module.exports = router;