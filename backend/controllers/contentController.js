const contentService = require('../services/contentService');
const { CONTENT_STATUS } = require('../constants');
const { uploadMixed } = require('../config/multerStorage');
const { notifyAllUsers } = require('../utils/notificationHelper');

// NOTE: Multer configuration is now in config/multerStorage.js
// Files are automatically saved to disk by the uploadMixed middleware


// @desc    Get all content
// @route   GET /api/admin/content
// @access  Private (Admin only)
const getAllContent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filters = {
      type: req.query.type,
      category: req.query.category,
      genre: req.query.genre ? req.query.genre.split(',') : [],
      status: req.query.status,
      isPaid: req.query.isPaid === 'true' ? true : req.query.isPaid === 'false' ? false : undefined,
      search: req.query.search
    };

    const result = await contentService.getAllContent(filters, page, limit);

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
// @route   GET /api/admin/content/:id
// @access  Private (Admin only)
const getContent = async (req, res) => {
  try {
    const content = await contentService.getContentById(req.params.id);

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

// @desc    Create new content
// @route   POST /api/admin/content
// @access  Private (Admin only)
const createContent = [
  uploadMixed.any(), // Allow any files (dynamic names for episodes)
  async (req, res) => {
    try {
      // Parse JSON data if sent as string in 'data' field (common in FormData)
      if (req.body.data) {
        try {
          const parsedData = JSON.parse(req.body.data);
          Object.assign(req.body, parsedData);
          delete req.body.data;
        } catch (err) {
          console.error('Error parsing data field:', err);
        }
      }

      const contentData = req.body;

      // Parse arrays from form data (backward compatibility check)
      if (typeof contentData.genre === 'string') {
        contentData.genre = contentData.genre.split(',').filter(Boolean);
      }
      if (typeof contentData.director === 'string') {
        contentData.director = contentData.director.split(',').filter(Boolean);
      }
      if (typeof contentData.cast === 'string') {
        contentData.cast = contentData.cast.split(',').filter(Boolean);
      }
      if (typeof contentData.tags === 'string') {
        contentData.tags = contentData.tags.split(',').filter(Boolean);
      }

      // Convert string booleans
      if (contentData.isPaid === 'true') contentData.isPaid = true;
      if (contentData.isPaid === 'false') contentData.isPaid = false;

      // Convert string numbers
      if (contentData.price) contentData.price = parseFloat(contentData.price);
      if (contentData.year) contentData.year = parseInt(contentData.year);
      if (contentData.rating) contentData.rating = parseFloat(contentData.rating);

      // Transform req.files (array from upload.any()) to object for service
      // Also keep original array for episode processing if needed
      const filesMap = {};

      if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
          // Identify if it's a standard field or dynamic episode field
          filesMap[file.fieldname] = file;
        });
      }

      const content = await contentService.createContent(
        contentData,
        req.user._id,
        filesMap
      );

      res.status(201).json({
        success: true,
        message: 'Content created successfully',
        data: content
      });

      // Send push notification to all users
      if (content && content.status === CONTENT_STATUS.PUBLISHED) {
        notifyAllUsers({
          title: `New ${content.type || 'Movie'} Released!`,
          body: content.title,
          imageUrl: content.poster?.url || content.poster?.secure_url,
          data: {
            type: 'content',
            id: content._id.toString(),
            link: `/movie-details/${content._id}`
          }
        });
      }
    } catch (error) {
      console.error(error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
];

// @desc    Update content
// @route   PUT /api/admin/content/:id
// @access  Private (Admin only)
const updateContent = [
  uploadMixed.any(),
  async (req, res) => {
    try {
      // Parse JSON data if sent as string in 'data' field
      if (req.body.data) {
        try {
          const parsedData = JSON.parse(req.body.data);
          Object.assign(req.body, parsedData);
          delete req.body.data;
        } catch (err) {
          console.error('Error parsing data field:', err);
        }
      }

      const contentData = req.body;

      // Parse arrays from form data
      if (typeof contentData.genre === 'string') {
        contentData.genre = contentData.genre.split(',').filter(Boolean);
      }
      if (typeof contentData.director === 'string') {
        contentData.director = contentData.director.split(',').filter(Boolean);
      }
      if (typeof contentData.cast === 'string') {
        contentData.cast = contentData.cast.split(',').filter(Boolean);
      }
      if (typeof contentData.tags === 'string') {
        contentData.tags = contentData.tags.split(',').filter(Boolean);
      }

      // Convert string booleans
      if (contentData.isPaid === 'true') contentData.isPaid = true;
      if (contentData.isPaid === 'false') contentData.isPaid = false;

      // Convert string numbers
      if (contentData.price) contentData.price = parseFloat(contentData.price);
      if (contentData.year) contentData.year = parseInt(contentData.year);
      if (contentData.rating) contentData.rating = parseFloat(contentData.rating);

      const filesMap = {};
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
          filesMap[file.fieldname] = file;
        });
      }

      const content = await contentService.updateContent(
        req.params.id,
        contentData,
        req.user._id,
        filesMap
      );

      res.status(200).json({
        success: true,
        message: 'Content updated successfully',
        data: content
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
];

// @desc    Delete content
// @route   DELETE /api/admin/content/:id
// @access  Private (Admin only)
const deleteContent = async (req, res) => {
  try {
    const result = await contentService.deleteContent(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Publish/Unpublish content
// @route   PATCH /api/admin/content/:id/status
// @access  Private (Admin only)
const toggleContentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !Object.values(CONTENT_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + Object.values(CONTENT_STATUS).join(', ')
      });
    }

    const content = await contentService.toggleContentStatus(req.params.id, status);

    res.status(200).json({
      success: true,
      message: `Content ${status} successfully`,
      data: content
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get content analytics
// @route   GET /api/admin/content/analytics
// @access  Private (Admin only)
const getContentAnalytics = async (req, res) => {
  try {
    const analytics = await contentService.getContentAnalytics();

    res.status(200).json({
      success: true,
      data: analytics
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
  createContent,
  updateContent,
  deleteContent,
  toggleContentStatus,
  getContentAnalytics
};
