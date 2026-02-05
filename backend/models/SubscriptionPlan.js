const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a plan name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR'
  },
  duration: {
    type: String,
    enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    default: 'monthly'
  },
  durationInDays: {
    type: Number,
    required: true // Calculated based on duration
  },
  features: [{
    type: String,
    required: true
  }],
  // Plan limits
  maxDevices: {
    type: Number,
    default: 1,
    min: 1
  },
  maxDownloads: {
    type: Number,
    default: 10,
    min: 0 // 0 = unlimited
  },
  videoQuality: {
    type: String,
    enum: ['SD', 'HD', '4K'],
    default: 'HD'
  },
  hasAds: {
    type: Boolean,
    default: false
  },
  canDownload: {
    type: Boolean,
    default: true
  },
  // Plan status
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  // Analytics
  subscriberCount: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  // Stripe/Razorpay plan ID for recurring payments
  razorpayPlanId: String,
  // Plan ordering
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
subscriptionPlanSchema.index({ isActive: 1 });
subscriptionPlanSchema.index({ displayOrder: 1 });

// Virtual for formatted price
subscriptionPlanSchema.virtual('formattedPrice').get(function () {
  return `${this.currency} ${this.price}`;
});

// Virtual for duration text
subscriptionPlanSchema.virtual('durationText').get(function () {
  switch (this.duration) {
    case 'monthly': return 'per month';
    case 'quarterly': return 'per 3 months';
    case 'half-yearly': return 'per 6 months';
    case 'yearly': return 'per year';
    default: return '';
  }
});

// Pre-save middleware to set durationInDays
subscriptionPlanSchema.pre('save', function (next) {
  switch (this.duration) {
    case 'monthly':
      this.durationInDays = 30;
      break;
    case 'quarterly':
      this.durationInDays = 90;
      break;
    case 'half-yearly':
      this.durationInDays = 180;
      break;
    case 'yearly':
      this.durationInDays = 365;
      break;
    default:
      this.durationInDays = 30;
  }
  next();
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
