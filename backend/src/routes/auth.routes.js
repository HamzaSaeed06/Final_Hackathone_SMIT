const express = require('express');
const { register, login, me } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Public routes
router.post('/login', login);

// Admin-only route
router.post('/register', auth, requireRole('admin'), register);

// Auth required
router.get('/me', auth, me);

module.exports = router;
