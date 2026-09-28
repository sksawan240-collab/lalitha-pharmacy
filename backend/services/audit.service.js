const AuditLog = require('../models/AuditLog');

const clientIp = (req) => {
  if (!req) return '';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
};

/** Append an entry to the immutable audit trail. Never throws on failure. */
const audit = async ({ user, action, resource = '', resourceId = null, details = {}, req = null, status = 'SUCCESS' }) => {
  try {
    await AuditLog.create({
      user: user?._id || user,
      userEmail: user?.email || '',
      action,
      resource,
      resourceId,
      details,
      ip: clientIp(req),
      userAgent: req?.headers?.['user-agent'] || '',
      status,
    });
  } catch (err) {
    console.error(`[audit] failed to record ${action}: ${err.message}`);
  }
};

module.exports = audit;