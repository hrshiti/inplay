const paymentService = require('../services/paymentService');
const subscriptionService = require('../services/subscriptionService');

// @desc    Create content purchase order
// @route   POST /api/user/payment/create-content-order
// @access  Private (User)
const createContentPurchaseOrder = async (req, res) => {
  try {
    const { contentId } = req.body;

    if (!contentId) {
      return res.status(400).json({
        success: false,
        message: 'Content ID is required'
      });
    }

    const result = await paymentService.createContentPurchaseOrderService(contentId, req.user._id);

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

// @desc    Verify content purchase payment
// @route   POST /api/user/payment/verify-content-payment
// @access  Private (User)
const verifyContentPurchasePayment = async (req, res) => {
  try {
    const paymentData = req.body;

    const result = await paymentService.verifyContentPurchasePayment(paymentData, req.user._id);

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

// @desc    Get user's payment history
// @route   GET /api/user/payment/history
// @access  Private (User)
const getUserPaymentHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const payments = await paymentService.getUserPaymentHistory(req.user._id, limit);

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

// @desc    Get payment analytics (Admin)
// @route   GET /api/admin/payment/analytics
// @access  Private (Admin only)
const getPaymentAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await paymentService.getPaymentAnalytics(
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

// @desc    Process refund (Admin)
// @route   POST /api/admin/payment/:id/refund
// @access  Private (Admin only)
const processRefund = async (req, res) => {
  try {
    const result = await paymentService.processRefund(req.params.id, req.user._id);

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

// @desc    Get all payments (Admin)
// @route   GET /api/admin/payment/all
// @access  Private (Admin only)
const getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filters = {
      status: req.query.status,
      type: req.query.type,
      user: req.query.user,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const result = await paymentService.getAllPayments(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.payments,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get paid content performance (Admin)
// @route   GET /api/admin/payment/content-performance
// @access  Private (Admin only)
const getPaidContentPerformance = async (req, res) => {
  try {
    const data = await paymentService.getPaidContentPerformance();
    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createContentPurchaseOrder,
  verifyContentPurchasePayment,
  getUserPaymentHistory,
  getPaymentAnalytics,
  processRefund,
  getAllPayments,
  getPaidContentPerformance
};
