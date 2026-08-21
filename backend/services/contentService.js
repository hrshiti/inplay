const Content = require('../models/Content');
const { deleteFile, getFilePathFromUrl } = require('../config/multerStorage');
const { CONTENT_STATUS, FILE_SIZE_LIMITS } = require('../constants');
const mediaService = require('./mediaService');
const s3Service = require('./s3Service');
const fs = require('fs');
const path = require('path');
const { hydrateHlsUrl } = require('../utils/hlsUrl');

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
    if (media.hls_url) media.hls_url = hydrateHlsUrl(media.hls_url);
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
  const { transformFileToResponse } = require('../config/multerStorage');
  const mediaUrls = {};

  try {
    // Transform standard uploads
    if (files.poster) mediaUrls.poster = transformFileToResponse(files.poster);
    if (files.backdrop) mediaUrls.backdrop = transformFileToResponse(files.backdrop);
    if (files.video) mediaUrls.video = transformFileToResponse(files.video);
    if (files.trailer) mediaUrls.trailer = transformFileToResponse(files.trailer);

    // Process episode videos initial multer upload info
    const fileKeys = Object.keys(files);
    for (const key of fileKeys) {
      const match = key.match(/^season_(\d+)_episode_(\d+)_video$/);
      if (match) {
        const sIdx = parseInt(match[1]);
        const eIdx = parseInt(match[2]);
        const uploadResult = transformFileToResponse(files[key]);

        if (contentData.seasons && contentData.seasons[sIdx]?.episodes?.[eIdx]) {
          contentData.seasons[sIdx].episodes[eIdx].video = uploadResult;
        }
      }
    }

    // Use admin's intended status — do NOT force draft even when video is uploaded.
    // HLS processing happens in background; content is published immediately with MP4 fallback.
    const intendedStatus = contentData.status || 'published';

    // Create content record in DB
    const content = await Content.create({
      ...contentData,
      ...mediaUrls,
      status: intendedStatus,
      createdBy: adminId
    });

    // START ASYNC HLS PROCESSING
    // 1. Process main video
    if (files.video) {
      mediaService.handleVideoHLSWithDuration(files.video.path, content._id, 'movie').then(async ({ hlsUrl, duration, originalS3Url }) => {
        if (hlsUrl) {
          const updatedContent = await Content.findByIdAndUpdate(
            content._id,
            { 'video.hls_url': hlsUrl, 'video.duration': duration, duration: duration, status: 'published', ...(originalS3Url ? { 'video.s3_url': originalS3Url } : {}) },
            { new: true }
          ).exec();

          console.log(`HLS Master synced and Published for: ${content.title}`);

          // Send push notification only NOW when it's actually ready
          const { notifyAllUsers } = require('../utils/notificationHelper');
          if (updatedContent && updatedContent.status === 'published') {
            notifyAllUsers({
              title: `New ${updatedContent.type || 'Movie'} Released!`,
              body: updatedContent.title,
              imageUrl: updatedContent.poster?.url || updatedContent.poster?.secure_url,
              data: {
                type: 'content',
                id: updatedContent._id.toString(),
                link: `/content/${updatedContent._id}`
              }
            });
          }
        }
      });
    }

    // 2. Process episode videos sequentially in background to save CPU
    if (content.type === 'series' || content.type === 'hindi_series') {
      (async () => {
        for (let sIdx = 0; sIdx < content.seasons.length; sIdx++) {
          const season = content.seasons[sIdx];
          for (let eIdx = 0; eIdx < season.episodes.length; eIdx++) {
            const episode = season.episodes[eIdx];
            const fileField = `season_${sIdx}_episode_${eIdx}_video`;
            if (files[fileField]) {
              try {
                const { hlsUrl, duration, originalS3Url } = await mediaService.handleVideoHLSWithDuration(files[fileField].path, episode._id, 'episode');
                if (hlsUrl) {
                  await Content.updateOne(
                    { _id: content._id, "seasons.episodes._id": episode._id },
                    { $set: { "seasons.$[s].episodes.$[e].video.hls_url": hlsUrl, "seasons.$[s].episodes.$[e].duration": duration, ...(originalS3Url ? { "seasons.$[s].episodes.$[e].video.s3_url": originalS3Url } : {}) } },
                    { arrayFilters: [{ "s._id": season._id }, { "e._id": episode._id }] }
                  ).exec();
                }
              } catch (err) {
                console.error(`[HLS] Error in sequential backup:`, err);
              }
            }
          }
        }
      })();
    }

    // 3. Upload trailer original to S3, best-effort (trailer is never HLS-transcoded
    // in this codebase - this is the only durable, non-local copy it ever gets).
    if (files.trailer) {
      mediaService.uploadOriginalToS3(files.trailer.path, content._id, 'trailer').then(async (originalS3Url) => {
        if (originalS3Url) {
          await Content.findByIdAndUpdate(content._id, { 'trailer.s3_url': originalS3Url }).exec();
        }
      });
    }

    // Send immediate notification for Web Series or Content without a main video upload
    if (content.status === 'published' && !files.video) {
      const { notifyAllUsers } = require('../utils/notificationHelper');
      const hydrated = hydrateContent(content);
      notifyAllUsers({
        title: `New ${content.type === 'series' || content.type === 'hindi_series' ? 'Series' : 'Movie'} Released!`,
        body: content.title,
        imageUrl: hydrated.poster?.url || hydrated.poster?.secure_url,
        data: {
          type: 'content',
          id: content._id.toString(),
          link: `/content/${content._id}`
        }
      });
    }

    return hydrateContent(content);
  } catch (error) {
    await cleanupUploadedFiles(mediaUrls);
    throw error;
  }
};

