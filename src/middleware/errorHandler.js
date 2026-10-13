// ==============================================================================
// MediCloud Centralized Error Handling Middleware
// Prevents sensitive stack traces and database internal leaks to clients
// ==============================================================================

const config = require('../config');

function errorHandler(err, req, res, next) {
  // Always log full error server-side for diagnostics
  console.error('🚨 [Server Error]:', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    stack: config.isProduction ? undefined : err.stack
  });

  const statusCode = err.status || err.statusCode || 500;

  // Safe client response
  res.status(statusCode).json({
    error: statusCode === 500
      ? 'An unexpected internal server error occurred. Please contact the administrator.'
      : err.message || 'Request failed',
    code: err.code || 'SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Resource not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
