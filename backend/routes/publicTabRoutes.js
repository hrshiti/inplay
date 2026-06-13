const express = require('express');
const router = express.Router();
const { getDynamicStructure, getDynamicContent } = require('../controllers/publicController');
const { getActiveSections } = require('../controllers/darmaaSectionController');

router.get('/dynamic-structure', getDynamicStructure);
router.get('/dynamic-content', getDynamicContent);
router.get('/darmaa-sections', getActiveSections);

module.exports = router;
