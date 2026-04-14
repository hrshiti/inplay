const mongoose = require('mongoose');

const customerTrialSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trialDaysCount: {
    type: Number,
    required: true,
    default: 4
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  trialPrice: {
    type: Number,
    required: true,
    default: 9
  },
  paymentStatus: {
    type: String,
    enum: ['Success', 'Pending', 'Failed'],
    default: 'Success'
  },
  razorpaySubscriptionId: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('CustomerTrial', customerTrialSchema, 'customertrialdays');
