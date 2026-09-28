/** Operational API error with HTTP status — safe to surface to clients. */
class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (errors) this.errors = errors; // optional array of field errors
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Not authenticated') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message) {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
