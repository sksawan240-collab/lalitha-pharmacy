/**
 * Centralised, validated environment configuration.
 * Secrets are read ONLY from environment variables — never hard-coded.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const normalizeOriginList = (raw) => {
  const defaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://lalitha-pharmacy-1.onrender.com',
    'https://lalitha-pharmacy.onrender.com',
  ];

  const incoming = (raw || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => origin !== '*');

  return [...new Set([...defaults, ...incoming])];
};

const requiredInProduction = ['SESSION_SECRET', 'MONGODB_URI'];

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '5000', 10),
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendUrls: normalizeOriginList(process.env.FRONTEND_URL || 'http://localhost:5173'),

  mongoUri: process.env.MONGODB_URI || '',
  mongoUriTest: process.env.MONGODB_URI_TEST || '',

  jwt: {
    // Kept only for backwards-compat parsing — session auth is authoritative.
    // NO JWT is issued or accepted anywhere. See middleware/auth.middleware.js
    secret: process.env.JWT_SECRET || 'unused-session-auth-build',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'unused-session-auth-build',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresDays: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '30', 10),
  },

  session: {
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-session-secret-change-me',
    name: process.env.SESSION_COOKIE_NAME || 'lp.sid',
    maxAgeMs: parseInt(process.env.SESSION_MAX_AGE_MS || String(1000 * 60 * 60 * 8), 10),
  },

  email: {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: String(process.env.EMAIL_SECURE || 'false') === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'Lalitha Pharmacy <no-reply@lalithapharmacy.com>',
  },

  ai: {
    provider: (process.env.AI_PROVIDER || 'openai').toLowerCase(),
    apiKey: process.env.AI_API_KEY || '',
    apiBase: process.env.AI_API_BASE || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    geminiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },

  payment: {
    key: process.env.PAYMENT_KEY || '',
    secret: process.env.PAYMENT_SECRET || '',
  },

  otp: {
    length: 6,
    expiresMinutes: 10,
    maxAttempts: 5,
    resendCooldownSeconds: 60,
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  },

  rateLimit: {
    apiMax: parseInt(process.env.API_RATE_LIMIT_MAX || '300', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  },

  admin: {
    name: process.env.ADMIN_NAME || 'Lalitha Pharmacy Admin',
    email: process.env.ADMIN_EMAIL || '',
    mobile: process.env.ADMIN_MOBILE || '',
    password: process.env.ADMIN_PASSWORD || '',
  },
};

// Flags used across services
env.emailConfigured = Boolean(env.email.host && env.email.user && env.email.password);
env.paymentConfigured = Boolean(env.payment.key && env.payment.secret);
env.aiConfigured =
  (env.ai.provider === 'openai' && Boolean(env.ai.apiKey)) ||
  (env.ai.provider === 'gemini' && Boolean(env.ai.geminiKey));
// In test mode with no real SMTP the OTP can be fetched through a guarded
// dev-only endpoint so the end-to-end flow can be exercised by the test suite.
env.allowTestOtpExposure = env.isTest;

if (env.isProd) {
  const missing = requiredInProduction.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

module.exports = env;
