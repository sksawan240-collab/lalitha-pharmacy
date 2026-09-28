const ApiError = require('../utils/ApiError');

/** 404 for unknown routes. */
const notFound = (req, res, next) =>
  next(ApiError.notFound(`API route not found: ${req.method} ${req.originalUrl || req.url}`));

/**
 * Central error handler.
 * - Operational ApiErrors render their safe message.
 * - Unrecognised errors are logged and masked (no stack traces to clients).
 */
const errorHandler = (err, req, res, next) => {
  // Express body-parser JSON errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large' });
  }
  // Multer upload errors
  if (err.code === 'FILE_TYPE_ERROR') {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File is too large' });
  }

  const status = err.statusCode || (Number.isInteger(err.status) ? err.status : 500);
  const message = (status >= 500 && status < 600)
    ? 'Something went wrong on our side. Please try again later.'
    : (err.message || 'Request failed');

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.url} → ${err.message}\n${err.stack}`);
  }

  res.status(status).json({ success: false, message, ...(err.errors ? { errors: err.errors } : {}) });
};

module.exports = { notFound, errorHandler };