const crypto = require('crypto');
const Download = require('../models/Download');
const Content = require('../models/Content');
const User = require('../models/User');
const { generateSignedUrl } = require('../config/cloudinary');
const { DOWNLOAD_EXPIRY_DAYS } = require('../constants');

// Generate secure download license for content
const generateDownloadLicense = async (contentId, userId, deviceId) => {
  // Verify user access to content
  const accessCheck = await checkDownloadAccess(contentId, userId);
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
      videoUrl: content.video.secure_url,
      posterUrl: content.poster?.secure_url
    }
  });

  // Generate time-limited download URL (24 hours to start download)
  const downloadUrl = generateSignedUrl(content.video.public_id, {
    expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
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

// Check if user has access to download content
const checkDownloadAccess = async (contentId, userId) => {
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

  // Free content cannot be downloaded (only streamed)
  if (!content.isPaid) {
    return { hasAccess: false, message: 'Free content cannot be downloaded' };
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
    message: 'Content requires payment or active subscription for download',
    accessType: 'payment_required'
  };
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
