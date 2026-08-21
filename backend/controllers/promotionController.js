const path = require('path');
const Promotion = require('../models/Promotion');
const s3Service = require('../services/s3Service');
const { getFilePathFromUrl, deleteFile } = require('../config/multerStorage');

// @desc    Create a new promotion
// @route   POST /api/promotions
// @access  Private/Admin
const createPromotion = async (req, res) => {
    try {
        const { title, posterImageUrl, promoVideoUrl, displayLocation, isActive } = req.body;

        // Force inactive if video needs processing
        const intendedActive = isActive !== undefined ? (isActive === 'true' || isActive === true) : true;
        const forceInactive = (promoVideoUrl && promoVideoUrl.startsWith('/uploads')) ? false : intendedActive;

        const promotion = await Promotion.create({
            title,
            posterImageUrl,
            promoVideoUrl,
            displayLocation,
            isActive: forceInactive,
        });

        // Async HLS Processing for Promotion Video
        if (promoVideoUrl && promoVideoUrl.startsWith('/uploads')) {
            const mediaService = require('../services/mediaService');
            const localPath = getFilePathFromUrl(promoVideoUrl);

            mediaService.handleVideoHLSWithOriginal(localPath, promotion._id, 'promotion').then(async ({ hlsUrl, originalS3Url }) => {
                if (hlsUrl) {
                    await Promotion.findByIdAndUpdate(promotion._id, { hls_url: hlsUrl, isActive: intendedActive, ...(originalS3Url ? { originalS3Url } : {}) }).exec();
                    console.log(`HLS synced and Activated for Promotion: ${promotion.title}`);
                }
            });
        }

        res.status(201).json(promotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all active promotions
// @route   GET /api/promotions/active
// @access  Public
const getActivePromotions = async (req, res) => {
    try {
        // Optionally filter by location query param if needed, e.g., ?location=home
        const { location } = req.query;
        let query = { isActive: true };

        if (location) {
            query.displayLocation = { $in: [location, 'both'] };
        }

        const promotions = await Promotion.find(query).sort({ createdAt: -1 });
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all promotions (Admin)
// @route   GET /api/promotions/all
// @access  Private/Admin
const getAllPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find({}).sort({ createdAt: -1 });
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Update a promotion
// @route   PUT /api/promotions/:id
// @access  Private/Admin
const updatePromotion = async (req, res) => {
    try {
        const { promoVideoUrl, posterImageUrl } = req.body;
        const oldPromotion = await Promotion.findById(req.params.id);

        if (!oldPromotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        const updatedPromotion = await Promotion.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        // The previous media files were never cleaned up here before - remove
        // whichever ones are actually being replaced, now that we still have
        // their old paths.
        if (promoVideoUrl !== undefined && promoVideoUrl !== oldPromotion.promoVideoUrl && oldPromotion.promoVideoUrl) {
            const oldVideoPath = getFilePathFromUrl(oldPromotion.promoVideoUrl);
            if (oldVideoPath) {
                deleteFile(oldVideoPath);
                s3Service.deleteFolder(`videos/promotion/${oldPromotion._id}`).catch(() => {});
                s3Service.deleteObject(`originals/promotion/${oldPromotion._id}/${path.basename(oldVideoPath)}`).catch(() => {});
            }
        }
        if (posterImageUrl !== undefined && posterImageUrl !== oldPromotion.posterImageUrl && oldPromotion.posterImageUrl) {
            const oldPosterPath = getFilePathFromUrl(oldPromotion.posterImageUrl);
            if (oldPosterPath) deleteFile(oldPosterPath);
        }

        // Process HLS if video changed
        if (promoVideoUrl && promoVideoUrl !== oldPromotion.promoVideoUrl && promoVideoUrl.startsWith('/uploads')) {
            const mediaService = require('../services/mediaService');
            const localPath = getFilePathFromUrl(promoVideoUrl);

            mediaService.handleVideoHLSWithOriginal(localPath, updatedPromotion._id, 'promotion').then(({ hlsUrl, originalS3Url }) => {
                if (hlsUrl) {
                    Promotion.findByIdAndUpdate(updatedPromotion._id, { hls_url: hlsUrl, ...(originalS3Url ? { originalS3Url } : {}) }).exec();
                }
            });
        }

        res.json(updatedPromotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a promotion
// @route   DELETE /api/promotions/:id
// @access  Private/Admin
const deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);

        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        // Local cleanup - previously this deleted nothing at all, leaking the
        // poster image and promo video for every deleted promotion.
        const videoPath = getFilePathFromUrl(promotion.promoVideoUrl);
        if (videoPath) deleteFile(videoPath);
        const posterPath = getFilePathFromUrl(promotion.posterImageUrl);
        if (posterPath) deleteFile(posterPath);

        // Best-effort S3 cleanup - never blocks the record delete below.
        s3Service.deleteFolder(`videos/promotion/${promotion._id}`).catch(() => {});
        if (promotion.originalS3Url && videoPath) {
            s3Service.deleteObject(`originals/promotion/${promotion._id}/${path.basename(videoPath)}`).catch(() => {});
        }

        await promotion.deleteOne();
        res.json({ message: 'Promotion removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPromotion,
    getActivePromotions,
    getAllPromotions,
    updatePromotion,
    deletePromotion,
};
