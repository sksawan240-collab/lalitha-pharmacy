/**
 * Consistent API response envelope:
 *   success: { success: true,  message, data, meta? }
 *   failure: { success: false, message, errors? }
 */
const ok = (res, { data = null, message = 'Success', status = 200, meta = null } = {}) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

module.exports = { ok };
