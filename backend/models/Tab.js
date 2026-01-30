const mongoose = require('mongoose');

const tabSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a tab name'],
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        required: [true, 'Please add a slug'],
        unique: true,
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
    },
    type: {
        type: String,
        default: 'dynamic'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Tab', tabSchema);
