// Rate limiting middleware placeholder - MaintainIQ
const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
      code: 'TOO_MANY_REQUESTS'
    }
  }
});

module.exports = { generalLimiter };
