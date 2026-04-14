const Razorpay = require('razorpay');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const AppSetting = require('../models/AppSetting');

// Helper to map duration to Razorpay period/interval
const getRazorpayPlanDetails = (duration) => {
  switch (duration) {
    case 'monthly':
      return { period: 'monthly', interval: 1 };
    case 'quarterly':
      return { period: 'monthly', interval: 3 };
    case 'half-yearly':
      return { period: 'monthly', interval: 6 };
    case 'yearly':
      return { period: 'yearly', interval: 1 };
    default:
      return { period: 'monthly', interval: 1 };
  }
};

// @desc    Get all subscription plans (for both Admin and User)
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create a new Razorpay Subscription
// @route   POST /api/user/subscription/create
exports.createSubscription = async (req, res) => {
  try {
    const { planId, isTrial } = req.body;
    console.log('🚀 [Subscription Create] Trial:', isTrial, 'PlanID:', planId);
    console.log('👤 [User Context]:', req.user ? req.user.id : 'NO USER FOUND');

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please login again.' });
    }

    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    if (!process.env.RAZORPAY_KEY_ID) {
      throw new Error('Razorpay Keys are missing in Server .env');
    }

    // 2. Fetch Subscription Settings (Dynamic Price/Days)
    const settings = await AppSetting.findOne();
    const subSettings = settings?.subscriptionSettings || { trialPrice: 9, trialDurationDays: 4 };

    // 2. Fetch Plan
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    let plan = await SubscriptionPlan.findById(planId);
    if (!plan) plan = await SubscriptionPlan.findOne({ isActive: true });
    if (!plan) return res.status(404).json({ success: false, message: 'No active plans found' });

    // Self-healing for Plan ID
    if (!plan.razorpayPlanId) {
      const rpDetails = getRazorpayPlanDetails(plan.duration);
      const newRpPlan = await rzp.plans.create({
        period: rpDetails.period,
        interval: rpDetails.interval,
        item: { name: plan.name, amount: plan.price * 100, currency: 'INR' }
      });
      plan.razorpayPlanId = newRpPlan.id;
      await plan.save();
    }

    // 3. Prepare Subscription Options (AutoPay Set)
    const options = {
      plan_id: plan.razorpayPlanId,
      customer_notify: 1, // Let Razorpay notify user
      total_count: 12,    // 1 Year cycle
      quantity: 1,
      notes: {
        userId: req.user.id.toString(),
        isTrial: isTrial ? "true" : "false"
      }
    };

    if (isTrial) {
      // --- PAID TRIAL + AUTOPAY MANDATE ---
      const trialDurationDays = parseInt(subSettings.trialDurationDays) || 4;
      const trialPrice = parseFloat(subSettings.trialPrice) || 9;

      options.addons = [{
        item: {
          name: "Trial Access Fee",
          amount: Math.round(trialPrice * 100),
          currency: "INR"
        }
      }];
      
      // Delay main billing by trial duration
      options.start_at = Math.floor(Date.now() / 1000) + (trialDurationDays * 24 * 60 * 60) + 60;
    }

    console.log('🚀 [AutoPay Active]:', JSON.stringify(options, null, 2));
    const subscription = await rzp.subscriptions.create(options);

    // Link user
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, {
      'subscription.razorpay_subscription_id': subscription.id,
      'subscription.plan': plan._id
    });

    return res.status(200).json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        planName: plan.name,
        amount: isTrial ? subSettings.trialPrice : plan.price,
        trialDays: isTrial ? subSettings.trialDurationDays : 0,
        isTrial: isTrial,
        description: isTrial ? `Set AutoPay & Start ${subSettings.trialDurationDays} Day Trial` : `Subscribe to ${plan.name} Plan`,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    console.error('Final Creation Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Error initiating payment' });
  }
};

