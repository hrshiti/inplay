const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  type: {
    type: String,
    required: false
  },
  dynamicTabs: [{
    type: String
  }],
  dynamicTabId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tab'
  },
  dynamicCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  category: {
    type: String,
    default: 'General'
  },
  genre: [{
    type: String,
    required: [true, 'Please add at least one genre']
  }],
  language: {
    type: String,
    default: 'none'
  },
  // Media files
  poster: {
    public_id: String,
    url: String,
    secure_url: String
  },
  backdrop: {
    public_id: String,
    url: String,
    secure_url: String
  },
  video: {
    public_id: String,
    url: String,
    secure_url: String,
    hls_url: String, // HLS streaming URL
    duration: Number, // in seconds
    size: Number // in bytes
  },
  trailer: {
    public_id: String,
    url: String,
    secure_url: String,
    duration: Number
  },
  // Content details
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  year: {
    type: Number,
    required: [true, 'Please add release year']
  },
  director: [String],
  cast: {
    type: String, // Changed to String to match frontend input
    default: ''
  },
  producer: {
    type: String,
    default: ''
  },
  production: {
    type: String,
    default: ''
  },
  releaseDate: {
    type: Date,
    default: null
  },
  // Series specific fields
  seasons: [{
    seasonNumber: {
      type: Number,
      required: true
    },
    title: String,
    description: String,
    episodes: [{
      episodeNumber: Number,
      title: String,
      description: String,
      duration: Number,
      video: {
        public_id: String,
        url: String,
        secure_url: String,
        hls_url: String
      }
    }]
  }],
  totalSeasons: {
    type: Number,
    default: 0
  },
  totalEpisodes: {
    type: Number,
    default: 0
  },
  // Monetization
  isPaid: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  // Content status
  status: {
    type: String,
    enum: ['draft', 'published', 'unpublished', 'archived'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  // Special categories
  isPopular: {
    type: Boolean,
    default: false
  },
  isNewAndHot: {
    type: Boolean,
    default: false
  },
  isOriginal: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  isRanking: {
    type: Boolean,
    default: false
  },
  isMovie: {
    type: Boolean,
    default: false
  },
  isTV: {
    type: Boolean,
    default: false
  },
  isBroadcast: {
    type: Boolean,
    default: false
  },
  isMms: {
    type: Boolean,
    default: false
  },
  isShortFilm: {
    type: Boolean,
    default: false
  },
  isAudioSeries: {
    type: Boolean,
    default: false
  },
  isCrimeShow: {
    type: Boolean,
    default: false
  },
  // Tags and keywords
  tags: [String],
  keywords: [String],
  // Content creator/admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
contentSchema.index({ title: 'text', description: 'text' }, { language_override: 'dummy_lang_field' });
contentSchema.index({ type: 1, status: 1 });
contentSchema.index({ genre: 1 });
contentSchema.index({ category: 1 });
contentSchema.index({ isPaid: 1 });
contentSchema.index({ views: -1 });
contentSchema.index({ createdAt: -1 });

// Virtual for total duration (for series)
contentSchema.virtual('totalDuration').get(function () {
  if (this.type === 'movie' || this.type === 'action' || this.type === 'bhojpuri' || this.type === 'new_release' || this.type === 'trending_song' || this.type === 'trending_now') {
    return this.video?.duration || 0;
  }

  if (this.type === 'series' || this.type === 'hindi_series') {
    return this.seasons.reduce((total, season) => {
      return total + season.episodes.reduce((seasonTotal, episode) => {
        return seasonTotal + (episode.duration || 0);
      }, 0);
    }, 0);
  }

  return this.video?.duration || 0;
});

// Virtual for formatted duration
contentSchema.virtual('formattedDuration').get(function () {
  const duration = this.totalDuration;
  if (!duration) return 'N/A';

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Pre-save middleware to calculate totals for series
contentSchema.pre('save', function (next) {
  if ((this.type === 'series' || this.type === 'hindi_series') && this.seasons) {
    this.totalSeasons = this.seasons.length;
    this.totalEpisodes = this.seasons.reduce((total, season) => {
      return total + (season.episodes ? season.episodes.length : 0);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('Content', contentSchema);
