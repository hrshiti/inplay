const Tab = require('../models/Tab');
const Category = require('../models/Category');
const Content = require('../models/Content');
const { hydrateContent } = require('../services/contentService');

// @desc    Get full dynamic structure (Tabs + Categories)
// @route   GET /api/public/dynamic-structure
const getDynamicStructure = async (req, res) => {
    try {
        const tabs = await Tab.find({ isActive: true }).sort({ order: 1 }).lean();

        // For each tab, fetch its categories
        const structure = await Promise.all(tabs.map(async (tab) => {
            const categories = await Category.find({ tabId: tab._id, isActive: true }).sort({ order: 1 }).lean();
            return {
                ...tab,
                categories
            };
        }));

        res.status(200).json({ success: true, data: structure });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get content for a specific dynamic tab/category
// @route   GET /api/public/dynamic-content
const getDynamicContent = async (req, res) => {
    try {
        const { tabSlug, categorySlug } = req.query;

        let query = { status: 'published' };

        if (tabSlug) {
            const tab = await Tab.findOne({ slug: tabSlug });
            if (!tab) return res.status(200).json({ success: true, data: [] });
            query.dynamicTabId = tab._id;
        }

        if (categorySlug) {
            const category = await Category.findOne({ slug: categorySlug });
            if (!category) return res.status(200).json({ success: true, data: [] });
            query.dynamicCategoryId = category._id;
        }

        const content = await Content.find(query).sort({ createdAt: -1 }).lean();
        const hydratedContent = content.map(item => hydrateContent(item));

        res.status(200).json({ success: true, data: hydratedContent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDynamicStructure,
    getDynamicContent
};
