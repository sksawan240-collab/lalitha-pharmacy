const express = require('express');
const controller = require('../controllers/category.controller');

const router = express.Router();
router.get('/', controller.listActive);

module.exports = router;