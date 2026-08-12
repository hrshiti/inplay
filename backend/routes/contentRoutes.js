const express = require('express');
const router = express.Router();

const userContentController = require('../controllers/userContentController');
const { protect, subscribed, optionalProtect } = require('../middlewares/auth');

// Browsing/listing is public (guest-friendly); playback and downloads still require
// an authenticated user with an active subscription.
router.get('/all', optionalProtect, userContentController.getAllContent);
router.get('/trending', optionalProtect, userContentController.getTrendingContent);
router.get('/new-releases', optionalProtect, userContentController.getNewReleases);
router.get('/category/:category', optionalProtect, userContentController.getContentByCategory);
router.post('/:id/view', userContentController.incrementViews);

router.get('/:id', optionalProtect, userContentController.getContent);
router.get('/:id/stream', protect, subscribed, userContentController.streamContent);
router.post('/:id/download', protect, subscribed, userContentController.createDownloadLicense);
router.post('/validate-download', protect, subscribed, userContentController.validateDownload);
router.get('/user/downloads', protect, subscribed, userContentController.getUserDownloads);
router.delete('/user/downloads/:licenseKey', protect, subscribed, userContentController.revokeDownload);

module.exports = router;

