const express = require('express');
const router = express.Router();

const userContentController = require('../controllers/userContentController');
const { protect, optionalProtect } = require('../middlewares/auth');

// Public routes (no auth required, but token accepted if present)
router.get('/all', optionalProtect, userContentController.getAllContent);
router.get('/trending', userContentController.getTrendingContent);
router.get('/new-releases', userContentController.getNewReleases);
router.get('/category/:category', userContentController.getContentByCategory);
router.post('/:id/view', userContentController.incrementViews);

router.get('/:id', optionalProtect, userContentController.getContent);
router.get('/:id/stream', protect, userContentController.streamContent);
router.post('/:id/download', protect, userContentController.createDownloadLicense);
router.post('/validate-download', protect, userContentController.validateDownload);
router.get('/user/downloads', protect, userContentController.getUserDownloads);
router.delete('/user/downloads/:licenseKey', protect, userContentController.revokeDownload);

module.exports = router;

