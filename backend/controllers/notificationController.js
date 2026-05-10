const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Send notification to all users
// @route   POST /api/admin/notifications/send-all
// @access  Private/Admin
exports.sendToAll = async (req, res) => {
  try {
    const { title, body, imageUrl } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both title and body'
      });
    }

    // Create notification record
    const notification = await Notification.create({
      title,
      body,
      imageUrl,
      target: 'all',
      status: 'sent'
    });

    // Broadcast via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.emit('new_notification', {
        title,
        body,
        imageUrl,
        sentAt: notification.sentAt
      });
    }

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error sending notification to all:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Send notification to subscribed users only
// @route   POST /api/admin/notifications/send-subscribed
// @access  Private/Admin
exports.sendToSubscribed = async (req, res) => {
  try {
    const { title, body, imageUrl } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both title and body'
      });
    }

    // Create notification record
    const notification = await Notification.create({
      title,
      body,
      imageUrl,
      target: 'subscribed',
      status: 'sent'
    });

    // Broadcast via Socket.io to a specific room if needed, or filter on client
    // For now, we'll just emit and let clients handle if they should show it
    // In a real app, you'd use FCM or check subscription status
    const io = req.app.get('io');
    if (io) {
      io.emit('new_notification', {
        title,
        body,
        imageUrl,
        target: 'subscribed',
        sentAt: notification.sentAt
      });
    }

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error sending notification to subscribed:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Send notification to a specific user
// @route   POST /api/admin/notifications/send-user
// @access  Private/Admin
exports.sendToUser = async (req, res) => {
  try {
    const { userId, title, body, imageUrl } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId, title and body'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create notification record
    const notification = await Notification.create({
      title,
      body,
      imageUrl,
      target: 'user',
      recipientId: userId,
      status: 'sent'
    });

    // In a real app, you'd send via FCM to this user's token
    // For Socket.io, you could emit to a room specific to this user
    const io = req.app.get('io');
    if (io) {
      // Assuming users join a room with their ID
      io.to(userId.toString()).emit('new_notification', {
        title,
        body,
        imageUrl,
        sentAt: notification.sentAt
      });
    }

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error sending notification to user:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get notification history
// @route   GET /api/admin/notifications
// @access  Private/Admin
exports.getNotificationHistory = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
