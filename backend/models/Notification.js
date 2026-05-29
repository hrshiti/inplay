const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String
  },
  target: {
    type: String,
    enum: ['all', 'subscribed', 'user'],
    default: 'all'
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recipients: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    seen: {
      type: Boolean,
      default: false
    },
    seenAt: {
      type: Date
    }
  }],
  status: {
    type: String,
    enum: ['sent', 'failed'],
    default: 'sent'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
