const Content = require('../models/Content');
const User = require('../models/User');
const { generateHLSUrl, generateSignedUrl } = require('../config/cloudinary');
const { STREAM_EXPIRY_MINUTES } = require('../constants');

// Generate secure streaming URL for content
const generateStreamingUrl = async (contentId, userId, quality = 'HD') => {
  // Verify user access
  const accessCheck = await checkUserAccess(contentId, userId);
  if (!accessCheck.hasAccess) {
    throw new Error(accessCheck.message || 'Access denied');
  }

  const content = await Content.findById(contentId);
  if (!content || !content.video?.public_id) {
    throw new Error('Content not available for streaming');
  }

  // Generate time-limited HLS streaming URL
  const expiryMinutes = STREAM_EXPIRY_MINUTES;
  const expiryTime = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

  const backendUrl = process.env.BACKEND_URL;
  const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

  let streamUrl;
  if (content.video.url && content.video.url.startsWith('/')) {
    streamUrl = `${backendUrl}${content.video.url}`;
  } else {
    streamUrl = generateHLSUrl(content.video.public_id);
  }

  // Update view count (only count unique views per user per content)
  await updateViewCount(contentId, userId);

  return {
    streamUrl,
    content: {
      id: content._id,
      title: content.title,
      type: content.type,
      duration: content.video.duration,
      poster: getFullUrl(content.poster?.secure_url),
      backdrop: getFullUrl(content.backdrop?.secure_url)
    },
    expiresIn: expiryMinutes * 60, // seconds
    accessType: accessCheck.accessType
  };
};

// Check if user has access to stream content
const checkUserAccess = async (contentId, userId) => {
  const content = await Content.findById(contentId);
  if (!content) {
    return { hasAccess: false, message: 'Content not found' };
  }

  // Check if content is published
  if (content.status !== 'published') {
    return { hasAccess: false, message: 'Content not available' };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { hasAccess: false, message: 'User not authenticated' };
  }

  // Free content is always accessible
  if (!content.isPaid) {
    return { hasAccess: true, accessType: 'free' };
  }

  // Check if user has active subscription
  const now = new Date();
  if (user.subscription?.isActive && user.subscription.endDate > now) {
    return { hasAccess: true, accessType: 'subscription' };
  }

  // Check if user purchased this content
  const Payment = require('../models/Payment');
  const purchase = await Payment.findOne({
    user: userId,
    content: contentId,
    status: 'completed',
    type: 'content_purchase'
  });

  if (purchase) {
    return { hasAccess: true, accessType: 'purchased' };
  }

  return {
    hasAccess: false,
    message: 'Content requires payment or active subscription',
    accessType: 'payment_required'
  };
};

// Update view count (prevent duplicate views from same user)
const updateViewCount = async (contentId, userId) => {
  // Check if user already viewed this content recently (within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentView = await require('../models/User').findOne({
    _id: userId,
    'watchHistory.content': contentId,
    'watchHistory.watchedAt': { $gte: oneHourAgo }
  });

  // Only increment view count if no recent view from this user
  if (!recentView) {
    await Content.findByIdAndUpdate(contentId, {
      $inc: { views: 1 }
    });
  }
};

// Get streaming info for content (without generating URL)
const getStreamingInfo = async (contentId, userId) => {
  const accessCheck = await checkUserAccess(contentId, userId);

  if (!accessCheck.hasAccess) {
    return {
      canStream: false,
      message: accessCheck.message,
      accessType: accessCheck.accessType
    };
  }

  const content = await Content.findById(contentId).select('title type video poster backdrop');

  const backendUrl = process.env.BACKEND_URL;
  const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

  return {
    canStream: true,
    content: {
      id: content._id,
      title: content.title,
      type: content.type,
      duration: content.video?.duration,
      poster: getFullUrl(content.poster?.secure_url),
      backdrop: getFullUrl(content.backdrop?.secure_url),
      hasVideo: !!content.video?.public_id
    },
    accessType: accessCheck.accessType
  };
};

// Validate streaming session (for future use with DRM)
const validateStreamingSession = async (contentId, userId, sessionToken) => {
  // Basic validation - can be extended with more sophisticated DRM
  const accessCheck = await checkUserAccess(contentId, userId);

  return {
    isValid: accessCheck.hasAccess,
    sessionToken: sessionToken,
    expiresAt: new Date(Date.now() + STREAM_EXPIRY_MINUTES * 60 * 1000)
  };
};

// Get content playback progress for user
const getPlaybackProgress = async (userId, contentId) => {
  const user = await User.findOne(
    { _id: userId, 'watchHistory.content': contentId },
    { 'watchHistory.$': 1 }
  );

  if (!user || !user.watchHistory[0]) {
    return { progress: 0, completed: false };
  }

  const watchEntry = user.watchHistory[0];
  return {
    progress: watchEntry.progress || 0,
    completed: watchEntry.completed || false,
    watchedAt: watchEntry.watchedAt
  };
};

module.exports = {
  generateStreamingUrl,
  checkUserAccess,
  getStreamingInfo,
  validateStreamingSession,
  getPlaybackProgress
};
