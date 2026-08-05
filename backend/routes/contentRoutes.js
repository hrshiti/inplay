const express = require('express');
const router = express.Router();

const userContentController = require('../controllers/userContentController');
const { protect, subscribed } = require('../middlewares/auth');

// Content requires an active subscription — no guest/unsubscribed browsing
router.get('/all', protect, subscribed, userContentController.getAllContent);
router.get('/trending', protect, subscribed, userContentController.getTrendingContent);
router.get('/new-releases', protect, subscribed, userContentController.getNewReleases);
router.get('/category/:category', protect, subscribed, userContentController.getContentByCategory);
router.post('/:id/view', userContentController.incrementViews);

router.get('/:id', protect, subscribed, userContentController.getContent);
router.get('/:id/stream', protect, subscribed, userContentController.streamContent);
router.post('/:id/download', protect, subscribed, userContentController.createDownloadLicense);
router.post('/validate-download', protect, subscribed, userContentController.validateDownload);
router.get('/user/downloads', protect, subscribed, userContentController.getUserDownloads);
router.delete('/user/downloads/:licenseKey', protect, subscribed, userContentController.revokeDownload);

module.exports = router;

