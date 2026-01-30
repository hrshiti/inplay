const userContentService = require('../services/userContentService');
const streamingService = require('../services/streamingService');
const downloadService = require('../services/downloadService');

// @desc    Get all content for users
// @route   GET /api/content/all
// @access  Public (but shows access status for logged-in users)
const getAllContent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {
      type: req.query.type,
      category: req.query.category,
      genre: req.query.genre ? req.query.genre.split(',') : [],
      search: req.query.search,
      dynamicTabId: req.query.dynamicTabId,
      dynamicTabs: req.query.dynamicTabs // Add support for string-based tabs
    };

    const userId = req.user?._id;
    const result = await userContentService.getContentForUsers(filters, page, limit, userId);

    res.status(200).json({
      success: true,
      data: result.content,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single content
// @route   GET /api/content/:id
// @access  Public
const getContent = async (req, res) => {
  try {
    const userId = req.user?._id;
    const content = await userContentService.getContentById(req.params.id, userId);

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate streaming URL
// @route   GET /api/content/:id/stream
// @access  Private
const generateStreamUrl = async (req, res) => {
  try {
    const { quality = 'HD' } = req.query;

    const result = await userContentService.generateStreamingUrl(
      req.params.id,
      req.user._id,
      quality
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate download license
// @route   POST /api/content/:id/download
// @access  Private
const generateDownloadLicense = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const result = await userContentService.generateDownloadLicense(
      req.params.id,
      req.user._id,
      deviceId
    );

    res.status(200).json({
      success: true,
      message: 'Download license generated successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Validate download license
// @route   POST /api/content/validate-download
// @access  Private
const validateDownloadLicense = async (req, res) => {
  try {
    const { licenseKey, deviceId } = req.body;

    if (!licenseKey || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'License key and device ID are required'
      });
    }

    const result = await userContentService.validateDownloadLicense(licenseKey, deviceId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's my list
// @route   GET /api/user/my-list
// @access  Private
const getMyList = async (req, res) => {
  try {
    const myList = await userContentService.getUserMyList(req.user._id);

    res.status(200).json({
      success: true,
      data: myList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update watch history
// @route   POST /api/user/watch-history
// @access  Private
const updateWatchHistory = async (req, res) => {
  try {
    const { contentId, progress, completed = false, watchedSeconds = 0, totalDuration = 0 } = req.body;

    if (!contentId || progress === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Content ID and progress are required'
      });
    }

    const result = await userContentService.updateWatchHistory(
      req.user._id,
      contentId,
      progress,
      completed,
      watchedSeconds,
      totalDuration
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get trending content
// @route   GET /api/content/trending
// @access  Public
const getTrendingContent = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const content = await userContentService.getTrendingContent(limit);

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get content by category
// @route   GET /api/content/category/:category
// @access  Public
const getContentByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const content = await userContentService.getContentByCategory(category, limit);

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get streaming URL for content
// @route   GET /api/content/:id/stream
// @access  Private
const streamContent = async (req, res) => {
  try {
    const { quality = 'HD' } = req.query;

    const streamData = await streamingService.generateStreamingUrl(
      req.params.id,
      req.user._id,
      quality
    );

    res.status(200).json({
      success: true,
      data: streamData
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate download license
// @route   POST /api/content/:id/download
// @access  Private
const createDownloadLicense = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const licenseData = await downloadService.generateDownloadLicense(
      req.params.id,
      req.user._id,
      deviceId
    );

    res.status(200).json({
      success: true,
      message: 'Download license generated successfully',
      data: licenseData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Validate download license
// @route   POST /api/content/validate-download
// @access  Private
const validateDownload = async (req, res) => {
  try {
    const { licenseKey, deviceId } = req.body;

    if (!licenseKey || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'License key and device ID are required'
      });
    }

    const validationResult = await downloadService.validateDownloadLicense(licenseKey, deviceId);

    res.status(200).json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's downloads
// @route   GET /api/user/downloads
// @access  Private
const getUserDownloads = async (req, res) => {
  try {
    const downloads = await downloadService.getUserDownloads(req.user._id);

    res.status(200).json({
      success: true,
      data: downloads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Revoke download license
// @route   DELETE /api/user/downloads/:licenseKey
// @access  Private
const revokeDownload = async (req, res) => {
  try {
    const result = await downloadService.revokeDownloadLicense(
      req.params.licenseKey,
      req.user._id,
      'User requested revocation'
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get new releases content
// @route   GET /api/content/new-releases
// @access  Public
const getNewReleases = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const content = await userContentService.getNewReleases(limit);

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllContent,
  getContent,
  streamContent,
  createDownloadLicense,
  validateDownload,
  getMyList,
  updateWatchHistory,
  getTrendingContent,
  getNewReleases,
  getContentByCategory,
  getUserDownloads,
  revokeDownload
};
