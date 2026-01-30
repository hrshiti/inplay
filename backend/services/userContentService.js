const Content = require('../models/Content');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { generateSignedUrl, generateHLSUrl } = require('../config/cloudinary');
const { DOWNLOAD_EXPIRY_DAYS } = require('../constants');

// Import Audio Series model
const AudioSeries = require('../models/AudioSeries');

// Get content for users (with access control)
const getContentForUsers = async (filters = {}, page = 1, limit = 10, userId = null) => {
  const query = { status: 'published' };

  // Apply filters
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.genre && filters.genre.length > 0) {
    query.genre = { $in: filters.genre };
  }

  // Apply Dynamic Tab ID filter if present
  if (filters.dynamicTabId) {
    query.dynamicTabId = filters.dynamicTabId;
  }

  // Apply Dynamic Tabs (String) filter if present
  if (filters.dynamicTabs) {
    query.dynamicTabs = filters.dynamicTabs;
  }

  // Advanced Search Logic
  let audioSeriesResults = [];
  if (filters.search) {
    // Create a regex for case-insensitive partial matching
    const searchRegex = new RegExp(filters.search, 'i');

    // Update Content query to use $or with regex for better matching than $text
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { genre: searchRegex },
      { type: searchRegex }
    ];
    // Note: If using $text index previously, remove $text query if switch to regex. 
    // Regex is slower but more flexible for partial words like "act" -> "Action".
    delete query.$text;

    // Also search Audio Series if searching
    try {
      const audioQuery = {
        isActive: true,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { genre: searchRegex }
        ]
      };
      audioSeriesResults = await AudioSeries.find(audioQuery)
        .limit(limit)
        .select('title description coverImage genre episodes totalViews createdAt')
        .lean();

      // Format Audio Series to match Content structure for frontend consistency
      audioSeriesResults = audioSeriesResults.map(series => ({
        _id: series._id,
        title: series.title,
        description: series.description,
        image: series.coverImage, // structure mapping
        poster: { url: series.coverImage }, // structure mapping
        type: 'audio_series', // explicit type
        genre: series.genre,
        isAudioSeries: true,
        year: new Date(series.createdAt).getFullYear(),
        episodesCount: series.episodes?.length || 0
      }));
    } catch (err) {
      console.error("Audio Series search failed", err);
    }
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Fetch regular content
  const content = await Content.find(query)
    .select('-createdBy -updatedBy') // Exclude admin fields
    .sort({ createdAt: -1 })
    .skip(skip)
    // Reduce limit by number of audio results found to treat them as part of the page 
    // or just fetch full limit and merge (simpler for now)
    .limit(limit);

  const totalContent = await Content.countDocuments(query);
  const total = totalContent + audioSeriesResults.length;

  // Merge results: Audio Series first if relevant, or mixed? 
  // Let's prepend audio series results if any are found, assuming relevance.
  const combinedContent = [...audioSeriesResults, ...content];

  // Since we merged, we might exceed the limit technically if we found both. 
  // But for a simple search implementation, returning slightly more is often better UX than strict pagination logic hacking.
  // Ideally, valid pagination across two collections requires specific pipelines (aggregations).
  // For now, this satisfies the "show audio series if searched" requirement.

  // Check user's access to each content (only for standard content model)
  const processedContent = await Promise.all(
    combinedContent.map(async (item) => {
      // Skip access check for audio series or lightweight items if already processed
      if (item.isAudioSeries) return item;

      const accessInfo = await checkUserContentAccess(userId, item._id);
      return {
        ...item.toObject(),
        hasAccess: accessInfo.hasAccess,
        accessType: accessInfo.accessType
      };
    })
  );

  // Hydrate content before returning
  const hydratedContent = processedContent.map(item => hydrateContentItem(item));

  return {
    content: hydratedContent,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Helper to hydrate content items
const hydrateContentItem = (item) => {
  if (!item) return item;
  // Handle mongoose doc
  if (item.toObject) item = item.toObject();

  const backendUrl = process.env.BACKEND_URL;
  const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

  const hydrateMedia = (media) => {
    if (!media) return media;
    if (media.url) media.url = getFullUrl(media.url);
    if (media.secure_url) media.secure_url = getFullUrl(media.secure_url);
    return media;
  };

  if (item.poster) item.poster = hydrateMedia(item.poster);
  if (item.backdrop) item.backdrop = hydrateMedia(item.backdrop);
  if (item.video) item.video = hydrateMedia(item.video);
  if (item.trailer) item.trailer = hydrateMedia(item.trailer);
  if (item.thumbnail) item.thumbnail = hydrateMedia(item.thumbnail); // For quickbytes/reels
  if (item.image && typeof item.image === 'string' && item.image.startsWith('/')) item.image = getFullUrl(item.image);
  if (item.coverImage && item.coverImage.startsWith('/')) item.coverImage = getFullUrl(item.coverImage);

  if (item.seasons && Array.isArray(item.seasons)) {
    item.seasons.forEach(season => {
      if (season.episodes && Array.isArray(season.episodes)) {
        season.episodes.forEach(episode => {
          if (episode.video) episode.video = hydrateMedia(episode.video);
          if (episode.thumbnail) episode.thumbnail = hydrateMedia(episode.thumbnail);
        });
      }
    });
  }

  // Handle Audio Series structure if slightly different?
  // AudioSeries has 'episodes' with maybe 'audioUrl'.
  // But generic hydration of 'video'/'thumbnail' maps well.
  // If episodes have 'sourceUrl' or 'audio' object? 
  // Assuming consistent naming or relying on specific checks if needed.

  return item;
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

  const result = {
    ...content.toObject(),
    hasAccess: accessInfo.hasAccess,
    accessType: accessInfo.accessType
  };
  return hydrateContentItem(result);
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

  // Determine stream URL: Local files use direct URL, Cloudinary uses HLS generator
  let streamUrl;
  if (content.video.url && content.video.url.startsWith('/')) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    streamUrl = `${backendUrl}${content.video.url}`;
  } else {
    // Legacy Cloudinary or other external logic
    streamUrl = generateHLSUrl(content.video.public_id);
  }

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

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

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
      videoUrl: getFullUrl(content.video.secure_url),
      posterUrl: getFullUrl(content.poster?.secure_url)
    }
  });

  // Generate download URL
  let downloadUrl;
  if (content.video.url && content.video.url.startsWith('/')) {
    downloadUrl = `${backendUrl}${content.video.url}`;
  } else {
    downloadUrl = generateSignedUrl(content.video.public_id, {
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours to download
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

  const list = user.myList || [];
  return list.map(item => hydrateContentItem(item));
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

  return content.map(item => hydrateContentItem(item));
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

  return content.map(item => hydrateContentItem(item));
};

// Get new releases content
const getNewReleases = async (limit = 10) => {
  const content = await Content.find({
    status: 'published'
  })
    .select('title poster type rating year genre video seasons createdAt')
    .sort({ createdAt: -1 }) // Latest first
    .limit(limit);

  return content.map(item => hydrateContentItem(item));
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
  getNewReleases,
  getContentByCategory
};
