const path = require('path');
const Banner = require('../models/Banner');
const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const AudioSeries = require('../models/AudioSeries');
const mediaService = require('../services/mediaService');
const s3Service = require('../services/s3Service');
const { getFilePathFromUrl, deleteFile } = require('../config/multerStorage');
const fs = require('fs');

const populateBannerContent = async (banners) => {
  const isArray = Array.isArray(banners);
  const bannersArray = isArray ? banners : [banners];
  for (let b of bannersArray) {
    if (b.contentId) {
      let content = await Content.findById(b.contentId, 'title type _id').lean();
      if (!content) content = await QuickByte.findById(b.contentId, 'title type _id').lean();
      if (!content) content = await AudioSeries.findById(b.contentId, 'title type _id').lean();
      b.contentId = content || null;
    }
  }
  return isArray ? bannersArray : bannersArray[0];
};

// @desc    Get all active banners grouped by category
// @route   GET /api/public/banners
// @access  Public
const getPublicBanners = async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }
    
    let banners = await Banner.find(query).sort({ order: 1, createdAt: -1 }).lean();
    banners = await populateBannerContent(banners);
    
    // Group by category if returning all
    if (!category) {
      const grouped = { drama: [], cinema: [], bhojpuri: [] };
      banners.forEach(b => {
        if (grouped[b.category]) grouped[b.category].push(b);
      });
      return res.status(200).json({ success: true, data: grouped });
    }

    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error('Get Public Banners Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

// @desc    Get all banners (for admin list)
// @route   GET /api/admin/banners
// @access  Private/Admin
const getAllBanners = async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    let banners = await Banner.find(query).sort({ category: 1, order: 1, createdAt: -1 }).lean();
    banners = await populateBannerContent(banners);
    
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error('Get All Banners Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

// @desc    Create a banner
// @route   POST /api/admin/banners
// @access  Private/Admin
const createBanner = async (req, res) => {
  try {
    const { category, mediaType, mediaUrl, isActive, order, contentId } = req.body;

    const banner = new Banner({
      category,
      mediaType,
      mediaUrl,
      contentId: contentId || null,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    const createdBanner = await banner.save();

    // Process HLS if it's a video
    if (mediaType === 'video' && mediaUrl) {
      const localPath = getFilePathFromUrl(mediaUrl);
      if (localPath && fs.existsSync(localPath)) {
        // Start processing asynchronously
        mediaService.handleVideoHLSWithOriginal(localPath, createdBanner._id, 'banner').then(async ({ hlsUrl, originalS3Url }) => {
          if (hlsUrl) {
             await Banner.findByIdAndUpdate(createdBanner._id, { hlsUrl, ...(originalS3Url ? { originalS3Url } : {}) });
             console.log(`[HLS] Banner video processed successfully: ${createdBanner._id}`);
          }
        }).catch(err => {
             console.error(`[HLS] Failed to process banner video:`, err);
        });
      }
    }

    res.status(201).json({ success: true, data: createdBanner });
  } catch (error) {
    console.error('Create Banner Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create banner', error: error.message });
  }
};

// @desc    Update a banner
// @route   PUT /api/admin/banners/:id
// @access  Private/Admin
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const { category, mediaType, mediaUrl, isActive, order, contentId } = req.body;

    // Check if media changed and needs new HLS processing
    const needNewHls = mediaType === 'video' && mediaUrl && mediaUrl !== banner.mediaUrl;

    // The previous media file was never cleaned up here before - if it's being
    // replaced, remove the old local file (and any S3 copies) now that we have
    // its path, before the record is overwritten below.
    const oldMediaUrl = banner.mediaUrl;
    const mediaChanged = mediaUrl !== undefined && mediaUrl !== oldMediaUrl;

    if (category !== undefined) banner.category = category;
    if (mediaType !== undefined) banner.mediaType = mediaType;
    if (mediaUrl !== undefined) banner.mediaUrl = mediaUrl;
    if (isActive !== undefined) banner.isActive = isActive;
    if (order !== undefined) banner.order = order;
    if (contentId !== undefined) banner.contentId = contentId || null;

    if (needNewHls) {
       banner.hlsUrl = null; // reset while processing
       banner.originalS3Url = null;
    }

    const updatedBanner = await banner.save();

    if (mediaChanged && oldMediaUrl) {
      const oldLocalPath = getFilePathFromUrl(oldMediaUrl);
      if (oldLocalPath) deleteFile(oldLocalPath);
      s3Service.deleteFolder(`videos/banner/${updatedBanner._id}`).catch(() => {});
      if (oldLocalPath) {
        s3Service.deleteObject(`originals/banner/${updatedBanner._id}/${path.basename(oldLocalPath)}`).catch(() => {});
      }
    }

    if (needNewHls) {
      const localPath = getFilePathFromUrl(mediaUrl);
      if (localPath && fs.existsSync(localPath)) {
        mediaService.handleVideoHLSWithOriginal(localPath, updatedBanner._id, 'banner').then(async ({ hlsUrl, originalS3Url }) => {
          if (hlsUrl) {
             await Banner.findByIdAndUpdate(updatedBanner._id, { hlsUrl, ...(originalS3Url ? { originalS3Url } : {}) });
          }
        }).catch(err => {
             console.error(`[HLS] Failed to process banner video:`, err);
        });
      }
    }

    res.status(200).json({ success: true, data: updatedBanner });
  } catch (error) {
    console.error('Update Banner Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update banner', error: error.message });
  }
};

// @desc    Delete a banner
// @route   DELETE /api/admin/banners/:id
// @access  Private/Admin
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Local cleanup - previously this deleted nothing at all, leaking every
    // banner image/video permanently.
    const localPath = getFilePathFromUrl(banner.mediaUrl);
    if (localPath) deleteFile(localPath);

    // Best-effort S3 cleanup - never blocks the record delete below.
    s3Service.deleteFolder(`videos/banner/${banner._id}`).catch(() => {});
    if (banner.originalS3Url && localPath) {
      s3Service.deleteObject(`originals/banner/${banner._id}/${path.basename(localPath)}`).catch(() => {});
    }

    await Banner.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Banner removed' });
  } catch (error) {
    console.error('Delete Banner Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner', error: error.message });
  }
};

module.exports = {
  getPublicBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner
};
