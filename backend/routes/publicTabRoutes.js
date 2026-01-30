const express = require('express');
const router = express.Router();
const { getDynamicStructure, getDynamicContent } = require('../controllers/publicController');

router.get('/dynamic-structure', getDynamicStructure);
router.get('/dynamic-content', getDynamicContent);

module.exports = router;
