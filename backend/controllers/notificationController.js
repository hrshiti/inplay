const { notifyAllUsers, notifySubscribedUsers, notifySpecificUser } = require('../utils/notificationHelper');
const Notification = require('../models/Notification');

// @desc    Send notification to all users
// @route   POST /api/admin/notifications/send-all
// @access  Private/Admin
const sendToAll = async (req, res) => {
  try {
    const { title, body, imageUrl, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    await notifyAllUsers({ title, body, imageUrl, data });

    // Save to history
    await Notification.create({
      title,
      body,
      imageUrl,
      target: 'all'
    });

    res.status(200).json({
      success: true,
      message: 'Notification request processed for all users'
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send notification to subscribed users
// @route   POST /api/admin/notifications/send-subscribed
// @access  Private/Admin
const sendToSubscribed = async (req, res) => {
  try {
    const { title, body, imageUrl, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    await notifySubscribedUsers({ title, body, imageUrl, data });

    // Save to history
    await Notification.create({
      title,
      body,
      imageUrl,
      target: 'subscribed'
    });

    res.status(200).json({
      success: true,
      message: 'Notification request processed for subscribed users'
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send notification to specific user
// @route   POST /api/admin/notifications/send-user
// @access  Private/Admin
const sendToUser = async (req, res) => {
  try {
    const { userId, title, body, imageUrl, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ success: false, message: 'UserId, title and body are required' });
    }

    const response = await notifySpecificUser(userId, { title, body, imageUrl, data });

    // Save to history
    await Notification.create({
      title,
      body,
      imageUrl,
      target: 'user',
      recipientId: userId,
      status: response ? 'sent' : 'failed',
      error: response ? null : 'User has no registered devices'
    });

    res.status(200).json({
      success: true,
      message: response ? 'Notification sent successfully' : 'User has no registered devices',
      data: response
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get notification history
// @route   GET /api/admin/notifications
// @access  Private/Admin
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('recipientId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendToAll,
  sendToSubscribed,
  sendToUser,
  getNotifications
};
