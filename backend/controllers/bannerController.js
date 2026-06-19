const Banner = require('../models/Banner');
const mediaService = require('../services/mediaService');
const { getFilePathFromUrl } = require('../config/multerStorage');
const fs = require('fs');

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
    
    const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 }).lean();
    
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
    const banners = await Banner.find(query).sort({ category: 1, order: 1, createdAt: -1 });
    
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
    const { category, mediaType, mediaUrl, isActive, order } = req.body;

    const banner = new Banner({
      category,
      mediaType,
      mediaUrl,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    const createdBanner = await banner.save();

    // Process HLS if it's a video
    if (mediaType === 'video' && mediaUrl) {
      const localPath = getFilePathFromUrl(mediaUrl);
      if (localPath && fs.existsSync(localPath)) {
        // Start processing asynchronously
        mediaService.handleVideoHLS(localPath, createdBanner._id, 'banner').then(async (hlsUrl) => {
          if (hlsUrl) {
             await Banner.findByIdAndUpdate(createdBanner._id, { hlsUrl });
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

    const { category, mediaType, mediaUrl, isActive, order } = req.body;
    
    // Check if media changed and needs new HLS processing
    const needNewHls = mediaType === 'video' && mediaUrl && mediaUrl !== banner.mediaUrl;

    if (category !== undefined) banner.category = category;
    if (mediaType !== undefined) banner.mediaType = mediaType;
    if (mediaUrl !== undefined) banner.mediaUrl = mediaUrl;
    if (isActive !== undefined) banner.isActive = isActive;
    if (order !== undefined) banner.order = order;

    if (needNewHls) {
       banner.hlsUrl = null; // reset while processing
    }

    const updatedBanner = await banner.save();

    if (needNewHls) {
      const localPath = getFilePathFromUrl(mediaUrl);
      if (localPath && fs.existsSync(localPath)) {
        mediaService.handleVideoHLS(localPath, updatedBanner._id, 'banner').then(async (hlsUrl) => {
          if (hlsUrl) {
             await Banner.findByIdAndUpdate(updatedBanner._id, { hlsUrl });
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
