const express = require('express');
const router = express.Router();
const { getAppSettings, updateAppSettings } = require('../controllers/appSettingController');
const { protect, authorize } = require('../middlewares/auth');

// Public route to fetch settings
router.get('/', getAppSettings);

// Admin route to update settings
router.put('/', protect, authorize('admin'), updateAppSettings);

module.exports = router;