// @desc    Verify Razorpay Payment Signature and activate
// @route   POST /api/user/subscription/verify
exports.verifySubscription = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;
    const crypto = require('crypto');
    const Razorpay = require('razorpay');

    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    
    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signData = razorpay_payment_id + "|" + razorpay_subscription_id;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signData.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature Mismatch:', { expectedSignature, razorpay_signature });
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 2. Fetch User & Update Access
    const User = require('../models/User');
    const user = await User.findOne({ 'subscription.razorpay_subscription_id': razorpay_subscription_id });
    if (!user) return res.status(404).json({ success: false, message: 'User not found for this subscription' });

    // 3. Check if it was a trial creation
    const sub = await rzp.subscriptions.fetch(razorpay_subscription_id);
    const isTrial = sub.notes && sub.notes.isTrial === "true";
    
    // 4. Activate Access
    if (isTrial) {
      // --- TRIAL ACTIVATION ---
      const AppSetting = require('../models/AppSetting');
      const settings = await AppSetting.findOne();
      const trialDays = settings?.subscriptionSettings?.trialDurationDays || 4;
      const trialPrice = settings?.subscriptionSettings?.trialPrice || 9;

      user.isActive = true;
      user.subscription.isActive = true;
      user.subscription.isTrialUsed = true;
      user.subscription.startDate = new Date();
      user.subscription.status = 'active';
      // End date: 14, 15, 16, 17 (Total 4 days). Ends on 17th.
      user.subscription.endDate = new Date(Date.now() + ((trialDays - 1) * 24 * 60 * 60 * 1000));
      await user.save();

      // Record in CustomerTrial
      const CustomerTrial = require('../models/CustomerTrial');
      await CustomerTrial.create({
        user: user._id,
        trialDaysCount: trialDays,
        startDate: new Date(),
        endDate: user.subscription.endDate,
        trialPrice: trialPrice,
        paymentStatus: 'Success',
        razorpaySubscriptionId: razorpay_subscription_id
      });
    } else {
      // --- REGULAR PLAN ACTIVATION ---
      const SubscriptionPlan = require('../models/SubscriptionPlan');
      const plan = await SubscriptionPlan.findById(user.subscription.plan);
      
      user.isActive = true;
      user.subscription.isActive = true;
      user.subscription.startDate = new Date();
      user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      user.subscription.status = 'active';
      await user.save();

      // Record in CustomerSubscription
      const CustomerSubscription = require('../models/CustomerSubscription');
      await CustomerSubscription.findOneAndUpdate(
        { razorpaySubscriptionId: razorpay_subscription_id },
        {
          user: user._id,
          plan: user.subscription.plan || plan?._id,
          status: 'active',
          price: plan?.price || 699,
          startDate: new Date(),
          endDate: user.subscription.endDate,
          rawRazorpayData: sub
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ success: true, message: 'Payment verified and access granted' });
  } catch (err) {
    console.error('Final Verification Error:', err);
    res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  }
};

// --- ADMIN METHODS ---

