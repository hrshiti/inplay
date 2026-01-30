const AppSetting = require('../models/AppSetting');

// @desc    Get app settings
// @route   GET /api/app-settings
// @access  Public
const getAppSettings = async (req, res) => {
    try {
        let settings = await AppSetting.findOne();

        // If no settings exist, create a default one
        if (!settings) {
            settings = await AppSetting.create({
                helpCenter: {
                    faqs: [
                        { question: 'How do I cancel my subscription?', answer: 'Go to settings to cancel.' },
                        { question: 'Can I watch offline?', answer: 'Yes, download the videos.' }
                    ]
                }
            });
        }

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update app settings
// @route   PUT /api/admin/app-settings
// @access  Private (Admin only)
const updateAppSettings = async (req, res) => {
    try {
        let settings = await AppSetting.findOne();

        if (!settings) {
            settings = new AppSetting(req.body);
        } else {
            // Update fields
            if (req.body.helpCenter) settings.helpCenter = req.body.helpCenter;
            if (req.body.privacyPolicy) settings.privacyPolicy = req.body.privacyPolicy;
            if (req.body.aboutInPlay) settings.aboutInPlay = req.body.aboutInPlay;
        }

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'App settings updated successfully',
            data: settings
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAppSettings,
    updateAppSettings
};
