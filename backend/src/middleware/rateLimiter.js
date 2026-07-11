const rateLimit = require('express-rate-limit');

// General rate limiter for private API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
      code: 'TOO_MANY_REQUESTS'
    }
  }
});

// Stricter rate limiter for GET public asset by slug: ~30 requests/15 mins per IP
const publicGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many scans or requests to public assets, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

// Stricter rate limiter for submitting public issues: ~10 requests/10 mins per IP
const publicPostIssueLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many issue reports. Please wait before submitting another report.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

module.exports = {
  generalLimiter,
  publicGetLimiter,
  publicPostIssueLimiter
};
