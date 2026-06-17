const express = require('express');
const router = express.Router();
const { getDynamicStructure, getDynamicContent } = require('../controllers/publicController');
const { getActiveSections } = require('../controllers/darmaaSectionController');
const { getActiveSections: getActiveBhojpuriSections } = require('../controllers/bhojpuriSectionController');

router.get('/dynamic-structure', getDynamicStructure);
router.get('/dynamic-content', getDynamicContent);
router.get('/darmaa-sections', getActiveSections);
router.get('/bhojpuri-sections', getActiveBhojpuriSections);

module.exports = router;
