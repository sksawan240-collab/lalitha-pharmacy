const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/announcement.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// Public route - list published announcements
router.get('/', controller.listPublished);

// Admin management (drafts, publishing, email).
router.use(authenticate, authorize('ADMIN'));
router.get('/admin/all', controller.listAll);
router.post('/admin', validate([body('title').isString().trim().isLength({ min: 3, max: 160 }), body('content').isString().trim().isLength({ min: 10, max: 5000 })]), controller.create);
router.patch('/admin/:id', param('id').isMongoId(), controller.update);
router.patch('/admin/:id/publish', param('id').isMongoId(), controller.publish);
router.delete('/admin/:id', param('id').isMongoId(), controller.remove);

module.exports = router;