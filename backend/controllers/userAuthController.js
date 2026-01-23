const { validationResult } = require('express-validator');
const userAuthService = require('../services/userAuthService');
const { sendTokenResponse } = require('../middlewares/auth');
const { uploadAvatar, transformFileToResponse } = require('../config/multerStorage');

// @desc    Register new user
// @route   POST /api/user/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userData = req.body;

    // Register user
    const user = await userAuthService.registerUser(userData);

    // Send token response
    await sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    User login
// @route   POST /api/user/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Login user
    const user = await userAuthService.loginUser(email, password);

    // Send token response
    await sendTokenResponse(user, 200, res, 'User logged in successfully');
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/user/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await userAuthService.getUserProfile(req.user._id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const updateData = req.body;

    const user = await userAuthService.updateUserProfile(req.user._id, updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change user password
// @route   PUT /api/user/auth/change-password
// @access  Private
const changeUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const result = await userAuthService.changeUserPassword(
      req.user._id,
      currentPassword,
      newPassword
    );

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user preferences
// @route   PUT /api/user/auth/preferences
// @access  Private
const updateUserPreferences = async (req, res) => {
  try {
    const preferences = req.body;

    const updatedPreferences = await userAuthService.updateUserPreferences(
      req.user._id,
      preferences
    );

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: updatedPreferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add content to user's my list
// @route   POST /api/user/auth/my-list/:contentId
// @access  Private
const addToMyList = async (req, res) => {
  try {
    const { contentId } = req.params;

    const myList = await userAuthService.addToMyList(req.user._id, contentId);

    res.status(200).json({
      success: true,
      message: 'Added to my list',
      data: myList
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove content from user's my list
// @route   DELETE /api/user/auth/my-list/:contentId
// @access  Private
const removeFromMyList = async (req, res) => {
  try {
    const { contentId } = req.params;

    const myList = await userAuthService.removeFromMyList(req.user._id, contentId);

    res.status(200).json({
      success: true,
      message: 'Removed from my list',
      data: myList
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's watch history
// @route   GET /api/user/auth/watch-history
// @access  Private
const getWatchHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const watchHistory = await userAuthService.getWatchHistory(req.user._id, limit);

    res.status(200).json({
      success: true,
      data: watchHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// @desc    Update user avatar
// @route   PUT /api/user/auth/avatar
// @access  Private
const uploadAvatarHandler = [
  uploadAvatar.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload an image'
        });
      }

      // Transform uploaded file (already saved by multer)
      const result = transformFileToResponse(req.file);

      // Update user avatar in DB
      const user = await userAuthService.updateUserAvatar(req.user._id, result.secure_url);

      res.status(200).json({
        success: true,
        message: 'Avatar updated successfully',
        data: {
          avatar: user.avatar
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
];

// @desc    User logout
// @route   POST /api/user/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    const result = userAuthService.logoutUser();

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle like for content
// @route   POST /api/user/auth/like/:contentId
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const { contentId } = req.params;
    const result = await userAuthService.toggleLike(req.user._id, contentId);

    res.status(200).json({
      success: true,
      message: result.action === 'liked' ? 'Added to liked videos' : 'Removed from liked videos',
      data: result.likedContent
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  uploadAvatar: uploadAvatarHandler,
  changeUserPassword,
  updateUserPreferences,
  addToMyList,
  removeFromMyList,
  getWatchHistory,
  logoutUser,
  toggleLike
};
