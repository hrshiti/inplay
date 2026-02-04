const express = require('express');
const router = express.Router();
const {
    getAllAudioSeries,
    getAudioSeries,
    createAudioSeries,
    updateAudioSeries,
    deleteAudioSeries,
    addEpisode,
    deleteEpisode,
    incrementViews
} = require('../controllers/audioSeries.controller');

const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getAllAudioSeries);
router.get('/:id', getAudioSeries);
router.post('/:id/view', incrementViews);

// Admin protected routes
router.use(protect);
router.use(authorize('admin'));

router.post('/', createAudioSeries);
router.put('/:id', updateAudioSeries);
router.delete('/:id', deleteAudioSeries);
router.post('/:id/episodes', addEpisode);
router.delete('/:id/episodes/:episodeId', deleteEpisode);

module.exports = router;
