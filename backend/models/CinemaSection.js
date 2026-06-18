const mongoose = require('mongoose');

const cinemaSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  videos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
  }],
}, {
  timestamps: true,
});

const CinemaSection = mongoose.model('CinemaSection', cinemaSectionSchema);

module.exports = CinemaSection;
