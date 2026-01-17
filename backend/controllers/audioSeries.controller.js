const AudioSeries = require('../models/AudioSeries');

// @desc    Get all audio series
// @route   GET /api/audio-series
// @access  Public
exports.getAllAudioSeries = async (req, res, next) => {
    try {
        const series = await AudioSeries.find({ isActive: true }).sort('-createdAt');
        res.status(200).json({
            success: true,
            count: series.length,
            data: series
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single audio series
// @route   GET /api/audio-series/:id
// @access  Public
exports.getAudioSeries = async (req, res, next) => {
    try {
        const series = await AudioSeries.findById(req.params.id);

        if (!series) {
            return res.status(404).json({ success: false, message: 'Audio Series not found' });
        }

        res.status(200).json({
            success: true,
            data: series
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Create new audio series
// @route   POST /api/audio-series
// @access  Private/Admin
exports.createAudioSeries = async (req, res, next) => {
    try {
        const series = await AudioSeries.create(req.body);
        res.status(201).json({
            success: true,
            data: series
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update audio series
// @route   PUT /api/audio-series/:id
// @access  Private/Admin
exports.updateAudioSeries = async (req, res, next) => {
    try {
        let series = await AudioSeries.findById(req.params.id);

        if (!series) {
            return res.status(404).json({ success: false, message: 'Audio Series not found' });
        }

        series = await AudioSeries.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: series
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete audio series
// @route   DELETE /api/audio-series/:id
// @access  Private/Admin
exports.deleteAudioSeries = async (req, res, next) => {
    try {
        const series = await AudioSeries.findById(req.params.id);

        if (!series) {
            return res.status(404).json({ success: false, message: 'Audio Series not found' });
        }

        await series.remove();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Add episode to audio series
// @route   POST /api/audio-series/:id/episodes
// @access  Private/Admin
exports.addEpisode = async (req, res, next) => {
    try {
        const series = await AudioSeries.findById(req.params.id);

        if (!series) {
            return res.status(404).json({ success: false, message: 'Audio Series not found' });
        }

        series.episodes.push(req.body);
        await series.save();

        res.status(200).json({
            success: true,
            data: series
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Remove episode from audio series
// @route   DELETE /api/audio-series/:id/episodes/:episodeId
// @access  Private/Admin
exports.deleteEpisode = async (req, res, next) => {
    try {
        const series = await AudioSeries.findById(req.params.id);

        if (!series) {
            return res.status(404).json({ success: false, message: 'Audio Series not found' });
        }

        series.episodes = series.episodes.filter(ep => ep._id.toString() !== req.params.episodeId);
        await series.save();

        res.status(200).json({
            success: true,
            data: series
        });
    } catch (err) {
        next(err);
    }
};
