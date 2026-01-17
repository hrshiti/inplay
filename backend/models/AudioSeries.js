const mongoose = require('mongoose');

const audioEpisodeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add an episode title'],
        trim: true
    },
    audioUrl: {
        type: String,
        required: [true, 'Please add audio file URL']
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    episodeNumber: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    isFree: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const audioSeriesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a series title'],
        unique: true,
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [2000, 'Description cannot be more than 2000 characters']
    },
    coverImage: {
        type: String,
        required: [true, 'Please add a cover image']
    },
    genre: {
        type: String,
        default: 'Podcast'
    },
    episodes: [audioEpisodeSchema],
    totalViews: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('AudioSeries', audioSeriesSchema);
