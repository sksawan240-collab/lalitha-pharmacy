const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/chatbot.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', optionalAuth, validate([body('message').isString().trim().isLength({ min: 1, max: 1000 })]), controller.chat);

function validate(rules) {
  return require('../middleware/validate.middleware').validate(rules);
}

module.exports = router;