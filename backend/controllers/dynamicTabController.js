const Tab = require('../models/Tab');
const Category = require('../models/Category');

// @desc    Get all tabs (Admin)
// @route   GET /api/admin/tabs
const getAllTabs = async (req, res) => {
    try {
        const tabs = await Tab.find().sort({ order: 1 });
        res.status(200).json({ success: true, data: tabs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a tab
// @route   POST /api/admin/tabs
const createTab = async (req, res) => {
    try {
        const { name, slug, order } = req.body;
        const tab = await Tab.create({ name, slug, order });
        res.status(201).json({ success: true, data: tab });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update a tab
// @route   PUT /api/admin/tabs/:id
const updateTab = async (req, res) => {
    try {
        const tab = await Tab.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: tab });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete a tab
// @route   DELETE /api/admin/tabs/:id
const deleteTab = async (req, res) => {
    try {
        const tab = await Tab.findById(req.params.id);
        if (!tab) return res.status(404).json({ success: false, message: 'Tab not found' });

        // Also delete associated categories
        await Category.deleteMany({ tabId: tab._id });
        await tab.deleteOne();

        res.status(200).json({ success: true, message: 'Tab and associated categories deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Categories ---

// @desc    Get categories by tab ID
// @route   GET /api/admin/tabs/:tabId/categories
const getCategoriesByTab = async (req, res) => {
    try {
        const categories = await Category.find({ tabId: req.params.tabId }).sort({ order: 1 });
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a category
// @route   POST /api/admin/categories
const createCategory = async (req, res) => {
    try {
        const { name, slug, order } = req.body;
        const { tabId } = req.params;
        const category = await Category.create({ tabId, name, slug, order });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/admin/categories/:id
const deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllTabs,
    createTab,
    updateTab,
    deleteTab,
    getCategoriesByTab,
    createCategory,
    deleteCategory
};
