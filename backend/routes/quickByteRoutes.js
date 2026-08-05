const express = require('express');
const router = express.Router();
const quickByteController = require('../controllers/quickByteController');
const { protect, authorize, subscribed } = require('../middlewares/auth');

// Requires an active subscription — no guest/unsubscribed browsing
router.get('/', protect, subscribed, quickByteController.getAllQuickBytes);
router.get('/:id', protect, subscribed, quickByteController.getQuickByteById);
router.get('/:id/comments', quickByteController.getComments);
router.post('/:id/view', quickByteController.incrementViews);

// Protected User routes
router.post('/:id/like', protect, quickByteController.toggleLike);
router.post('/:id/comments', protect, quickByteController.addComment);
router.delete('/comments/:id', protect, quickByteController.deleteComment);
router.post('/comments/:id/like', protect, quickByteController.toggleCommentLike);

// Protected Admin routes
router.post('/', protect, authorize('admin', 'superadmin'), quickByteController.createQuickByte);
router.put('/:id', protect, authorize('admin', 'superadmin'), quickByteController.updateQuickByte);
router.delete('/:id', protect, authorize('admin', 'superadmin'), quickByteController.deleteQuickByte);

module.exports = router;
