const express = require('express');
const router = express.Router();
const quickByteController = require('../controllers/quickByteController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes (for user side)
router.get('/', quickByteController.getAllQuickBytes);
router.get('/:id/comments', quickByteController.getComments);

// Protected User routes
router.post('/:id/like', protect, quickByteController.toggleLike);
router.post('/:id/comments', protect, quickByteController.addComment);
router.delete('/comments/:id', protect, quickByteController.deleteComment);
router.post('/comments/:id/like', protect, quickByteController.toggleCommentLike);

// Protected Admin routes
router.post('/', protect, authorize('admin', 'superadmin'), quickByteController.createQuickByte);
router.get('/:id', protect, authorize('admin', 'superadmin'), quickByteController.getQuickByteById);
router.put('/:id', protect, authorize('admin', 'superadmin'), quickByteController.updateQuickByte);
router.delete('/:id', protect, authorize('admin', 'superadmin'), quickByteController.deleteQuickByte);

module.exports = router;
