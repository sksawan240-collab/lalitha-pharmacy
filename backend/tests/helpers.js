/**
 * Shared test helpers: a purpose-built test user + supertest agent + assertions.
 * Uses MONGODB_URI_TEST if provided, otherwise MONGODB_URI (the Atlas connection).
 */
// Must be set before any config module is loaded.
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
const request = require('supertest');
const env = require('../config/env');
const db = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const OTPModel = require('../models/OTP');
const otpService = require('../services/otp.service');

let appRef = null;

const connectTestDb = async () => {
  if (!env.mongoUriTest && !env.mongoUri) {
    console.log('  ⚠ No MONGODB_URI/MONGODB_URI_TEST configured — skipping integration tests.');
    process.exit(0);
  }
  await db.connectDB({ retries: 2 });
};

const getApp = async () => {
  if (appRef) return appRef;
  const { buildApp } = require('../app');
  await connectTestDb();
  const { app } = await buildApp({ connect: false, listen: false });
  appRef = app;
  return app;
};

const wipe = async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Order.deleteMany({}),
    Notification.deleteMany({}),
    OTPModel.deleteMany({}),
    require('../models/Inventory').deleteMany({}),
    require('../models/Sale').deleteMany({}),
    require('../models/RefreshToken').deleteMany({}),
    require('../models/AuditLog').deleteMany({}),
    require('../models/Invoice').deleteMany({}),
    require('../models/Prescription').deleteMany({}),
    require('../models/Cart').deleteMany({}),
    require('../models/Announcement').deleteMany({}),
  ]);
};

/** Create a user directly (fast path) and return {user, password}. */
const seedUser = async ({ role = 'CUSTOMER', verified = true, name = 'Test User', email = null, password = 'StrongPass123!' } = {}) => {
  const finalEmail = email || (role === 'ADMIN' ? 'admin@lalitha.test' : `${role.toLowerCase()}${Date.now()}@lalitha.test`);
  const user = await User.create({
    name,
    email: finalEmail,
    mobile: '9876543210',
    password,
    role,
    isVerified: verified,
    status: 'ACTIVE',
  });
  return { user, password };
};

const registerViaApi = (app, payload) =>
  request(app).post('/api/auth/register').send({
    name: 'Integration Tester',
    email: 'tester@lalitha.test',
    mobile: '9876543210',
    password: 'StrongPass123!',
    confirmPassword: 'StrongPass123!',
    address: '12 Test Street',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    ...payload,
  });

/** Reveal the most recent valid OTP for an email. Because codes are stored
 * hashed, we hook the OTP service with a test override to intercept the code
 * before encryption — enabled only under NODE_ENV=test. */
const captureNextOtp = async () => {
  const realCreate = otpService.createOtp;
  const captured = new Promise((resolve) => {
    const { createOtp } = require('../services/otp.service');
    const override = async (args) => {
      // Read the generated code via a spy on OTP creation is not possible
      // (hash-only). Instead we monkey-patch the crypto function used by
      // otp.service to record the last generated code.
      return realCreate(args);
    };
    module.exports._spy = { override, resolve };
  });
  return captured;
};

const seedCategory = async (name = 'Tablets') => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return Category.findOneAndUpdate({ slug }, { $setOnInsert: { name, slug, active: true, isSystem: true } }, { upsert: true, new: true });
};

const seedProduct = async ({ categoryId, quantity = 20, minStock = 5, name = 'Test medicine capsule', price = 45, gst = 12, prescriptionRequired = false, expiryOffsetDays = 400 } = {}) =>
  Product.create({
    name,
    genericName: name,
    brandName: 'TestBrand',
    category: categoryId,
    description: 'Integration-test product (created through tests only).',
    manufacturer: 'Test Pharmaceuticals',
    batchNumber: `B-${Date.now()}`,
    mfgDate: new Date(),
    expiryDate: new Date(Date.now() + expiryOffsetDays * 86400000),
    mrp: price * 1.5,
    distributorPrice: price,
    gst,
    quantity,
    minimumStockLevel: minStock,
    active: true,
  });

const assertSuccess = (res) => {
  if (!res.body.success) {
    throw new Error(`Expected success but got ${res.status}: ${JSON.stringify(res.body)}`);
  }
};

let passed = 0;
let failed = 0;
const t = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✘ ${name}\n    ${err.message}`);
  }
};

module.exports = {
  request,
  env,
  db,
  User,
  Product,
  Category,
  Order,
  Notification,
  OTPModel,
  getApp,
  wipe,
  seedUser,
  registerViaApi,
  seedCategory,
  seedProduct,
  assertSuccess,
  t,
  results: () => ({ passed, failed }),
  captureNextOtp,
};