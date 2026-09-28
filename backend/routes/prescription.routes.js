const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/prescription.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadPrescription } = require('../middleware/upload.middleware');

const router = express.Router();
router.use(authenticate);

router.post('/', uploadPrescription('prescription', 'prescriptions'), controller.uploadPrescription);
router.get('/mine', controller.myPrescriptions);

// Staff-only views/reviews.
router.get('/admin', authorize('ADMIN', 'SALES_OPERATOR'), controller.listPrescriptions);
router.patch('/admin/:id/review', authorize('ADMIN', 'SALES_OPERATOR'), param('id').isMongoId(), body('status').isIn(['APPROVED', 'REJECTED']), body('note').optional().isString().trim().isLength({ max: 300 }), controller.reviewPrescription);

module.exports = router;