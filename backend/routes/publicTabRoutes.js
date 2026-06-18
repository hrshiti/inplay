const express = require('express');
const router = express.Router();
const { getDynamicStructure, getDynamicContent } = require('../controllers/publicController');
const { getActiveSections } = require('../controllers/darmaaSectionController');
const { getActiveSections: getActiveBhojpuriSections } = require('../controllers/bhojpuriSectionController');
const { getActiveSections: getActiveCinemaSections } = require('../controllers/cinemaSectionController');
const { optionalProtect } = require('../middlewares/auth');

router.get('/dynamic-structure', getDynamicStructure);
router.get('/dynamic-content', getDynamicContent);
router.get('/darmaa-sections', optionalProtect, getActiveSections);
router.get('/bhojpuri-sections', getActiveBhojpuriSections);
router.get('/cinema-sections', getActiveCinemaSections);

module.exports = router;