exports.createPlan = async (req, res) => {
  try {
    const { name, price, duration, description } = req.body;
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const rpDetails = getRazorpayPlanDetails(duration);
    const rpPlan = await rzp.plans.create({
      period: rpDetails.period,
      interval: rpDetails.interval,
      item: {
        name: name,
        amount: price * 100,
        currency: 'INR',
        description: description
      }
    });

    const plan = await SubscriptionPlan.create({
      ...req.body,
      razorpayPlanId: rpPlan.id
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { name, price, duration, description } = req.body;
    let plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    if (price !== plan.price || duration !== plan.duration) {
      const rpDetails = getRazorpayPlanDetails(duration);
      const rpPlan = await rzp.plans.create({
        period: rpDetails.period,
        interval: rpDetails.interval,
        item: {
          name: name || plan.name,
          amount: price * 100,
          currency: 'INR',
          description: description || plan.description
        }
      });
      req.body.razorpayPlanId = rpPlan.id;
    }

    plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    await plan.deleteOne();
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
};
exports.getActiveSubscriptions = async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ 'subscription.isActive': true })
      .populate('subscription.plan')
      .select('name email subscription phone createdAt')
      .sort({ 'subscription.startDate': -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// @desc    Handle Razorpay Webhooks
// @route   POST /api/user/subscription/webhook
exports.handleWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'inplay123';
  const crypto = require('crypto');

  // 1. Verify Signature
  const signature = req.headers['x-razorpay-signature'];
  const body = req.rawBody || JSON.stringify(req.body); 
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (process.env.NODE_ENV === 'production' && signature !== expectedSignature) {
    console.error('❌ Invalid Razorpay Webhook Signature');
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  console.log('🔔 Razorpay Webhook Received:', event);

  try {
    // 2. Extract Data based on Order or Subscription
    let payment, subscription, order, userRef, notes;

    if (payload.subscription) {
      subscription = payload.subscription.entity;
      payment = payload.payment ? payload.payment.entity : null;
      notes = subscription.notes || (payment ? payment.notes : {});
      userRef = notes.userId;
    } else if (payload.order) {
      order = payload.order.entity;
      payment = payload.payment ? payload.payment.entity : null;
      notes = order.notes || (payment ? payment.notes : {});
      userRef = notes.userId;
    } else if (payload.payment) {
      payment = payload.payment.entity;
      notes = payment.notes || {};
      userRef = notes.userId;
    }

    if (!userRef) {
      console.log('⚠️ No userId found in webhook notes, skipping.');
      return res.status(200).json({ success: true, message: 'No user to update' });
    }

    // 3. Find and Update User
    const User = require('../models/User');
    const user = await User.findById(userRef);
    if (!user) {
      console.log('⚠️ User not found for webhook userId:', userRef);
      return res.status(200).json({ success: true, message: 'User not found' });
    }

    if (event === 'payment.captured' || event === 'subscription.activated' || event === 'subscription.charged' || event === 'subscription.authenticated') {
      user.isActive = true;
      user.subscription.isActive = true;
      user.subscription.startDate = new Date();
      user.subscription.status = 'active';
      
      const trialKey = Object.keys(notes).find(key => key.toLowerCase() === 'istrial');
      // If paid_count > 0, it means the trial has ended and a real payment was taken, even if notes say isTrial: true
      const isTrialType = trialKey && (notes[trialKey] === 'true' || notes[trialKey] === true) && (subscription ? subscription.paid_count === 0 : true);

      if (isTrialType) {
        // --- TRIAL HANDLING ---
        const trialDays = parseInt(notes.trialDays) || 4;
        user.subscription.isTrialUsed = true;
        // End date: 14, 15, 16, 17 (Total 4 days). Ends on 17th.
        user.subscription.endDate = new Date(Date.now() + ((trialDays - 1) * 24 * 60 * 60 * 1000));
        await user.save();
        
        // Record in customertrialdays
        const CustomerTrial = require('../models/CustomerTrial');
        const existingTrial = await CustomerTrial.findOne({ razorpaySubscriptionId: order?.id || subscription?.id || (payment?.order_id || payment?.id) });
        if (!existingTrial) {
          await CustomerTrial.create({
            user: user._id,
            trialDaysCount: trialDays,
            startDate: new Date(),
            endDate: user.subscription.endDate,
            trialPrice: (payment?.amount || 900) / 100,
            paymentStatus: 'Success',
            razorpaySubscriptionId: order?.id || subscription?.id || (payment?.order_id || payment?.id)
          });
        }
      } else {
        // --- PLAN HANDLING ---
        user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await user.save();

        // Record in CustomerSubscription
        const CustomerSubscription = require('../models/CustomerSubscription');
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        const plan = await SubscriptionPlan.findById(user.subscription.plan);

        await CustomerSubscription.findOneAndUpdate(
          { razorpaySubscriptionId: subscription?.id || (payment?.order_id || payment?.id) },
          {
            user: user._id,
            plan: user.subscription.plan,
            status: 'active',
            price: plan?.price || (payment?.amount || 69900) / 100,
            startDate: new Date(),
            endDate: user.subscription.endDate
          },
          { upsert: true, new: true }
        );
      }
      
      console.log(`✅ Webhook: Activated access for ${user.email} (Type: ${isTrialType ? 'Trial' : 'Plan'})`);
    } else if (event === 'subscription.cancelled' || event === 'subscription.halted' || event === 'subscription.pending') {
      user.subscription.isActive = false;
      user.isActive = false;
      user.subscription.status = event === 'subscription.cancelled' ? 'cancelled' : 'active'; // keep active but inactive if pending
      await user.save();
      
      const statusText = event === 'subscription.cancelled' ? 'cancelled' : 'pending';
      const CustomerSubscription = require('../models/CustomerSubscription');
      await CustomerSubscription.findOneAndUpdate(
        { razorpaySubscriptionId: subscription?.id },
        { status: statusText }
      );
      
      console.log(`❌ Webhook: Deactivated access for ${user.email} (Event: ${event})`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Webhook Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get current user's subscription details
// @route   GET /api/user/subscription/status
exports.getSubscriptionDetails = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).populate('subscription.plan');
    
    if (!user.subscription || !user.subscription.isActive) {
      return res.status(200).json({ 
        success: true, 
        data: { isActive: false } 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        isActive: true,
        planName: user.subscription.plan?.name || 'Premium Plan',
        price: user.subscription.plan?.price || 699,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate,
        razorpaySubscriptionId: user.subscription.razorpay_subscription_id,
        isTrial: user.subscription.isTrialUsed,
        status: user.subscription.status || 'active'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Cancel subscription
// @route   POST /api/user/subscription/cancel
exports.cancelSubscription = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    if (!user || !user.subscription || !user.subscription.razorpay_subscription_id) {
      return res.status(400).json({ success: false, message: 'No active subscription found' });
    }

    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Cancel in Razorpay (at end of cycle)
    await rzp.subscriptions.cancel(user.subscription.razorpay_subscription_id);

    // Update DB
    user.subscription.status = 'cancelled';
    await user.save();

    const CustomerSubscription = require('../models/CustomerSubscription');
    await CustomerSubscription.findOneAndUpdate(
      { razorpaySubscriptionId: user.subscription.razorpay_subscription_id },
      { status: 'cancelled' }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Subscription cancelled successfully. You will have access until ' + new Date(user.subscription.endDate).toLocaleDateString() 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
