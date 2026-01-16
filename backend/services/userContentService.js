const Content = require('../models/Content');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { generateSignedUrl, generateHLSUrl } = require('../config/cloudinary');
const { DOWNLOAD_EXPIRY_DAYS } = require('../constants');

// Get content for users (with access control)
const getContentForUsers = async (filters = {}, page = 1, limit = 10, userId = null) => {
  const query = { status: 'published' };

  // Apply filters
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.genre && filters.genre.length > 0) {
    query.genre = { $in: filters.genre };
  }
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  const content = await Content.find(query)
    .select('-createdBy -updatedBy') // Exclude admin fields
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Content.countDocuments(query);

  // Check user's access to each content
  let processedContent = content;
  if (userId) {
    processedContent = await Promise.all(
      content.map(async (item) => {
        const accessInfo = await checkUserContentAccess(userId, item._id);
        return {
          ...item.toObject(),
          hasAccess: accessInfo.hasAccess,
          accessType: accessInfo.accessType
        };
      })
    );
  }

  return {
    content: processedContent,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Get single content with access control
const getContentById = async (contentId, userId = null) => {
  const content = await Content.findOne({
    _id: contentId,
    status: 'published'
  }).select('-createdBy -updatedBy');

  if (!content) {
    throw new Error('Content not found or not available');
  }

  let accessInfo = { hasAccess: !content.isPaid, accessType: 'free' };

  if (userId && content.isPaid) {
    accessInfo = await checkUserContentAccess(userId, contentId);
  }

  return {
    ...content.toObject(),
    hasAccess: accessInfo.hasAccess,
    accessType: accessInfo.accessType
  };
};

// Check if user has access to content
const checkUserContentAccess = async (userId, contentId) => {
  const content = await Content.findById(contentId);
  if (!content) {
    return { hasAccess: false, accessType: 'not_found' };
  }

  // Free content is always accessible
  if (!content.isPaid) {
    return { hasAccess: true, accessType: 'free' };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { hasAccess: false, accessType: 'not_logged_in' };
  }

  // Check if user has active subscription
  const now = new Date();
  if (user.subscription?.isActive && user.subscription.endDate > now) {
    return { hasAccess: true, accessType: 'subscription' };
  }

  // Check if user purchased this content
  const purchase = await Payment.findOne({
    user: userId,
    content: contentId,
    status: 'completed',
    type: 'content_purchase'
  });

  if (purchase) {
    return { hasAccess: true, accessType: 'purchased' };
  }

  return { hasAccess: false, accessType: 'payment_required' };
};

// Generate streaming URL for content
const generateStreamingUrl = async (contentId, userId, quality = 'HD') => {
  // Check access first
  const accessInfo = await checkUserContentAccess(userId, contentId);

  if (!accessInfo.hasAccess) {
    throw new Error('Access denied. Please purchase content or subscribe.');
  }

  const content = await Content.findById(contentId);
  if (!content || !content.video?.public_id) {
    throw new Error('Content not found or not available for streaming');
  }

  // Generate signed HLS URL
  const streamUrl = generateHLSUrl(content.video.public_id);

  // Log streaming access for analytics
  await Content.findByIdAndUpdate(contentId, {
    $inc: { views: 1 }
  });

  return {
    streamUrl,
    content: {
      id: content._id,
      title: content.title,
      type: content.type,
      duration: content.video.duration
    }
  };
};

// Generate download license for content
const generateDownloadLicense = async (contentId, userId, deviceId) => {
  // Check access first
  const accessInfo = await checkUserContentAccess(userId, contentId);

  if (!accessInfo.hasAccess) {
    throw new Error('Access denied. Please purchase content or subscribe.');
  }

  const content = await Content.findById(contentId);
  if (!content || !content.video?.public_id) {
    throw new Error('Content not available for download');
  }

  // Check if user already has an active download for this content
  const existingDownload = await require('../models/Download').findOne({
    user: userId,
    content: contentId,
    deviceId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });

  if (existingDownload) {
    throw new Error('Download already exists for this device');
  }

  // Create download record
  const Download = require('../models/Download');
  const download = await Download.create({
    user: userId,
    content: contentId,
    deviceId,
    contentSnapshot: {
      title: content.title,
      type: content.type,
      duration: content.video.duration,
      videoUrl: content.video.secure_url,
      posterUrl: content.poster?.secure_url
    }
  });

  // Generate download URL (time-limited)
  const downloadUrl = generateSignedUrl(content.video.public_id, {
    expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours to download
    attachment: true,
    format: 'mp4'
  });

  // Increment download count
  await Content.findByIdAndUpdate(contentId, {
    $inc: { downloads: 1 }
  });

  return {
    licenseKey: download.licenseKey,
    downloadUrl,
    expiresAt: download.expiresAt,
    content: download.contentSnapshot
  };
};

// Validate download license
const validateDownloadLicense = async (licenseKey, deviceId) => {
  const Download = require('../models/Download');

  const download = await Download.findOne({
    licenseKey,
    deviceId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });

  if (!download) {
    throw new Error('Invalid or expired download license');
  }

  // Update last accessed
  download.lastAccessedAt = new Date();
  download.accessCount += 1;
  await download.save();

  return {
    isValid: true,
    content: download.contentSnapshot,
    expiresAt: download.expiresAt,
    accessCount: download.accessCount
  };
};

// Get user's my list
const getUserMyList = async (userId) => {
  const user = await User.findById(userId)
    .populate('myList', 'title poster type rating year genre video seasons')
    .select('myList');

  if (!user) {
    throw new Error('User not found');
  }

  return user.myList || [];
};

const mongoose = require('mongoose');

// Update watch history
const updateWatchHistory = async (userId, contentId, progress, completed = false, watchedSeconds = 0, totalDuration = 0) => {
  // Only track if it's a valid MongoDB ID (ignore mock data IDs like 1, 2, etc.)
  if (!mongoose.Types.ObjectId.isValid(contentId)) {
    return { message: 'Skipping mock content tracking' };
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Check if content exists in watch history
  const existingEntry = user.watchHistory.find(
    entry => entry.content && entry.content.toString() === contentId.toString()
  );

  if (existingEntry) {
    existingEntry.progress = progress;
    existingEntry.watchedSeconds = watchedSeconds;
    existingEntry.totalDuration = totalDuration;
    existingEntry.watchedAt = new Date();
    if (completed) existingEntry.completed = true;
    // Auto complete if progress is > 95%
    if (progress > 95) existingEntry.completed = true;
  } else {
    user.watchHistory.unshift({
      content: contentId,
      progress,
      watchedSeconds,
      totalDuration,
      completed: completed || (progress > 95),
      watchedAt: new Date()
    });
  }

  // Keep only last 100 entries
  if (user.watchHistory.length > 100) {
    user.watchHistory = user.watchHistory.slice(0, 100);
  }

  await user.save();

  return { message: 'Watch history updated', progress, completed };
};

// Get trending content
const getTrendingContent = async (limit = 10) => {
  const content = await Content.find({
    status: 'published',
    views: { $gt: 0 }
  })
    .select('title poster type views likes createdAt rating video seasons')
    .sort({ views: -1, likes: -1, createdAt: -1 })
    .limit(limit);

  return content;
};

// Get content by category
const getContentByCategory = async (category, limit = 20) => {
  const content = await Content.find({
    category,
    status: 'published'
  })
    .select('title poster type rating year genre video seasons')
    .sort({ createdAt: -1 })
    .limit(limit);

  return content;
};

module.exports = {
  getContentForUsers,
  getContentById,
  checkUserContentAccess,
  generateStreamingUrl,
  generateDownloadLicense,
  validateDownloadLicense,
  getUserMyList,
  updateWatchHistory,
  getTrendingContent,
  getContentByCategory
};
