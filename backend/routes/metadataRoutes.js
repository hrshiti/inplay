const express = require('express');
const router = express.Router();
const metadataController = require('../controllers/metadataController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/', protect, metadataController.getMetadata);
router.post('/:type', protect, authorize('admin'), metadataController.addItem);
router.delete('/:type/:value', protect, authorize('admin'), metadataController.removeItem);

module.exports = router;
