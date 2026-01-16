const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [/^[6-9]\d{9}$/, 'Please add a valid Indian phone number']
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  subscription: {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      default: null
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    },
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  watchHistory: [{
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    watchedAt: {
      type: Date,
      default: Date.now
    },
    watchedSeconds: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  myList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
  likedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
  preferences: {
    favoriteGenres: [String],
    language: {
      type: String,
      default: 'en'
    },
    playbackQuality: {
      type: String,
      enum: ['low', 'medium', 'high', 'ultra'],
      default: 'high'
    },
    notifications: {
      newReleases: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      updates: { type: Boolean, default: true }
    }
  },
  downloads: [{
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    licenseKey: {
      type: String,
      unique: true,
      sparse: true
    },
    deviceId: String
  }],
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance (email index is already created by unique: true)
userSchema.index({ role: 1 });
userSchema.index({ 'subscription.endDate': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for subscription status
userSchema.virtual('subscriptionStatus').get(function () {
  if (!this.subscription.isActive) return 'inactive';
  if (this.subscription.endDate < new Date()) return 'expired';
  return 'active';
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove expired downloads
userSchema.methods.cleanExpiredDownloads = function () {
  this.downloads = this.downloads.filter(download =>
    download.expiresAt > new Date()
  );
};

module.exports = mongoose.model('User', userSchema);
