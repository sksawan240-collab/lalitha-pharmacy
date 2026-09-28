const express = require('express');
const router = express.Router();

const mount = {
  auth: require('./auth.routes'),
  users: require('./user.routes'),
  products: require('./product.routes'),
  categories: require('./category.routes'),
  cart: require('./cart.routes'),
  orders: require('./order.routes'),
  prescriptions: require('./prescription.routes'),
  invoices: require('./invoice.routes'),
  notifications: require('./notification.routes'),
  announcements: require('./announcement.routes'),
  admin: require('./admin.routes'),
  sales: require('./sales.routes'),
  chatbot: require('./chatbot.routes'),
  payments: require('./payment.routes'),
};

for (const [path, sub] of Object.entries(mount)) {
  router.use(`/api/${path}`, sub);
}

module.exports = router;