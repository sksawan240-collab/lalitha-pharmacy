/**
 * Secure admin bootstrap.
 *   npm run setup:admin
 *
 * Reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_MOBILE / ADMIN_PASSWORD from backend/.env.
 * - Creates the admin only if no verified admin exists.
 * - Never stores a plaintext password (bcrypt-hashed by the User model).
 * - Does NOT accept hard-coded credentials.
 */
const env = require('../config/env');
const db = require('../config/db');
const User = require('../models/User');

(async () => {
  await db.connectDB({ retries: 2 });

  const existing = await User.findOne({ role: 'ADMIN', isVerified: true });
  if (existing) {
    console.log(`✔ Admin already exists (${existing.name} <${existing.email}>). Nothing to do.`);
    await db.disconnectDB();
    return;
  }

  if (!env.admin.email || !env.admin.password) {
    console.error('✖ ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env to create the initial admin.');
    console.error('  Copy backend/.env.example → backend/.env, set the values, then rerun.');
    await db.disconnectDB();
    process.exit(1);
  }

  if (env.admin.password.length < 8) {
    console.error('✖ ADMIN_PASSWORD must be at least 8 characters.');
    await db.disconnectDB();
    process.exit(1);
  }

  const admin = await User.create({
    name: env.admin.name || 'Lalitha Pharmacy Admin',
    email: env.admin.email,
    mobile: env.admin.mobile || '0000000000',
    password: env.admin.password,
    role: 'ADMIN',
    isVerified: true,
    mustChangePassword: false,
    status: 'ACTIVE',
  });

  console.log(`✔ Admin created: ${admin.name} <${admin.email}>`);
  console.log('  Login from the frontend at /login');
  await db.disconnectDB();
})().catch(async (err) => {
  console.error(`✖ Admin creation failed: ${err.message}`);
  await db.disconnectDB();
  process.exit(1);
});