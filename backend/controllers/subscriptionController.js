const subscriptionService = require('../services/subscriptionService');

// @desc    Get all subscription plans
// @route   GET /api/admin/subscription/plans
// @access  Public
const getAllPlans = async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';
    const plans = await subscriptionService.getAllPlans(activeOnly);

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get subscription plan by ID
// @route   GET /api/admin/subscription/plans/:id
// @access  Public
const getPlan = async (req, res) => {
  try {
    const plan = await subscriptionService.getPlanById(req.params.id);

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create subscription order
// @route   POST /api/user/subscription/create-order
// @access  Private (User)
const createSubscriptionOrder = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    const result = await subscriptionService.createSubscriptionOrderService(planId, req.user._id);

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

// @desc    Verify subscription payment
// @route   POST /api/user/subscription/verify-payment
// @access  Private (User)
const verifySubscriptionPayment = async (req, res) => {
  try {
    const paymentData = req.body;

    const result = await subscriptionService.verifySubscriptionPayment(paymentData, req.user._id);

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

// @desc    Get user's subscription status
// @route   GET /api/user/subscription/status
// @access  Private (User)
const getUserSubscription = async (req, res) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user._id);

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel user subscription
// @route   DELETE /api/user/subscription/cancel
// @access  Private (User)
const cancelSubscription = async (req, res) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.user._id);

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

// @desc    Get subscription analytics
// @route   GET /api/admin/subscription/analytics
// @access  Private (Admin only)
const getSubscriptionAnalytics = async (req, res) => {
  try {
    const analytics = await subscriptionService.getSubscriptionAnalytics();

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

// @desc    Create new subscription plan (Admin)
// @route   POST /api/admin/subscription/plans
// @access  Private (Admin only)
const createPlan = async (req, res) => {
  try {
    const planData = req.body;

    const plan = await subscriptionService.createPlan(planData);

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: plan
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update subscription plan (Admin)
// @route   PUT /api/admin/subscription/plans/:id
// @access  Private (Admin only)
const updatePlan = async (req, res) => {
  try {
    const updateData = req.body;

    const plan = await subscriptionService.updatePlan(req.params.id, updateData);

    res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: plan
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete subscription plan (Admin)
// @route   DELETE /api/admin/subscription/plans/:id
// @access  Private (Admin only)
const deletePlan = async (req, res) => {
  try {
    const result = await subscriptionService.deletePlan(req.params.id);

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
  getAllPlans,
  getPlan,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getUserSubscription,
  cancelSubscription,
  getSubscriptionAnalytics,
  createPlan,
  updatePlan,
  deletePlan
};
