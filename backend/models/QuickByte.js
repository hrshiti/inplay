const mongoose = require('mongoose');

const quickByteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    video: {
        public_id: String,
        url: String,
        secure_url: String,
        duration: Number
    },
    episodes: [{
        public_id: String,
        url: String,
        secure_url: String,
        duration: Number,
        title: String,
        order: Number
    }],
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    // The poster/thumbnail
    thumbnail: {
        public_id: String,
        url: String,
        secure_url: String
    },
    category: {
        type: String,
        default: 'Movies'
    },
    genre: {
        type: String,
        default: 'Entertainment'
    },
    year: {
        type: Number,
        default: new Date().getFullYear()
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    // Monetization
    isPaid: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0
    },
    // Display Categories
    isNewAndHot: { type: Boolean, default: false },
    isOriginal: { type: Boolean, default: false },
    isRanking: { type: Boolean, default: false },
    isMovie: { type: Boolean, default: false },
    isTV: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    // Audio Track (New)
    audio: {
        public_id: String,
        url: String,
        secure_url: String,
        title: String,
        artist: String
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    },
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('QuickByte', quickByteSchema);
