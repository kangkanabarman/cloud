// ==============================================================================
// MediCloud Rate Limiting Middleware
// Protects against brute-force attacks and denial-of-service attempts
// ==============================================================================

const rateLimit = require('express-rate-limit');
const config = require('../config');
const metrics = require('../utils/metrics');

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP address. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    metrics.recordRateLimit();
    res.status(429).json(options.message);
  }
});

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMaxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many failed login attempts detected. For security purposes, please wait 15 minutes before retrying.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    metrics.recordRateLimit();
    res.status(429).json(options.message);
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
