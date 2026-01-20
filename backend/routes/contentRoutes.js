const express = require('express');
const router = express.Router();

const userContentController = require('../controllers/userContentController');

// Public routes (no auth required)
router.get('/all', userContentController.getAllContent);
router.get('/trending', userContentController.getTrendingContent);
router.get('/new-releases', userContentController.getNewReleases);
router.get('/category/:category', userContentController.getContentByCategory);

// Routes requiring authentication for full access
const { protect } = require('../middlewares/auth');
router.use(protect); // All routes below require authentication

router.get('/:id', userContentController.getContent);
router.get('/:id/stream', userContentController.streamContent);
router.post('/:id/download', userContentController.createDownloadLicense);
router.post('/validate-download', userContentController.validateDownload);
router.get('/user/downloads', userContentController.getUserDownloads);
router.delete('/user/downloads/:licenseKey', userContentController.revokeDownload);

module.exports = router;
