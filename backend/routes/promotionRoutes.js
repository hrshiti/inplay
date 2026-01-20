const express = require('express');
const router = express.Router();
const {
    createPromotion,
    getActivePromotions,
    getAllPromotions,
    updatePromotion,
    deletePromotion,
} = require('../controllers/promotionController');
const { protect, authorize } = require('../middlewares/auth'); // Assuming these exist based on context

// Public route to get active promotions
router.get('/active', getActivePromotions);

// Admin routes
router.post('/', protect, authorize('admin', 'superadmin'), createPromotion);
router.get('/all', protect, authorize('admin', 'superadmin'), getAllPromotions); // For admin panel list
router.put('/:id', protect, authorize('admin', 'superadmin'), updatePromotion);
router.delete('/:id', protect, authorize('admin', 'superadmin'), deletePromotion);

module.exports = router;
