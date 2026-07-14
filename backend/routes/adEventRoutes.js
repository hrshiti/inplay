const express = require('express');
const router = express.Router();
const { recordAdEvents, getAdEventStats } = require('../controllers/adEventController');
const { protect, authorize } = require('../middlewares/auth');

// Public ingest endpoint — hit by the web player (sendBeacon) and the Flutter app
router.post('/', recordAdEvents);

// Admin-only aggregated stats (fill rate, quartiles, errors)
router.get('/stats', protect, authorize('admin'), getAdEventStats);

module.exports = router;
