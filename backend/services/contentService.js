const Content = require('../models/Content');
const { deleteFile, getFilePathFromUrl } = require('../config/multerStorage');
const { CONTENT_STATUS, FILE_SIZE_LIMITS } = require('../constants');

// Get all content with filters and pagination
const getAllContent = async (filters = {}, page = 1, limit = 10) => {
  const query = {};

  // Apply filters
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.genre && filters.genre.length > 0) {
    query.genre = { $in: filters.genre };
  }
  if (filters.status) query.status = filters.status;
  if (filters.isPaid !== undefined) query.isPaid = filters.isPaid;
  if (filters.dynamicTabId) query.dynamicTabId = filters.dynamicTabId;
  if (filters.dynamicTabs) query.dynamicTabs = { $in: [filters.dynamicTabs] };
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  const content = await Content.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Content.countDocuments(query);

  // Hydrate URLs for frontend
  const hydratedContent = content.map(item => hydrateContent(item));

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

// Helper to hydrate relative URLs to absolute URLs
const hydrateContent = (contentData) => {
  if (!contentData) return contentData;
  // If it's a mongoose document, convert to object
  const content = contentData.toObject ? contentData.toObject() : contentData;

  const backendUrl = process.env.BACKEND_URL;
  const getFullUrl = (url) => url && url.startsWith('/') ? `${backendUrl}${url}` : url;

  const hydrateMedia = (media) => {
    if (!media) return media;
    if (media.url) media.url = getFullUrl(media.url);
    if (media.secure_url) media.secure_url = getFullUrl(media.secure_url);
    return media;
  };

  if (content.poster) content.poster = hydrateMedia(content.poster);
  if (content.backdrop) content.backdrop = hydrateMedia(content.backdrop);
  if (content.video) content.video = hydrateMedia(content.video);
  if (content.trailer) content.trailer = hydrateMedia(content.trailer);

  if (content.seasons && Array.isArray(content.seasons)) {
    content.seasons.forEach(season => {
      if (season.episodes && Array.isArray(season.episodes)) {
        season.episodes.forEach(episode => {
          if (episode.video) episode.video = hydrateMedia(episode.video);
          if (episode.thumbnail) episode.thumbnail = hydrateMedia(episode.thumbnail);
        });
      }
    });
  }
  return content;
};

// Get content by ID
const getContentById = async (contentId) => {
  const content = await Content.findById(contentId)
    .populate('createdBy', 'name email')
    .lean();

  if (!content) {
    throw new Error('Content not found');
  }

  return hydrateContent(content);
};

// Create new content
const createContent = async (contentData, adminId, files = {}) => {
  // NOTE: Files are already uploaded to disk by multer middleware
  // We just need to construct the media URLs from the uploaded files
  const { transformFileToResponse } = require('../config/multerStorage');
  const mediaUrls = {};

  try {
    // Transform uploaded poster
    if (files.poster) {
      if (files.poster.size > FILE_SIZE_LIMITS.POSTER) {
        throw new Error('Poster file size too large');
      }
      mediaUrls.poster = transformFileToResponse(files.poster);
    }

    // Transform uploaded backdrop
    if (files.backdrop) {
      if (files.backdrop.size > FILE_SIZE_LIMITS.BACKDROP) {
        throw new Error('Backdrop file size too large');
      }
      mediaUrls.backdrop = transformFileToResponse(files.backdrop);
    }

    // Transform uploaded video
    if (files.video) {
      if (files.video.size > FILE_SIZE_LIMITS.VIDEO) {
        throw new Error('Video file size too large');
      }
      mediaUrls.video = transformFileToResponse(files.video);
    }

    // Transform uploaded trailer
    if (files.trailer) {
      if (files.trailer.size > FILE_SIZE_LIMITS.TRAILER) {
        throw new Error('Trailer file size too large');
      }
      mediaUrls.trailer = transformFileToResponse(files.trailer);
    }

    // Process episode videos
    const fileKeys = Object.keys(files);
    for (const key of fileKeys) {
      const match = key.match(/^season_(\d+)_episode_(\d+)_video$/);
      if (match) {
        const seasonIndex = parseInt(match[1]);
        const episodeIndex = parseInt(match[2]);

        const videoFile = files[key];
        if (videoFile.size > FILE_SIZE_LIMITS.VIDEO) { // Use VIDEO limit for episodes too
          throw new Error(`Episode video (S${seasonIndex + 1}:E${episodeIndex + 1}) too large`);
        }

        const uploadResult = transformFileToResponse(videoFile);

        // Ensure season structure exists
        if (contentData.seasons && contentData.seasons[seasonIndex]) {
          if (!contentData.seasons[seasonIndex].episodes) {
            contentData.seasons[seasonIndex].episodes = [];
          }
          if (contentData.seasons[seasonIndex].episodes[episodeIndex]) {
            contentData.seasons[seasonIndex].episodes[episodeIndex].video = uploadResult;
          }
        }
      }
    }

    // Create content
    const content = await Content.create({
      ...contentData,
      ...mediaUrls,
      createdBy: adminId
    });

    return hydrateContent(content);
  } catch (error) {
    // Clean up uploaded files if content creation fails
    await cleanupUploadedFiles(mediaUrls);
    throw error;
  }
};

