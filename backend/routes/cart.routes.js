const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, F } = require('../middleware/validate.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getCart);
router.post('/items', validate([F.productId('productId'), body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99')]), controller.addItem);
router.patch('/items/:productId', param('productId').isMongoId(), validate([]), controller.updateQuantity);
router.delete('/items/:productId', param('productId').isMongoId(), controller.removeItem);
router.delete('/', controller.clearCart);

module.exports = router;