const express = require('express');
const router = express.Router();
const quickByteController = require('../controllers/quickByteController');
const { protect, authorize, optionalProtect } = require('../middlewares/auth');
const { requireFreeDiskSpace } = require('../utils/diskSpace');

// Browsing/listing is public (guest-friendly)
router.get('/', optionalProtect, quickByteController.getAllQuickBytes);
router.get('/:id', optionalProtect, quickByteController.getQuickByteById);
router.get('/:id/comments', quickByteController.getComments);
router.post('/:id/view', quickByteController.incrementViews);

// Protected User routes
router.post('/:id/like', protect, quickByteController.toggleLike);
router.post('/:id/comments', protect, quickByteController.addComment);
router.delete('/comments/:id', protect, quickByteController.deleteComment);
router.post('/comments/:id/like', protect, quickByteController.toggleCommentLike);

// Protected Admin routes
router.post('/', protect, authorize('admin', 'superadmin'), requireFreeDiskSpace, quickByteController.createQuickByte);
router.put('/:id', protect, authorize('admin', 'superadmin'), requireFreeDiskSpace, quickByteController.updateQuickByte);
router.delete('/:id', protect, authorize('admin', 'superadmin'), quickByteController.deleteQuickByte);

module.exports = router;
