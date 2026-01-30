const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    tabId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tab',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Please add a category name'],
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'Please add a slug'],
        lowercase: true,
        trim: true
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index to ensure unique slugs within the same tab
categorySchema.index({ tabId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
