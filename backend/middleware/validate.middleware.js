const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/** Run validation rules; surface first error to the client. */
const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req).array();
    if (errors.length) {
      const first = errors[0];
      return next(ApiError.badRequest(first.msg, errors.map((e) => ({ field: e.path?.join?.(',') || e.path, message: e.msg }))));
    }
    next();
  },
];

/** Shared sanitised field validators. */
const F = {
  email: body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail().toLowerCase(),
  name: body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
  mobile: body('mobile').matches(/^[0-9+\-\s()]{7,16}$/).withMessage('Please provide a valid mobile number'),
  password: body('password').isString().isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters'),
  otp: body('code').isString().isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits').matches(/^\d{6}$/),
  productId: (name = 'productId') =>
    body(name).isMongoId().withMessage('Invalid product reference'),
};

module.exports = { validate, F };