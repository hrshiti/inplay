const Content = require('../models/Content');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
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
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  const content = await Content.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Content.countDocuments(query);

  return {
    content,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Get content by ID
const getContentById = async (contentId) => {
  const content = await Content.findById(contentId)
    .populate('createdBy', 'name email');

  if (!content) {
    throw new Error('Content not found');
  }

  return content;
};

// Create new content
const createContent = async (contentData, adminId, files = {}) => {
  // Upload media files to Cloudinary
  const mediaUrls = {};

  try {
    // Upload poster
    if (files.poster) {
      if (files.poster.size > FILE_SIZE_LIMITS.POSTER) {
        throw new Error('Poster file size too large');
      }
      mediaUrls.poster = await uploadToCloudinary(files.poster, 'poster');
    }

    // Upload backdrop
    if (files.backdrop) {
      if (files.backdrop.size > FILE_SIZE_LIMITS.BACKDROP) {
        throw new Error('Backdrop file size too large');
      }
      mediaUrls.backdrop = await uploadToCloudinary(files.backdrop, 'backdrop');
    }

    // Upload video
    if (files.video) {
      if (files.video.size > FILE_SIZE_LIMITS.VIDEO) {
        throw new Error('Video file size too large');
      }
      mediaUrls.video = await uploadToCloudinary(files.video, 'video');
    }

    // Upload trailer
    if (files.trailer) {
      if (files.trailer.size > FILE_SIZE_LIMITS.TRAILER) {
        throw new Error('Trailer file size too large');
      }
      mediaUrls.trailer = await uploadToCloudinary(files.trailer, 'trailer');
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

        const uploadResult = await uploadToCloudinary(videoFile, 'video');

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

    return content;
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

  // Upload new media files
  const mediaUrls = {};

  try {
    // Upload poster if provided
    if (files.poster) {
      if (files.poster.size > FILE_SIZE_LIMITS.POSTER) {
        throw new Error('Poster file size too large');
      }
      // Delete old poster
      if (content.poster?.public_id) {
        await deleteFromCloudinary(content.poster.public_id, 'image');
      }
      mediaUrls.poster = await uploadToCloudinary(files.poster, 'poster');
    }

    // Upload backdrop if provided
    if (files.backdrop) {
      if (files.backdrop.size > FILE_SIZE_LIMITS.BACKDROP) {
        throw new Error('Backdrop file size too large');
      }
      // Delete old backdrop
      if (content.backdrop?.public_id) {
        await deleteFromCloudinary(content.backdrop.public_id, 'image');
      }
      mediaUrls.backdrop = await uploadToCloudinary(files.backdrop, 'backdrop');
    }

    // Upload video if provided
    if (files.video) {
      if (files.video.size > FILE_SIZE_LIMITS.VIDEO) {
        throw new Error('Video file size too large');
      }
      // Delete old video
      if (content.video?.public_id) {
        await deleteFromCloudinary(content.video.public_id, 'video');
      }
      mediaUrls.video = await uploadToCloudinary(files.video, 'video');
    }

    // Upload trailer if provided
    if (files.trailer) {
      if (files.trailer.size > FILE_SIZE_LIMITS.TRAILER) {
        throw new Error('Trailer file size too large');
      }
      // Delete old trailer
      if (content.trailer?.public_id) {
        await deleteFromCloudinary(content.trailer.public_id, 'video');
      }
      mediaUrls.trailer = await uploadToCloudinary(files.trailer, 'trailer');
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

        // Ideally check existing to delete, but skipping for now
        const uploadResult = await uploadToCloudinary(videoFile, 'video');

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

    return content;
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

  // Delete media files from Cloudinary
  try {
    if (content.poster?.public_id) {
      await deleteFromCloudinary(content.poster.public_id, 'image');
    }
    if (content.backdrop?.public_id) {
      await deleteFromCloudinary(content.backdrop.public_id, 'image');
    }
    if (content.video?.public_id) {
      await deleteFromCloudinary(content.video.public_id, 'video');
    }
    if (content.trailer?.public_id) {
      await deleteFromCloudinary(content.trailer.public_id, 'video');
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

  return content;
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
    if (mediaUrls.poster?.public_id) {
      await deleteFromCloudinary(mediaUrls.poster.public_id, 'image');
    }
    if (mediaUrls.backdrop?.public_id) {
      await deleteFromCloudinary(mediaUrls.backdrop.public_id, 'image');
    }
    if (mediaUrls.video?.public_id) {
      await deleteFromCloudinary(mediaUrls.video.public_id, 'video');
    }
    if (mediaUrls.trailer?.public_id) {
      await deleteFromCloudinary(mediaUrls.trailer.public_id, 'video');
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
  getContentAnalytics
};
