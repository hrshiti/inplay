const express = require('express');
const router = express.Router();
const {
  createSection,
  getAllSections,
  updateSection,
  deleteSection
} = require('../controllers/bhojpuriSectionController');

// We use the auth middlewares from admin routes
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getAllSections)
  .post(createSection);

router.route('/:id')
  .put(updateSection)
  .delete(deleteSection);

module.exports = router;
