const mongoose = require('mongoose');

const customerSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  razorpaySubscriptionId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['created', 'authenticated', 'active', 'pending', 'expired', 'cancelled'],
    default: 'created'
  },
  price: {
    type: Number,
    required: true
  },
  shortUrl: {
    type: String
  },
  rawRazorpayData: {
    type: Object
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isAutoTransition: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('CustomerSubscription', customerSubscriptionSchema);
