const crypto = require('crypto');
const Download = require('../models/Download');
const Content = require('../models/Content');
const User = require('../models/User');
const { generateSignedUrl } = require('../config/cloudinary');
const { DOWNLOAD_EXPIRY_DAYS } = require('../constants');

// Generate secure download license for content
const generateDownloadLicense = async (contentId, userId, deviceId, episodeIndex = null) => {
  // Verify user access to content
  const accessCheck = await checkDownloadAccess(contentId, userId, episodeIndex);
  if (!accessCheck.hasAccess) {
    throw new Error(accessCheck.message || 'Access denied for download');
  }

  const content = await Content.findById(contentId);
  if (!content || !content.video?.public_id) {
    throw new Error('Content not available for download');
  }

  // Check if user already has an active download for this content on this device
  const existingDownload = await Download.findOne({
    user: userId,
    content: contentId,
    deviceId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });

  if (existingDownload) {
    throw new Error('Download already exists for this device. Use existing license.');
  }

  // Check device limit (max 3 devices per user per content)
  const userDownloads = await Download.countDocuments({
    user: userId,
    content: contentId,
    isActive: true
  });

  if (userDownloads >= 3) {
    throw new Error('Maximum download limit reached for this content (3 devices)');
  }

  // Generate unique license key
  const licenseKey = crypto.randomBytes(32).toString('hex');

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DOWNLOAD_EXPIRY_DAYS);

  // Create download record
  const backendUrl = process.env.BACKEND_URL;
  const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

  // Create download record
  const download = await Download.create({
    user: userId,
    content: contentId,
    licenseKey,
    deviceId,
    expiresAt,
    contentSnapshot: {
      title: content.title,
      type: content.type,
      duration: content.video.duration,
      videoUrl: getFullUrl(content.video.secure_url),
      posterUrl: getFullUrl(content.poster?.secure_url)
    }
  });

  // Generate time-limited download URL
  let downloadUrl;
  if (content.video.url && content.video.url.startsWith('/')) {
    // Local file
    downloadUrl = `${backendUrl}${content.video.url}`;
  } else {
    // Cloudinary file
    downloadUrl = generateSignedUrl(content.video.public_id, {
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      attachment: true,
      format: 'mp4'
    });
  }

  // Increment download count
  await Content.findByIdAndUpdate(contentId, {
    $inc: { downloads: 1 }
  });

  return {
    licenseKey: download.licenseKey,
    downloadUrl,
    expiresAt: download.expiresAt,
    deviceId,
    content: {
      title: content.title,
      type: content.type,
      duration: content.video.duration,
      size: content.video.size
    }
  };
};

// Validate download license
const validateDownloadLicense = async (licenseKey, deviceId) => {
  const download = await Download.findOne({
    licenseKey,
    deviceId,
    isActive: true
  }).populate('content', 'title type video poster');

  if (!download) {
    throw new Error('Invalid download license or device');
  }

  // Check if license has expired
  if (download.expiresAt < new Date()) {
    // Mark as inactive
    download.isActive = false;
    await download.save();
    throw new Error('Download license has expired');
  }

  // Check if user still has access to content
  const accessCheck = await checkDownloadAccess(download.content._id, download.user);
  if (!accessCheck.hasAccess) {
    // Revoke download
    download.isActive = false;
    download.revokedAt = new Date();
    download.revokeReason = 'Access revoked';
    await download.save();
    throw new Error('Download access has been revoked');
  }

  // Update access count and last accessed
  download.lastAccessedAt = new Date();
  download.accessCount += 1;
  await download.save();

  return {
    isValid: true,
    content: download.contentSnapshot,
    expiresAt: download.expiresAt,
    accessCount: download.accessCount,
    maxAccessCount: 1000, // Limit access count to prevent abuse
    download: {
      licenseKey: download.licenseKey,
      deviceId: download.deviceId,
      downloadedAt: download.downloadedAt
    }
  };
};

