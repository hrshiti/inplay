const express = require('express');
const router = express.Router();
const {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');

// We use the auth middlewares from admin routes
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getAllBanners)
  .post(createBanner);

router.route('/:id')
  .put(updateBanner)
  .delete(deleteBanner);

module.exports = router;
