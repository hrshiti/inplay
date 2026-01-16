const mongoose = require('mongoose');

const forYouSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    video: {
        public_id: String,
        url: String,
        secure_url: String,
        duration: Number
    },
    thumbnail: {
        public_id: String,
        url: String,
        secure_url: String
    },
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

module.exports = mongoose.model('ForYou', forYouSchema);
