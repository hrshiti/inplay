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
const { requireFreeDiskSpace } = require('../utils/diskSpace');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getAllBanners)
  .post(requireFreeDiskSpace, createBanner);

router.route('/:id')
  .put(requireFreeDiskSpace, updateBanner)
  .delete(deleteBanner);

module.exports = router;
