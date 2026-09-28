const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/product.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public storefront endpoints.
router.get('/', optionalAuth, controller.listProducts);
router.get('/featured', controller.featuredProducts);
router.get('/suggestions', controller.suggestions);
router.get('/:id', param('id').isMongoId().withMessage('Invalid product id'), controller.getProduct);

module.exports = router;