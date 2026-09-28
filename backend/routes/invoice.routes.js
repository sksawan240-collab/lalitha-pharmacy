const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/invoice.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/mine', controller.myInvoices);
router.get('/:id/file', param('id').isMongoId(), controller.downloadInvoice);
router.post('/:id/email', param('id').isMongoId(), controller.emailInvoice);
router.get('/admin/all', authorize('ADMIN'), controller.adminInvoices);

module.exports = router;