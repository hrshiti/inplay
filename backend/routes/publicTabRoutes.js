const express = require('express');
const router = express.Router();
const { getDynamicStructure, getDynamicContent } = require('../controllers/publicController');
const { getActiveSections } = require('../controllers/darmaaSectionController');
const { getActiveSections: getActiveBhojpuriSections } = require('../controllers/bhojpuriSectionController');
const { getActiveSections: getActiveCinemaSections } = require('../controllers/cinemaSectionController');
const { getPublicBanners } = require('../controllers/bannerController');
const { optionalProtect } = require('../middlewares/auth');

// Tab/category config only, no video content — needed pre-subscription to render nav
router.get('/dynamic-structure', getDynamicStructure);
// Real content data — browsing/listing is public (guest-friendly)
router.get('/dynamic-content', optionalProtect, getDynamicContent);
router.get('/darmaa-sections', optionalProtect, getActiveSections);
router.get('/bhojpuri-sections', optionalProtect, getActiveBhojpuriSections);
router.get('/cinema-sections', optionalProtect, getActiveCinemaSections);
// Marketing banners only, no user/video content
router.get('/banners', getPublicBanners);

module.exports = router;
