const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();
router.use(authenticate);

router.post(
  '/',
  validate([
    body('paymentMethod').optional().isIn(['CASH_ON_DELIVERY', 'ONLINE', 'BANK_TRANSFER']).withMessage('Invalid payment method'),
    body('addressId').optional().isMongoId().withMessage('Invalid address'),
    body('address.addressLine1').optional().isString().trim().isLength({ min: 3, max: 200 }),
    body('address.city').optional().isString().trim().notEmpty(),
    body('address.state').optional().isString().trim().notEmpty(),
    body('address.pincode').optional().matches(/^\d{4,6}$/),
  ]),
  controller.placeOrder
);

router.get('/mine', controller.myOrders);
router.get('/:id', param('id').isMongoId(), controller.getOrder);
router.post('/:id/cancel', param('id').isMongoId(), body('reason').optional().isString().trim().isLength({ max: 300 }), controller.cancelOrder);
router.get('/:id/track', param('id').isMongoId(), controller.trackOrder);

module.exports = router;