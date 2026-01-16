const Metadata = require('../models/Metadata');

// @desc    Get all metadata
// @route   GET /api/metadata
// @access  Private
const getMetadata = async (req, res) => {
    try {
        const metadata = await Metadata.find({});
        // Convert to easier object format { tabs: [], categories: [] }
        const result = {
            tabs: [],
            categories: []
        };

        metadata.forEach(item => {
            if (item.key === 'tabs') result.tabs = item.value;
            if (item.key === 'categories') result.categories = item.value;
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Add item to metadata list
// @route   POST /api/metadata/:type (tabs or categories)
// @access  Private
const addItem = async (req, res) => {
    try {
        const { type } = req.params;
        const { value } = req.body; // array or single string

        if (!['tabs', 'categories'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid type' });
        }

        if (!value) {
            return res.status(400).json({ success: false, message: 'Value is required' });
        }

        let metadata = await Metadata.findOne({ key: type });

        if (!metadata) {
            metadata = await Metadata.create({ key: type, value: [] });
        }

        // Add unique values
        const valuesToAdd = Array.isArray(value) ? value : [value];
        valuesToAdd.forEach(v => {
            if (!metadata.value.includes(v)) {
                metadata.value.push(v);
            }
        });

        await metadata.save();

        res.status(200).json({
            success: true,
            data: metadata.value,
            message: 'Added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Remove item from metadata list
// @route   DELETE /api/metadata/:type/:value
// @access  Private
const removeItem = async (req, res) => {
    try {
        const { type, value } = req.params;

        if (!['tabs', 'categories'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid type' });
        }

        const metadata = await Metadata.findOne({ key: type });

        if (metadata) {
            metadata.value = metadata.value.filter(v => v !== value);
            await metadata.save();
        }

        res.status(200).json({
            success: true,
            data: metadata ? metadata.value : [],
            message: 'Removed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getMetadata,
    addItem,
    removeItem
};
