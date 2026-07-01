const express = require('express');
const router = express.Router();
const { getVmap } = require('../controllers/vmapController');

router.get('/', getVmap);

module.exports = router;