// Update content
const updateContent = async (contentId, updateData, adminId, files = {}) => {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');

  const { transformFileToResponse } = require('../config/multerStorage');
  const mediaUrls = {};

  // Capture what's about to be replaced BEFORE Object.assign overwrites it -
  // this is what updateContent never did before, leaking every replaced
  // poster/backdrop/video/trailer/episode file permanently.
  const previous = {
    poster: content.poster?.url,
    backdrop: content.backdrop?.url,
    video: content.video?.url,
    videoHadS3: !!content.video?.s3_url,
    trailer: content.trailer?.url
  };
  const previousEpisodeVideos = new Map(); // "sIdx_eIdx" -> { url, id }

  try {
    if (files.poster) mediaUrls.poster = transformFileToResponse(files.poster);
    if (files.backdrop) mediaUrls.backdrop = transformFileToResponse(files.backdrop);
    if (files.video) mediaUrls.video = transformFileToResponse(files.video);
    if (files.trailer) mediaUrls.trailer = transformFileToResponse(files.trailer);

    // Capture the old video for every episode about to be overwritten
    Object.keys(files).forEach(key => {
      const match = key.match(/^season_(\d+)_episode_(\d+)_video$/);
      if (match) {
        const sIdx = parseInt(match[1]);
        const eIdx = parseInt(match[2]);
        const oldEpisode = content.seasons?.[sIdx]?.episodes?.[eIdx];
        if (oldEpisode?.video?.url) {
          previousEpisodeVideos.set(`${sIdx}_${eIdx}`, { url: oldEpisode.video.url, id: oldEpisode._id });
        }
      }
    });

    // Capture admin's intended status before Object.assign can override it
    const intendedUpdateStatus = updateData.status || content.status;

    // Update record
    Object.assign(content, updateData, mediaUrls);
    content.status = intendedUpdateStatus; // Always respect admin's status choice
    content.updatedBy = adminId;
    await content.save();

    // Clean up whatever was just replaced - local disk first, S3 best-effort
    if (files.poster && previous.poster) deleteFile(getFilePathFromUrl(previous.poster));
    if (files.backdrop && previous.backdrop) deleteFile(getFilePathFromUrl(previous.backdrop));
    if (files.trailer && previous.trailer) {
      deleteFile(getFilePathFromUrl(previous.trailer));
      s3Service.deleteObject(`originals/trailer/${content._id}/${path.basename(getFilePathFromUrl(previous.trailer) || '')}`).catch(() => {});
    }
    if (files.video && previous.video) {
      deleteFile(getFilePathFromUrl(previous.video));
      s3Service.deleteFolder(`videos/movie/${content._id}`).catch(() => {});
      if (previous.videoHadS3) {
        s3Service.deleteObject(`originals/movie/${content._id}/${path.basename(getFilePathFromUrl(previous.video) || '')}`).catch(() => {});
      }
    }
    previousEpisodeVideos.forEach(({ url, id }) => {
      deleteFile(getFilePathFromUrl(url));
      s3Service.deleteFolder(`videos/episode/${id}`).catch(() => {});
      s3Service.deleteObject(`originals/episode/${id}/${path.basename(getFilePathFromUrl(url) || '')}`).catch(() => {});
    });

    // Process main video HLS if updated
    if (files.video) {
      mediaService.handleVideoHLSWithDuration(files.video.path, content._id, 'movie').then(async ({ hlsUrl, duration, originalS3Url }) => {
        if (hlsUrl) {
          await Content.findByIdAndUpdate(content._id, { 'video.hls_url': hlsUrl, 'video.duration': duration, duration: duration, status: 'published', ...(originalS3Url ? { 'video.s3_url': originalS3Url } : {}) }).exec();
        }
      });
    }

    // Trailer original upload to S3, best-effort (never HLS-transcoded)
    if (files.trailer) {
      mediaService.uploadOriginalToS3(files.trailer.path, content._id, 'trailer').then(async (originalS3Url) => {
        if (originalS3Url) {
          await Content.findByIdAndUpdate(content._id, { 'trailer.s3_url': originalS3Url }).exec();
        }
      });
    }

    // Process updated episodes HLS in background sequentially to avoid CPU pinning
    (async () => {
      const fileKeys = Object.keys(files);
      for (const key of fileKeys) {
        const match = key.match(/^season_(\d+)_episode_(\d+)_video$/);
        if (match) {
          const sIdx = parseInt(match[1]);
          const eIdx = parseInt(match[2]);
          const season = content.seasons[sIdx];
          const episode = season?.episodes?.[eIdx];
          if (episode) {
            try {
              const { hlsUrl, duration, originalS3Url } = await mediaService.handleVideoHLSWithDuration(files[key].path, episode._id, 'episode');
              if (hlsUrl) {
                await Content.updateOne(
                  { _id: content._id },
                  { $set: { "seasons.$[s].episodes.$[e].video.hls_url": hlsUrl, "seasons.$[s].episodes.$[e].duration": duration, ...(originalS3Url ? { "seasons.$[s].episodes.$[e].video.s3_url": originalS3Url } : {}) } },
                  { arrayFilters: [{ "s._id": season._id }, { "e._id": episode._id }] }
                ).exec();
              }
            } catch (err) {
              console.error(`[HLS] Failed episode conversion:`, err);
            }
          }
        }
      }
    })();

    return hydrateContent(content);
  } catch (error) {
    await cleanupUploadedFiles(mediaUrls);
    throw error;
  }
};

