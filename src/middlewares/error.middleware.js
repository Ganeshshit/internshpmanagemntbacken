// Global error handling middleware

const ApiResponse = require('../utils/response.util');
const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorMiddleware = (err, req, res, next) => {
  let { statusCode = 500, message, errors } = err;

  // ===============================
  // Normalize known error types
  // ===============================

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
    const field = Object.keys(err.keyPattern)[0];
    errors = [{ field, message: `${field} already exists` }];
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Unexpected field'
          : err.message;
  }

  // ===============================
  // Centralized structured logging
  // ===============================
  logger.error({
    message,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id || null,
    errors,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  // ===============================
  // API response
  // ===============================
  return ApiResponse.error(res, message, statusCode, errors);
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

module.exports = {
  AppError,
  errorMiddleware,
  asyncHandler,
  notFound,
};
