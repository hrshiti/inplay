const adminUserService = require('../services/adminUserService');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filters = {
      role: req.query.role,
      isActive: req.query.isActive === 'true' ? true :
                req.query.isActive === 'false' ? false : undefined,
      subscriptionStatus: req.query.subscriptionStatus,
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

// @desc    Get user's payment history
// @route   GET /api/admin/users/:id/payments
// @access  Private (Admin only)
const getUserPaymentHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const payments = await adminUserService.getUserPaymentHistory(req.params.id, limit);

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user subscription
// @route   PUT /api/admin/users/:id/subscription
// @access  Private (Admin only)
const updateUserSubscription = async (req, res) => {
  try {
    const subscriptionData = req.body;

    const user = await adminUserService.updateUserSubscription(req.params.id, subscriptionData);

    res.status(200).json({
      success: true,
      message: 'User subscription updated successfully',
      data: user
    });
  } catch (error) {
    res.status(400).json({
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

module.exports = {
  getAllUsers,
  getUser,
  updateUserStatus,
  getUserAnalytics,
  getUserPaymentHistory,
  updateUserSubscription,
  deleteUser
};
