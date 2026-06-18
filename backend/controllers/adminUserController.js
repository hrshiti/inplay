const adminUserService = require('../services/adminUserService');
const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2000;

    const filters = {
      role: req.query.role,
      isActive: req.query.isActive === 'true' ? true :
                req.query.isActive === 'false' ? false : undefined,
      search: req.query.search
    };

    const result = await adminUserService.getAllUsers(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
const getUser = async (req, res) => {
  try {
    const user = await adminUserService.getUserById(req.params.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user status
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive field is required'
      });
    }

    const user = await adminUserService.updateUserStatus(req.params.id, isActive);

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user analytics
// @route   GET /api/admin/users/analytics
// @access  Private (Admin only)
const getUserAnalytics = async (req, res) => {
  try {
    const analytics = await adminUserService.getUserAnalytics();

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


// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const result = await adminUserService.deleteUser(req.params.id);

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

// @desc    Force logout all users
// @route   POST /api/admin/users/force-logout-all
// @access  Private (Admin only)
const forceLogoutAll = async (req, res) => {
  try {
    const forceLogoutTime = new Date();

    // 1. Update database (security fallback)
    // Option A: Increment token version
    // await User.updateMany({ role: 'user' }, { $inc: { tokenVersion: 1 } });
    
    // Option B: Set forceLogoutAt (Better control)
    await User.updateMany({ role: 'user' }, { 
      $set: { forceLogoutAt: forceLogoutTime },
      $inc: { tokenVersion: 1 } 
    });

    // 2. Emit socket event (real-time logout)
    const io = req.app.get('io');
    if (io) {
      io.emit('force_logout_all', { 
        message: 'Admin has forced a logout for all sessions',
        timestamp: forceLogoutTime
      });
      console.log('📢 Socket: force_logout_all emitted');
    }

    res.status(200).json({
      success: true,
      message: 'Force logout triggered for all users'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Force logout specific user
// @route   POST /api/admin/users/:id/force-logout
// @access  Private (Admin only)
const forceLogoutUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const forceLogoutTime = new Date();

    // 1. Update database (security fallback)
    await User.findByIdAndUpdate(userId, { 
      $set: { forceLogoutAt: forceLogoutTime },
      $inc: { tokenVersion: 1 } 
    });

    // 2. Emit socket event (real-time logout)
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('force_logout', { 
        message: 'Your session has been terminated by an admin',
        timestamp: forceLogoutTime
      });
      console.log(`📢 Socket: force_logout emitted to user ${userId}`);
    }

    res.status(200).json({
      success: true,
      message: 'Force logout triggered for the user'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUser,
  updateUserStatus,
  getUserAnalytics,
  deleteUser,
  forceLogoutAll,
  forceLogoutUser
};
