const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  category: { 
    type: String, 
    required: true, 
    enum: ['drama', 'cinema', 'bhojpuri'], 
    index: true 
  },
  mediaType: { 
    type: String, 
    required: true, 
    enum: ['image', 'video'] 
  },
  mediaUrl: { 
    type: String, 
    required: true 
  },
  hlsUrl: {
    type: String, // Only populated for video banners
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    default: null
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  order: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Banner', bannerSchema);
