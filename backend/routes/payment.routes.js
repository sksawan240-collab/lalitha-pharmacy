const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/verify', body('razorpayOrderId').isString().notEmpty(), body('razorpayPaymentId').isString().notEmpty(), body('razorpaySignature').isString().notEmpty(), body('orderId').isString().notEmpty(), controller.verifyPayment);

const staffRouter = express.Router();
staffRouter.use(authenticate);
staffRouter.post('/cod-confirm', body('orderId').isString().notEmpty(), controller.confirmCod);

module.exports = router;