// Helper to check if a user has an active subscription
const checkIsSubscribed = async (userId) => {
  if (!userId) return false;
  try {
    const user = await User.findById(userId);
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'superadmin' || user.phone === '6268204871' || user.phone === '6268455485') {
      return true;
    }
    if (user.subscription && user.subscription.isActive) {
      if (!user.subscription.endDate || new Date(user.subscription.endDate) >= new Date()) {
        return true;
      }
    }
  } catch (err) {
    console.error(err);
  }
  return false;
};

// Check if user has access to download content
const checkDownloadAccess = async (contentId, userId, episodeIndex = null) => {
  const content = await Content.findById(contentId);
  if (!content) {
    return { hasAccess: false, message: 'Content not found' };
  }

  // Check if content is published
  if (content.status !== 'published') {
    return { hasAccess: false, message: 'Content not available' };
  }

  // Check if InPlay Drama category
  const isDarmaa = content.category && /inplay\s*dhar?maa?/i.test(content.category);
  if (isDarmaa) {
    const isSubscribed = await checkIsSubscribed(userId);
    if (!isSubscribed) {
      const user = await User.findById(userId);
      const freeEpisodesWatched = user?.freeEpisodesWatched || [];
      const reqEpIdx = episodeIndex !== null ? parseInt(episodeIndex, 10) : 0;

      // Check if this specific episode is already watched
      const isAlreadyWatched = freeEpisodesWatched.some(
        item => item.contentId.toString() === contentId.toString() && item.episodeIndex === reqEpIdx
      );

      if (!isAlreadyWatched) {
        const remainingPasses = Math.max(0, 5 - freeEpisodesWatched.length);
        if (remainingPasses <= 0) {
          return { hasAccess: false, message: 'An active subscription is required to download this episode.' };
        }
      }
    }
  }

  // All content is now free and downloadable by authenticated users
  return { hasAccess: true, accessType: 'free' };
};

// Get user's active downloads
const getUserDownloads = async (userId) => {
  const downloads = await Download.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
    .populate('content', 'title type poster')
    .select('licenseKey deviceId downloadedAt expiresAt accessCount contentSnapshot')
    .sort({ downloadedAt: -1 });

  return downloads.map(download => ({
    licenseKey: download.licenseKey,
    deviceId: download.deviceId,
    downloadedAt: download.downloadedAt,
    expiresAt: download.expiresAt,
    accessCount: download.accessCount,
    content: download.contentSnapshot,
    daysRemaining: Math.ceil((download.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
  }));
};

// Revoke download license
const revokeDownloadLicense = async (licenseKey, userId, reason = 'User requested') => {
  const download = await Download.findOne({
    licenseKey,
    user: userId
  });

  if (!download) {
    throw new Error('Download license not found');
  }

  download.isActive = false;
  download.revokedAt = new Date();
  download.revokeReason = reason;
  await download.save();

  return { message: 'Download license revoked successfully' };
};

// Extend download expiry
const extendDownloadExpiry = async (licenseKey, userId, additionalDays = 7) => {
  const download = await Download.findOne({
    licenseKey,
    user: userId,
    isActive: true
  });

  if (!download) {
    throw new Error('Active download license not found');
  }

  const newExpiry = new Date(download.expiresAt);
  newExpiry.setDate(newExpiry.getDate() + additionalDays);

  download.expiresAt = newExpiry;
  await download.save();

  return {
    message: 'Download expiry extended successfully',
    newExpiry: download.expiresAt
  };
};

// Clean expired downloads (maintenance function)
const cleanExpiredDownloads = async () => {
  const result = await Download.updateMany(
    {
      expiresAt: { $lt: new Date() },
      isActive: true
    },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'Expired'
      }
    }
  );

  return { cleaned: result.modifiedCount };
};

module.exports = {
  generateDownloadLicense,
  validateDownloadLicense,
  checkDownloadAccess,
  getUserDownloads,
  revokeDownloadLicense,
  extendDownloadExpiry,
  cleanExpiredDownloads
};
