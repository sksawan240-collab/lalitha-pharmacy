const crypto = require('crypto');
const env = require('../config/env');
const OTP = require('../models/OTP');
const emailService = require('./email.service');

// In-memory capture of the latest generated code — ONLY populated in test mode
// (NODE_ENV=test) so the e2e OTP flow can be verified without SMTP. Never
// persisted; never exposed outside test mode.
let lastGeneratedCode = null;

/** Generate a cryptographically random 6-digit code. */
const generateCode = () => {
  let code;
  do {
    code = crypto.randomInt(0, 1000000); // 0..999999
  } while (code < 100000); // enforce 6 digits (100000..999999)
  return String(code);
};

const createOtp = async ({ email, purpose = 'REGISTER' }) => {
  const Email = email.toLowerCase().trim();

  // Resend cooldown / abuse guard on the same email+purpose record.
  const existing = await OTP.findOne({
    email: Email,
    purpose,
    consumed: false,
    expiresAt: { $gt: new Date() },
  });
  if (existing) {
    const elasped = Date.now() - existing.lastSentAt.getTime();
    if (elasped < env.otp.resendCooldownSeconds * 1000) {
      const wait = Math.ceil((env.otp.resendCooldownSeconds * 1000 - elasped) / 1000);
      throw Object.assign(new Error(`Please wait ${wait}s before requesting another OTP`), { status: 429 });
    }
    if (existing.resendCount >= 5) {
      throw Object.assign(new Error('Too many OTP requests. Try again later.'), { status: 429 });
    }
  }

  const code = generateCode();
  if (env.isTest) lastGeneratedCode = code;
  const expiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

  const record = existing
    ? Object.assign(existing, {
        codeHash: crypto.createHash('sha256').update(code).digest('hex'),
        expiresAt,
        attempts: 0,
        consumed: false,
        lastSentAt: new Date(),
        resendCount: existing.resendCount + 1,
      })
    : new OTP({
        email: Email,
        purpose,
        codeHash: crypto.createHash('sha256').update(code).digest('hex'),
        expiresAt,
        lastSentAt: new Date(),
        resendCount: 1,
      });
  await record.save();

  // Best-effort email: if SMTP is not configured, OTP is still stored for the
  // guarded test/verification hooks. OTP codes are NEVER logged to the console
  // for security reasons — they must be retrieved from the email inbox.
  let emailDelivered = false;
  if (env.emailConfigured) {
    try {
      await emailService.sendOtpEmail(Email, code, purpose);
      emailDelivered = true;
    } catch (err) {
      console.error(`[OTP] email failed for ${Email}: ${err.message}`);
    }
  }

  return { email: Email, emailDelivered, expiresAt };
};

const verifyOtp = async ({ email, code, purpose = 'REGISTER', consume = true }) => {
  const Email = email.toLowerCase().trim();
  // NOTE: codeHash is `select: false` in the model — it MUST be explicitly
  // selected here, otherwise the hash comparison can never succeed and every
  // correct OTP is rejected with "Invalid OTP".
  const record = await OTP.findOne({ email: Email, purpose, consumed: false })
    .sort({ createdAt: -1 })
    .select('+codeHash');
  if (!record) {
    throw Object.assign(new Error('No valid OTP found. Please request a new one.'), { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    throw Object.assign(new Error('OTP has expired. Please request a new one.'), { status: 400 });
  }
  if (record.attempts >= env.otp.maxAttempts) {
    record.consumed = true;
    await record.save();
    throw Object.assign(new Error('Too many incorrect attempts. Please request a new OTP.'), {
      status: 429,
    });
  }

  const hash = crypto.createHash('sha256').update(code.trim()).digest('hex');
  if (hash !== record.codeHash || String(code).length !== env.otp.length) {
    record.attempts += 1;
    await record.save();
    throw Object.assign(new Error('Invalid OTP. Please check and try again.'), { status: 400 });
  }

  if (consume) {
    record.consumed = true;
    await record.save();
  }
  return { valid: true, email: Email };
};

/** Testing/ops helper: reveal the latest generated OTP code (test mode only). */
const getLastTestCode = () => {
  if (!env.allowTestOtpExposure) return null;
  return lastGeneratedCode;
};

module.exports = { createOtp, verifyOtp, generateCode, getLastTestCode };