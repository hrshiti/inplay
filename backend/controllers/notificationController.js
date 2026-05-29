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

    // 1. Create notification history record first to get _id
    const notification = await Notification.create({
      title,
      body,
      imageUrl,
      target: 'all',
      status: 'sent'
    });

    // 2. Inject notificationId into payload redirect link
    const finalData = data || {};
    const originalLink = finalData.link || '/';
    const linkWithParam = originalLink.includes('?') 
      ? `${originalLink}&notificationId=${notification._id}`
      : `${originalLink}?notificationId=${notification._id}`;

    const enrichedPayload = {
      title,
      body,
      imageUrl,
      data: { ...finalData, link: linkWithParam, notificationId: notification._id.toString() }
    };

    // 3. Broadcast to all users and get target recipient user IDs
    const userIds = await notifyAllUsers(enrichedPayload);

    // 4. Update the recipients list in DB
    if (userIds && userIds.length > 0) {
      notification.recipients = userIds.map(id => ({ user: id, seen: false }));
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification request processed for all users',
      notificationId: notification._id
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

    // 1. Create notification history record first
    const notification = await Notification.create({
      title,
      body,
      imageUrl,
      target: 'subscribed',
      status: 'sent'
    });

    // 2. Inject notificationId into payload redirect link
    const finalData = data || {};
    const originalLink = finalData.link || '/';
    const linkWithParam = originalLink.includes('?') 
      ? `${originalLink}&notificationId=${notification._id}`
      : `${originalLink}?notificationId=${notification._id}`;

    const enrichedPayload = {
      title,
      body,
      imageUrl,
      data: { ...finalData, link: linkWithParam, notificationId: notification._id.toString() }
    };

    // 3. Broadcast and get target user IDs
    const userIds = await notifySubscribedUsers(enrichedPayload);

    // 4. Update recipients
    if (userIds && userIds.length > 0) {
      notification.recipients = userIds.map(id => ({ user: id, seen: false }));
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification request processed for subscribed users',
      notificationId: notification._id
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

    // 1. Create notification history record
    const notification = await Notification.create({
      title,
      body,
      imageUrl,
      target: 'user',
      recipientId: userId,
      status: 'pending'
    });

    // 2. Inject notificationId into payload redirect link
    const finalData = data || {};
    const originalLink = finalData.link || '/';
    const linkWithParam = originalLink.includes('?') 
      ? `${originalLink}&notificationId=${notification._id}`
      : `${originalLink}?notificationId=${notification._id}`;

    const enrichedPayload = {
      title,
      body,
      imageUrl,
      data: { ...finalData, link: linkWithParam, notificationId: notification._id.toString() }
    };

    // 3. Send notification
    const response = await notifySpecificUser(userId, enrichedPayload);

    // 4. Update status and recipients
    notification.status = response ? 'sent' : 'failed';
    notification.error = response ? null : 'User has no registered devices';
    if (response) {
      notification.recipients = [{ user: userId, seen: false }];
    }
    await notification.save();

    res.status(200).json({
      success: true,
      message: response ? 'Notification sent successfully' : 'User has no registered devices',
      data: response,
      notificationId: notification._id
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get notification history with quick summary counters
// @route   GET /api/admin/notifications
// @access  Private/Admin
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('recipientId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedNotifications = notifications.map(item => {
      const sentCount = item.recipients?.length || 0;
      const seenCount = item.recipients?.filter(r => r.seen).length || 0;
      const unseenCount = sentCount - seenCount;

      return {
        _id: item._id,
        title: item.title,
        body: item.body,
        imageUrl: item.imageUrl,
        target: item.target,
        recipientId: item.recipientId,
        status: item.status,
        sentAt: item.sentAt,
        createdAt: item.createdAt,
        error: item.error,
        sentCount,
        seenCount,
        unseenCount
      };
    });

    res.status(200).json({
      success: true,
      data: formattedNotifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as seen by user
// @route   POST /api/user/notifications/:id/seen
// @access  Private
const markNotificationAsSeen = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    console.log(`🔔 [Backend] markNotificationAsSeen: NotificationID=${notificationId}, UserID=${userId}`);

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      console.warn(`🔔 [Backend] markNotificationAsSeen: Notification ${notificationId} not found`);
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Find the recipient entry for this user safely
    let recipient = notification.recipients.find(
      r => r.user && r.user.toString() === userId.toString()
    );

    if (recipient) {
      if (!recipient.seen) {
        recipient.seen = true;
        recipient.seenAt = new Date();
        await notification.save();
        console.log(`🔔 [Backend] markNotificationAsSeen: Updated existing recipient.seen to true for User ${userId}`);
      } else {
        console.log(`🔔 [Backend] markNotificationAsSeen: Recipient.seen was already true for User ${userId}`);
      }
    } else {
      // If user was not originally in the list, add them as seen to keep stats accurate
      notification.recipients.push({
        user: userId,
        seen: true,
        seenAt: new Date()
      });
      await notification.save();
      console.log(`🔔 [Backend] markNotificationAsSeen: User ${userId} was not in recipients, pushed new seen recipient entry`);
    }

    res.status(200).json({ success: true, message: 'Notification marked as seen' });
  } catch (error) {
    console.error('🔔 [Backend] markNotificationAsSeen error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get notification recipient details (Seen vs Unseen Lists)
// @route   GET /api/admin/notifications/:id/recipients
// @access  Private/Admin
const getNotificationRecipients = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('recipients.user', 'name email phone');

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const seenUsers = notification.recipients
      .filter(r => r.seen && r.user)
      .map(r => ({
        _id: r.user._id,
        name: r.user.name,
        email: r.user.email,
        phone: r.user.phone || 'N/A',
        seenAt: r.seenAt
      }));

    const unseenUsers = notification.recipients
      .filter(r => !r.seen && r.user)
      .map(r => ({
        _id: r.user._id,
        name: r.user.name,
        email: r.user.email,
        phone: r.user.phone || 'N/A'
      }));

    res.status(200).json({
      success: true,
      data: {
        title: notification.title,
        body: notification.body,
        target: notification.target,
        sentAt: notification.sentAt,
        sentCount: notification.recipients.length,
        seenCount: seenUsers.length,
        unseenCount: unseenUsers.length,
        seenUsers,
        unseenUsers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendToAll,
  sendToSubscribed,
  sendToUser,
  getNotifications,
  markNotificationAsSeen,
  getNotificationRecipients
};