// Delete content
const deleteContent = async (contentId) => {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');

  // Local + S3 cleanup - this was previously never implemented at all (the
  // highest-severity finding of the storage audit): every deleted Movie or
  // Series permanently orphaned its poster, backdrop, trailer, main video,
  // and every episode's video, on both local disk and S3, forever.
  if (content.poster?.url) deleteFile(getFilePathFromUrl(content.poster.url));
  if (content.backdrop?.url) deleteFile(getFilePathFromUrl(content.backdrop.url));

  if (content.trailer?.url) {
    const trailerPath = getFilePathFromUrl(content.trailer.url);
    deleteFile(trailerPath);
    if (content.trailer.s3_url && trailerPath) {
      s3Service.deleteObject(`originals/trailer/${content._id}/${path.basename(trailerPath)}`).catch(() => {});
    }
  }

  if (content.video?.url) {
    const videoPath = getFilePathFromUrl(content.video.url);
    deleteFile(videoPath);
    s3Service.deleteFolder(`videos/movie/${content._id}`).catch(() => {});
    if (content.video.s3_url && videoPath) {
      s3Service.deleteObject(`originals/movie/${content._id}/${path.basename(videoPath)}`).catch(() => {});
    }
  }

  if (Array.isArray(content.seasons)) {
    content.seasons.forEach(season => {
      (season.episodes || []).forEach(episode => {
        if (episode.video?.url) {
          const epPath = getFilePathFromUrl(episode.video.url);
          deleteFile(epPath);
          s3Service.deleteFolder(`videos/episode/${episode._id}`).catch(() => {});
          if (episode.video.s3_url && epPath) {
            s3Service.deleteObject(`originals/episode/${episode._id}/${path.basename(epPath)}`).catch(() => {});
          }
        }
      });
    });
  }

  await Content.findByIdAndDelete(contentId);
  return { message: 'Content deleted successfully' };
};

// Basic Status Toggles
const toggleContentStatus = async (contentId, status) => {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  content.status = status;
  await content.save();
  return hydrateContent(content);
};

// Analytics helper
const getContentAnalytics = async () => {
  const stats = await Content.aggregate([{ $group: { _id: null, total: { $sum: 1 }, views: { $sum: "$views" } } }]);
  return stats[0] || { total: 0, views: 0 };
};

// UTILS
const cleanupUploadedFiles = async (mediaUrls) => {
  Object.values(mediaUrls).forEach(m => m.path && deleteFile(m.path));
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
