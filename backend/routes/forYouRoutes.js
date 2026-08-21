const express = require('express');
const router = express.Router();
const forYouController = require('../controllers/forYouController');
const userAuthController = require('../controllers/userAuthController');
const { protect, authorize, optionalProtect } = require('../middlewares/auth');
const { requireFreeDiskSpace } = require('../utils/diskSpace');

// Browsing/listing is public (guest-friendly)
router.get('/', optionalProtect, forYouController.getAllForYou);
router.get('/:id/comments', forYouController.getComments);
router.post('/:id/view', forYouController.incrementViews);

// Protected User routes
router.post('/:id/like', protect, userAuthController.toggleLike);
router.post('/:id/comments', protect, forYouController.addComment);
router.delete('/comments/:id', protect, forYouController.deleteComment);
router.post('/comments/:id/like', protect, forYouController.toggleCommentLike);

// Protected Admin routes
router.post('/', protect, authorize('admin', 'superadmin'), requireFreeDiskSpace, forYouController.createForYou);
router.delete('/:id', protect, authorize('admin', 'superadmin'), forYouController.deleteForYou);

module.exports = router;
