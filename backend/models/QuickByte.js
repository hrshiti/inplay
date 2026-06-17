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
        hls_url: String,
        duration: Number
    },
    episodes: [{
        public_id: String,
        url: String,
        secure_url: String,
        hls_url: String,
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
    // Display Categories
    isNewAndHot: { type: Boolean, default: false },
    isOriginal: { type: Boolean, default: false },
    isRanking: { type: Boolean, default: false },
    isMovie: { type: Boolean, default: false },
    isTV: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isDarmaaHero: { type: Boolean, default: false },
    isBhojpuriHero: { type: Boolean, default: false },
    targetCategory: { 
        type: String, 
        enum: ['Darmaa', 'Bhojpuri', 'Both'], 
        default: 'Darmaa' 
    },
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

quickByteSchema.index({ status: 1 });
quickByteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('QuickByte', quickByteSchema);
