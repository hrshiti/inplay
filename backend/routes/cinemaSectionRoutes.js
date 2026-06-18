const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  createSection,
  getAllSections,
  updateSection,
  deleteSection
} = require('../controllers/cinemaSectionController');

// All routes here are under /api/admin/cinema-sections
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .post(createSection)
  .get(getAllSections);

router.route('/:id')
  .put(updateSection)
  .delete(deleteSection);

module.exports = router;
