const express = require('express');
const { body, param } = require('express-validator');
const adminProduct = require('../controllers/adminProduct.controller');
const category = require('../controllers/category.controller');
const admin = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadImage } = require('../middleware/upload.middleware');

const router = express.Router();
router.use(authenticate, authorize('ADMIN'));

// ── Products (ADMIN ONLY — spec: customers and sales operators cannot create) ──
router.get('/products', adminProduct.adminListProducts);
router.post('/products', uploadImage('image', 'products'), adminProduct.createProduct);
router.patch('/products/:id', param('id').isMongoId(), uploadImage('image', 'products'), adminProduct.updateProduct);
router.delete('/products/:id', param('id').isMongoId(), adminProduct.deleteProduct);
router.patch('/products/:id/stock', param('id').isMongoId(), body('change').isNumeric().withMessage('Stock change must be a number'), adminProduct.adjustStock);

// ── Categories (ADMIN ONLY) ──
router.get('/categories', category.adminList);
router.post('/categories', category.createCategory);
router.patch('/categories/:id', param('id').isMongoId(), category.updateCategory);
router.delete('/categories/:id', param('id').isMongoId(), category.deleteCategory);

// ── Dashboard + analytics ──
router.get('/overview', admin.overview);
router.get('/analytics', admin.analytics);
router.get('/reports', admin.reports);

// ── Orders (ADMIN — view + update status) ──
router.get('/orders', admin.listOrders);
router.get('/orders/:id', param('id').isMongoId(), admin.orderDetail);
router.patch('/orders/:id/status', param('id').isMongoId(), body('status').isIn(['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED']), body('note').optional().isString().trim().isLength({ max: 300 }), admin.changeOrderStatus);

// ── Users & staff ──
router.get('/users', admin.listUsers);
router.post('/users', admin.createStaff);
router.patch('/users/:id', param('id').isMongoId(), admin.updateUser);

// ── Inventory / alerts ──
router.get('/low-stock', admin.lowStock);
router.get('/expiry', admin.expiryList);
router.post('/expiry/scan', admin.runExpiryScan);

// ── Audit ──
router.get('/audit-logs', admin.auditLogs);

module.exports = router;