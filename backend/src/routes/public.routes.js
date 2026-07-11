const express = require('express');
const {
  getPublicAssetBySlug,
  reportIssueForAsset,
  getPublicIssueStatus,
} = require('../controllers/public.controller');
const { publicGetLimiter, publicPostIssueLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/public/assets/:slug — anonymous view with 30r/15m limit
router.get('/assets/:slug', publicGetLimiter, getPublicAssetBySlug);

// POST /api/public/assets/:slug/issues — anonymous reported issue with 10c/10m limit
router.post('/assets/:slug/issues', publicPostIssueLimiter, upload.single('evidence'), reportIssueForAsset);

// GET /api/public/issues/:issueNumber — check issue status optionally
router.get('/issues/:issueNumber', publicGetLimiter, getPublicIssueStatus);

module.exports = router;
