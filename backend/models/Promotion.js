const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    posterImageUrl: {
        type: String,
        required: true,
    },
    promoVideoUrl: {
        type: String,
        required: false, // Optional
    },
    displayLocation: {
        type: String,
        enum: ['home', 'popular', 'both'],
        default: 'both',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Promotion', promotionSchema);
