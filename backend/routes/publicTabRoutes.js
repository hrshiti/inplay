const express = require('express');
const router = express.Router();
const { getDynamicStructure, getDynamicContent } = require('../controllers/publicController');
const { getActiveSections } = require('../controllers/darmaaSectionController');
const { getActiveSections: getActiveBhojpuriSections } = require('../controllers/bhojpuriSectionController');
const { getActiveSections: getActiveCinemaSections } = require('../controllers/cinemaSectionController');
const { getPublicBanners } = require('../controllers/bannerController');
const { protect, subscribed } = require('../middlewares/auth');

// Tab/category config only, no video content — needed pre-subscription to render nav
router.get('/dynamic-structure', getDynamicStructure);
// Real content data — requires an active subscription
router.get('/dynamic-content', protect, subscribed, getDynamicContent);
router.get('/darmaa-sections', protect, subscribed, getActiveSections);
router.get('/bhojpuri-sections', protect, subscribed, getActiveBhojpuriSections);
router.get('/cinema-sections', protect, subscribed, getActiveCinemaSections);
// Marketing banners only, no user/video content
router.get('/banners', getPublicBanners);

module.exports = router;
