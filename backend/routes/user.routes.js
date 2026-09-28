const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, F } = require('../middleware/validate.middleware');
const { uploadAvatar } = require('../middleware/upload.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/me', controller.me);
router.patch('/me', validate([body('name').optional().isString().trim().isLength({ min: 2, max: 80 }), body('mobile').optional().matches(/^[0-9+\-\s()]{7,16}$/), body('profileImage').optional().isString()]), controller.updateMe);
router.post('/password', validate([F.password, body('newPassword').isString().isLength({ min: 8, max: 72 }).withMessage('New password must be 8–72 characters')].map((r) => r)), controller.changePassword);
router.post('/avatar', uploadAvatar('avatar', 'avatars'), controller.updateMe);

router.get('/addresses', controller.getAddresses);
router.post('/addresses', controller.addAddress);
router.patch('/addresses/:id', param('id').isMongoId(), controller.updateAddress);
router.delete('/addresses/:id', param('id').isMongoId(), controller.deleteAddress);

module.exports = router;