// Update content
const updateContent = async (contentId, updateData, adminId, files = {}) => {
  const content = await Content.findById(contentId);

  if (!content) {
    throw new Error('Content not found');
  }

  // Transform new media files
  const { transformFileToResponse } = require('../config/multerStorage');
  const mediaUrls = {};

  try {
    // Transform poster if provided
    if (files.poster) {
      if (files.poster.size > FILE_SIZE_LIMITS.POSTER) {
        throw new Error('Poster file size too large');
      }
      // Delete old poster from disk
      if (content.poster?.url) {
        const oldPath = getFilePathFromUrl(content.poster.url);
        deleteFile(oldPath);
      }
      mediaUrls.poster = transformFileToResponse(files.poster);
    }

    // Transform backdrop if provided
    if (files.backdrop) {
      if (files.backdrop.size > FILE_SIZE_LIMITS.BACKDROP) {
        throw new Error('Backdrop file size too large');
      }
      // Delete old backdrop from disk
      if (content.backdrop?.url) {
        const oldPath = getFilePathFromUrl(content.backdrop.url);
        deleteFile(oldPath);
      }
      mediaUrls.backdrop = transformFileToResponse(files.backdrop);
    }

    // Transform video if provided
    if (files.video) {
      if (files.video.size > FILE_SIZE_LIMITS.VIDEO) {
        throw new Error('Video file size too large');
      }
      // Delete old video from disk
      if (content.video?.url) {
        const oldPath = getFilePathFromUrl(content.video.url);
        deleteFile(oldPath);
      }
      mediaUrls.video = transformFileToResponse(files.video);
    }

    // Transform trailer if provided
    if (files.trailer) {
      if (files.trailer.size > FILE_SIZE_LIMITS.TRAILER) {
        throw new Error('Trailer file size too large');
      }
      // Delete old trailer from disk
      if (content.trailer?.url) {
        const oldPath = getFilePathFromUrl(content.trailer.url);
        deleteFile(oldPath);
      }
      mediaUrls.trailer = transformFileToResponse(files.trailer);
    }

    // Process episode videos
    const fileKeys = Object.keys(files);
    for (const key of fileKeys) {
      const match = key.match(/^season_(\d+)_episode_(\d+)_video$/);
      if (match) {
        const seasonIndex = parseInt(match[1]);
        const episodeIndex = parseInt(match[2]);

        const videoFile = files[key];
        if (videoFile.size > FILE_SIZE_LIMITS.VIDEO) {
          throw new Error(`Episode video (S${seasonIndex + 1}:E${episodeIndex + 1}) too large`);
        }

        // Transform episode video
        const uploadResult = transformFileToResponse(videoFile);

        if (updateData.seasons && updateData.seasons[seasonIndex]) {
          if (!updateData.seasons[seasonIndex].episodes) {
            updateData.seasons[seasonIndex].episodes = [];
          }
          if (updateData.seasons[seasonIndex].episodes[episodeIndex]) {
            updateData.seasons[seasonIndex].episodes[episodeIndex].video = uploadResult;
          }
        }
      }
    }

    // Update content
    Object.assign(content, updateData, mediaUrls);
    content.updatedBy = adminId;
    await content.save();

    return hydrateContent(content);
  } catch (error) {
    // Clean up newly uploaded files if update fails
    await cleanupUploadedFiles(mediaUrls);
    throw error;
  }
};

// Delete content
const deleteContent = async (contentId) => {
  const content = await Content.findById(contentId);

  if (!content) {
    throw new Error('Content not found');
  }

  // Delete media files from local disk
  try {
    if (content.poster?.url) {
      const path = getFilePathFromUrl(content.poster.url);
      deleteFile(path);
    }
    if (content.backdrop?.url) {
      const path = getFilePathFromUrl(content.backdrop.url);
      deleteFile(path);
    }
    if (content.video?.url) {
      const path = getFilePathFromUrl(content.video.url);
      deleteFile(path);
    }
    if (content.trailer?.url) {
      const path = getFilePathFromUrl(content.trailer.url);
      deleteFile(path);
    }
  } catch (error) {
    console.error('Error deleting media files:', error);
    // Continue with content deletion even if media cleanup fails
  }

  // Delete content from database
  await Content.findByIdAndDelete(contentId);

  return { message: 'Content deleted successfully' };
};

// Publish/Unpublish content
const toggleContentStatus = async (contentId, status) => {
  const content = await Content.findById(contentId);

  if (!content) {
    throw new Error('Content not found');
  }

  if (!Object.values(CONTENT_STATUS).includes(status)) {
    throw new Error('Invalid status');
  }

  content.status = status;
  await content.save();

  return hydrateContent(content);
};

// Get content analytics
const getContentAnalytics = async () => {
  const analytics = await Content.aggregate([
    {
      $group: {
        _id: null,
        totalContent: { $sum: 1 },
        publishedContent: {
          $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
        },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalDownloads: { $sum: '$downloads' },
        paidContent: {
          $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] }
        },
        freeContent: {
          $sum: { $cond: [{ $eq: ['$isPaid', false] }, 1, 0] }
        }
      }
    }
  ]);

  return analytics[0] || {
    totalContent: 0,
    publishedContent: 0,
    totalViews: 0,
    totalLikes: 0,
    totalDownloads: 0,
    paidContent: 0,
    freeContent: 0
  };
};

// Clean up uploaded files (utility function)
const cleanupUploadedFiles = async (mediaUrls) => {
  try {
    if (mediaUrls.poster?.path) {
      deleteFile(mediaUrls.poster.path);
    }
    if (mediaUrls.backdrop?.path) {
      deleteFile(mediaUrls.backdrop.path);
    }
    if (mediaUrls.video?.path) {
      deleteFile(mediaUrls.video.path);
    }
    if (mediaUrls.trailer?.path) {
      deleteFile(mediaUrls.trailer.path);
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
};

module.exports = {
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  toggleContentStatus,
  getContentAnalytics,
  hydrateContent
};
