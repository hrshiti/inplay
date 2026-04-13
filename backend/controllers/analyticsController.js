const analyticsService = require('../services/analyticsService');

// @desc    Get dashboard analytics
// @route   GET /api/admin/analytics/dashboard
// @access  Private (Admin only)
const getDashboardAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getDashboardAnalytics(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

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

// @desc    Get user analytics
// @route   GET /api/admin/analytics/users
// @access  Private (Admin only)
const getUserAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getUserAnalytics(
      startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate) : new Date()
    );

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

// @desc    Get content analytics
// @route   GET /api/admin/analytics/content
// @access  Private (Admin only)
const getContentAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getContentAnalytics(
      startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate) : new Date()
    );

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


// @desc    Get recent activity
// @route   GET /api/admin/analytics/activity
// @access  Private (Admin only)
const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const activities = await analyticsService.getRecentActivity(limit);

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getDashboardAnalytics,
  getUserAnalytics,
  getContentAnalytics,
  getRecentActivity
};
