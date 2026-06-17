const mongoose = require('mongoose');

const bhojpuriSectionSchema = new mongoose.Schema({
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

const BhojpuriSection = mongoose.model('BhojpuriSection', bhojpuriSectionSchema);

module.exports = BhojpuriSection;
