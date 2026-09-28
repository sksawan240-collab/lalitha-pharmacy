const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/notification.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/:id/read', param('id').isMongoId(), controller.markRead);
router.post('/read-all', controller.markAllRead);
router.get('/admin/all', authorize('ADMIN'), controller.staffList);

module.exports = router;