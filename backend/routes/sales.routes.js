const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/sales.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate, authorize('ADMIN', 'SALES_OPERATOR', 'SALES_MANAGER'));

router.get('/overview', controller.overview);
router.get('/orders', controller.orders);
router.get('/orders/:id', param('id').isMongoId(), controller.orderDetail);
router.patch('/orders/:id/status', param('id').isMongoId(), controller.changeStatus);
router.get('/inventory', controller.inventory);
router.get('/customers', controller.customers);
router.get('/low-stock', controller.lowStock);
router.get('/sales', controller.salesRecords);

module.exports = router;