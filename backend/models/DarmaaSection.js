const mongoose = require('mongoose');

const darmaaSectionSchema = new mongoose.Schema({
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
    ref: 'QuickByte',
  }],
}, {
  timestamps: true,
});

const DarmaaSection = mongoose.model('DarmaaSection', darmaaSectionSchema);

module.exports = DarmaaSection;
