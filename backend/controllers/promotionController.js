const Promotion = require('../models/Promotion');

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
            const { getFilePathFromUrl } = require('../config/multerStorage');
            const mediaService = require('../services/mediaService');
            const localPath = getFilePathFromUrl(promoVideoUrl);

            mediaService.handleVideoHLS(localPath, promotion._id, 'promotion').then(async (hlsUrl) => {
                if (hlsUrl) {
                    await Promotion.findByIdAndUpdate(promotion._id, { hls_url: hlsUrl, isActive: intendedActive }).exec();
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
        const { promoVideoUrl } = req.body;
        const oldPromotion = await Promotion.findById(req.params.id);

        if (!oldPromotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        const updatedPromotion = await Promotion.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        // Process HLS if video changed
        if (promoVideoUrl && promoVideoUrl !== oldPromotion.promoVideoUrl && promoVideoUrl.startsWith('/uploads')) {
            const { getFilePathFromUrl } = require('../config/multerStorage');
            const mediaService = require('../services/mediaService');
            const localPath = getFilePathFromUrl(promoVideoUrl);

            mediaService.handleVideoHLS(localPath, updatedPromotion._id, 'promotion').then(hlsUrl => {
                if (hlsUrl) {
                    Promotion.findByIdAndUpdate(updatedPromotion._id, { hls_url: hlsUrl }).exec();
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
