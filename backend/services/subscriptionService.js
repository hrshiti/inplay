const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { createSubscriptionOrder, verifyPayment } = require('../config/razorpay');

// Get all subscription plans
const getAllPlans = async (activeOnly = true) => {
  const query = activeOnly ? { isActive: true } : {};

  const plans = await SubscriptionPlan.find(query)
    .sort({ displayOrder: 1, createdAt: -1 });

  return plans;
};

// Get plan by ID
const getPlanById = async (planId) => {
  const plan = await SubscriptionPlan.findById(planId);

  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  return plan;
};

// Create subscription order
const createSubscriptionOrderService = async (planId, userId) => {
  const plan = await getPlanById(planId);
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user already has an active subscription
  if (user.subscription?.isActive && user.subscription.endDate > new Date()) {
    throw new Error('User already has an active subscription');
  }

  // Create Razorpay order
  const order = await createSubscriptionOrder(plan, user);

  // Save payment record
  await Payment.create({
    user: userId,
    type: 'subscription',
    subscriptionPlan: planId,
    razorpayOrderId: order.id,
    amount: plan.price,
    currency: plan.currency,
    status: 'pending'
  });

  return {
    order,
    plan: {
      id: plan._id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency
    }
  };
};

// Verify subscription payment
const verifySubscriptionPayment = async (paymentData, userId) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

  // Verify payment signature
  const isValidPayment = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  if (!isValidPayment) {
    throw new Error('Payment verification failed');
  }

  // Find payment record
  const payment = await Payment.findOne({
    razorpayOrderId: razorpay_order_id,
    user: userId
  });

  if (!payment) {
    throw new Error('Payment record not found');
  }

  // Update payment status
  payment.status = 'completed';
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  await payment.save();

  // Activate user subscription
  const user = await User.findById(userId);
  const plan = await SubscriptionPlan.findById(payment.subscriptionPlan);

  if (user && plan) {
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + plan.durationInDays);

    user.subscription = {
      plan: plan._id,
      startDate: new Date(),
      endDate: subscriptionEndDate,
      isActive: true,
      autoRenew: true
    };

    await user.save();

    // Update plan subscriber count
    plan.subscriberCount += 1;
    plan.revenue += plan.price;
    await plan.save();
  }

  return {
    message: 'Subscription activated successfully',
    subscription: user.subscription,
    payment: {
      id: payment._id,
      amount: payment.amount,
      status: payment.status
    }
  };
};

// Get user's subscription status
const getUserSubscription = async (userId) => {
  const user = await User.findById(userId)
    .populate('subscription.plan', 'name price duration features')
    .select('subscription');

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const subscription = user.subscription;

  if (!subscription || !subscription.isActive) {
    return {
      isActive: false,
      message: 'No active subscription'
    };
  }

  if (subscription.endDate < now) {
    // Subscription expired, update status
    user.subscription.isActive = false;
    await user.save();

    return {
      isActive: false,
      message: 'Subscription expired',
      expiredAt: subscription.endDate
    };
  }

  // Calculate days remaining
  const daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));

  return {
    isActive: true,
    plan: subscription.plan,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    daysRemaining,
    autoRenew: subscription.autoRenew
  };
};

// Cancel user subscription
const cancelSubscription = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.subscription?.isActive) {
    throw new Error('No active subscription to cancel');
  }

  user.subscription.autoRenew = false;
  await user.save();

  return {
    message: 'Subscription will not auto-renew',
    endDate: user.subscription.endDate
  };
};

// Get subscription analytics for admin
const getSubscriptionAnalytics = async () => {
  const analytics = await SubscriptionPlan.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalPlans: { $sum: 1 },
        totalSubscribers: { $sum: '$subscriberCount' },
        totalRevenue: { $sum: '$revenue' },
        popularPlan: { $max: '$subscriberCount' }
      }
    }
  ]);

  // Get payment statistics
  const paymentStats = await Payment.aggregate([
    {
      $match: {
        type: 'subscription',
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    },
    {
      $group: {
        _id: null,
        monthlyRevenue: { $sum: '$amount' },
        monthlySubscriptions: { $sum: 1 }
      }
    }
  ]);

  return {
    ...(analytics[0] || { totalPlans: 0, totalSubscribers: 0, totalRevenue: 0 }),
    ...(paymentStats[0] || { monthlyRevenue: 0, monthlySubscriptions: 0 })
  };
};

// Admin: Create new subscription plan
const createPlan = async (planData) => {
  const plan = await SubscriptionPlan.create(planData);
  return plan;
};

// Admin: Update subscription plan
const updatePlan = async (planId, updateData) => {
  const plan = await SubscriptionPlan.findById(planId);

  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  Object.assign(plan, updateData);
  await plan.save();

  return plan;
};

// Admin: Delete subscription plan
const deletePlan = async (planId) => {
  const plan = await SubscriptionPlan.findById(planId);

  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  // Check if plan has active subscribers
  if (plan.subscriberCount > 0) {
    throw new Error('Cannot delete plan with active subscribers');
  }

  await SubscriptionPlan.findByIdAndDelete(planId);
  return { message: 'Plan deleted successfully' };
};

module.exports = {
  getAllPlans,
  getPlanById,
  createSubscriptionOrderService,
  verifySubscriptionPayment,
  getUserSubscription,
  cancelSubscription,
  getSubscriptionAnalytics,
  createPlan,
  updatePlan,
  deletePlan
};
