const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['subscription', 'content_purchase'],
    required: true
  },
  // For subscription payments
  subscriptionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan'
  },
  // For content purchases
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  // Razorpay details
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: String,
  razorpaySignature: String,
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi'],
    default: 'card'
  },
  // Subscription details (if applicable)
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  // Refund details
  refundAmount: Number,
  refundReason: String,
  refundProcessedAt: Date,
  // Metadata
  metadata: {
    type: Map,
    of: String
  },
  // Payment gateway response
  gatewayResponse: mongoose.Schema.Types.Mixed,
  isMock: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function () {
  return `${this.currency} ${this.amount}`;
});

// Virtual for payment status text
paymentSchema.virtual('statusText').get(function () {
  switch (this.status) {
    case 'pending': return 'Payment Pending';
    case 'completed': return 'Payment Completed';
    case 'failed': return 'Payment Failed';
    case 'refunded': return 'Payment Refunded';
    default: return 'Unknown';
  }
});

// Static method to get user's payment history
paymentSchema.statics.getUserPaymentHistory = function (userId, limit = 10) {
  return this.find({ user: userId })
    .populate('subscriptionPlan', 'name price')
    .populate('content', 'title type')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get revenue stats
paymentSchema.statics.getRevenueStats = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        subscriptionRevenue: {
          $sum: { $cond: [{ $eq: ['$type', 'subscription'] }, '$amount', 0] }
        },
        contentRevenue: {
          $sum: { $cond: [{ $eq: ['$type', 'content_purchase'] }, '$amount', 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);
