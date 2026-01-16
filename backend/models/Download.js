const mongoose = require('mongoose');
const crypto = require('crypto');

const downloadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  // Download license
  licenseKey: {
    type: String,
    unique: true,
    required: true
  },
  // Device information
  deviceId: {
    type: String,
    required: true
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    ipAddress: String
  },
  // Download details
  downloadedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  lastAccessedAt: Date,
  accessCount: {
    type: Number,
    default: 0
  },
  // Security
  isActive: {
    type: Boolean,
    default: true
  },
  revokedAt: Date,
  revokeReason: String,
  // Content information (snapshot at download time)
  contentSnapshot: {
    title: String,
    type: String,
    duration: Number,
    videoUrl: String,
    posterUrl: String
  },
  // Download settings
  quality: {
    type: String,
    enum: ['SD', 'HD', '4K'],
    default: 'HD'
  },
  format: {
    type: String,
    enum: ['mp4', 'webm'],
    default: 'mp4'
  }
}, {
  timestamps: true
});

// Indexes for performance (licenseKey index is already created by unique: true)
downloadSchema.index({ user: 1, content: 1 });
downloadSchema.index({ expiresAt: 1 });
downloadSchema.index({ deviceId: 1 });
downloadSchema.index({ isActive: 1 });

// Generate license key before saving
downloadSchema.pre('save', function(next) {
  if (!this.licenseKey) {
    // Generate a secure license key
    this.licenseKey = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Virtual for isExpired
downloadSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date() || !this.isActive;
});

// Virtual for days remaining
downloadSchema.virtual('daysRemaining').get(function() {
  if (this.isExpired) return 0;
  const now = new Date();
  const diffTime = this.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to revoke download
downloadSchema.methods.revoke = function(reason = 'User revoked') {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokeReason = reason;
  return this.save();
};

// Method to extend expiry
downloadSchema.methods.extendExpiry = function(days) {
  const newExpiry = new Date(this.expiresAt);
  newExpiry.setDate(newExpiry.getDate() + days);
  this.expiresAt = newExpiry;
  return this.save();
};

// Static method to clean expired downloads
downloadSchema.statics.cleanExpired = function() {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      isActive: true
    },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'Expired'
      }
    }
  );
};

// Static method to get user's active downloads
downloadSchema.statics.getUserActiveDownloads = function(userId) {
  return this.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('content', 'title type poster duration');
};

module.exports = mongoose.model('Download', downloadSchema);
