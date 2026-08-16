const razorpayService = require('../modules/payment/services/razorpayService');
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
    case 'lifetime':
      return { period: 'lifetime', interval: 0 };
    default:
      return { period: 'monthly', interval: 1 };
  }
};

// Helper to calculate end date based on duration
const calculateEndDate = (startDate, duration) => {
  const date = new Date(startDate);
  switch (duration) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'half-yearly':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'lifetime':
      date.setFullYear(2099, 11, 31); // 2099-12-31
      break;
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date;
};

// How many recurring billing cycles a new subscription mandate should be set
// up for. Razorpay bills the ₹1 trial/addon fee as part of the authorisation
// transaction - it is NOT one of the counted cycles (confirmed against a real
// subscription: paid_count stayed 0 after the addon was captured), so this
// only needs to cover the real recurring charges. Memberships should keep
// renewing until the user cancels or a payment fails, not stop after a
// short, duration-blind cycle count - but Razorpay requires a finite
// total_count (their documented ceiling is a 100-year subscription
// duration). We approximate "until cancelled" with one fixed real-world time
// horizon, converted into however many cycles THIS plan's period/interval
// need to cover it - so it scales automatically for any duration (monthly,
// half-yearly, yearly, or anything added later) without new cases here.
const RECURRING_HORIZON_MONTHS = 240; // 20 years - well inside Razorpay's 100-year cap
const getTotalCountForPlan = (rpDetails) => {
  const cycleMonths = rpDetails.period === 'yearly' ? rpDetails.interval * 12 : rpDetails.interval;
  return Math.max(1, Math.ceil(RECURRING_HORIZON_MONTHS / cycleMonths));
};

// @desc    Get all subscription plans (for both Admin and User)
exports.getPlans = async (req, res) => {
  try {
    const query = req.query.all === 'true' ? {} : { isActive: true };
    const plans = await SubscriptionPlan.find(query).sort({ order: 1, price: 1 });
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

    const rzp = razorpayService.getInstance();

    if (!process.env.RAZORPAY_KEY_ID) {
      throw new Error('Razorpay Keys are missing in Server .env');
    }

    // 2. Fetch Subscription Settings (Dynamic Price/Days)
    const settings = await AppSetting.findOne();
    const subSettings = settings?.subscriptionSettings || { trialPrice: 9, trialDurationDays: 4 };

    // 2. Fetch Plan - must be exactly the plan the user selected. An invalid
    // or missing planId is a hard error now, never a silent fallback to
    // "any active plan" (that used to happen here, and could route a
    // purchase - trial or not - onto a plan the user never chose).
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    if (!plan.isActive) return res.status(400).json({ success: false, message: 'This plan is not currently available.' });

    // Trial eligibility is by plan TYPE (recurring vs one-time), never by a
    // specific duration name or price - so any current or future recurring
    // plan (monthly, half-yearly, yearly, or anything added later) is
    // automatically trial-eligible without touching this check again.
    // Lifetime is the only one-time (non-recurring) plan type, so it's the
    // only one excluded.
    if (isTrial && plan.duration === 'lifetime') {
      return res.status(400).json({ success: false, message: 'Trial is not available for the Lifetime plan.' });
    }

    // Razorpay period/interval for this plan's duration - computed once and
    // reused below both for self-healing the Razorpay Plan and for sizing
    // total_count, so both stay in sync automatically for any duration.
    const rpDetails = getRazorpayPlanDetails(plan.duration);

    // Self-healing for Plan ID
    if (!plan.razorpayPlanId) {
      if (plan.duration !== 'lifetime') {
        const newRpPlan = await rzp.plans.create({
          period: rpDetails.period,
          interval: rpDetails.interval,
          item: { name: plan.name, amount: plan.price * 100, currency: 'INR' }
        });
        plan.razorpayPlanId = newRpPlan.id;
      } else {
        plan.razorpayPlanId = 'LIFETIME_PLAN';
      }
      await plan.save();
    }

    // --- LIFETIME ONE-TIME ORDER HANDLING ---
    if (plan.duration === 'lifetime') {
      const order = await rzp.orders.create({
        amount: Math.round(plan.price * 100),
        currency: 'INR',
        receipt: `lt_${req.user.id.toString().slice(-6)}_${Date.now()}`,
        notes: {
          userId: req.user.id.toString(),
          planId: plan._id.toString(),
          isLifetime: "true"
        }
      });

      const User = require('../models/User');

      return res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          isOrder: true,
          planName: plan.name,
          amount: plan.price,
          trialDays: 0,
          isTrial: false,
          isLifetime: true,
          description: `Lifetime Access to ${plan.name} Plan (One-Time Payment)`,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID
        }
      });
    }

    // 3. Prepare Subscription Options (AutoPay Set)
    const options = {
      plan_id: plan.razorpayPlanId,
      customer_notify: 1, // Let Razorpay notify user
      total_count: getTotalCountForPlan(rpDetails), // ongoing membership - see getTotalCountForPlan above
      quantity: 1,
      notes: {
        userId: req.user.id.toString(),
        isTrial: isTrial ? "true" : "false",
        planId: plan._id.toString()
      }
    };

    if (isTrial) {
      // --- PAID TRIAL + AUTOPAY MANDATE ---
      const trialDurationDays = parseInt(subSettings.trialDurationDays) || 4;
      const trialPrice = parseFloat(subSettings.trialPrice) || 9;

      options.notes.trialDays = trialDurationDays.toString();

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
      'subscription.razorpay_subscription_id': subscription.id
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
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, isLifetime, planId: reqPlanId } = req.body;
    const crypto = require('crypto');
    const rzp = razorpayService.getInstance();

    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // The subscription id Razorpay actually signs with is not reliably present in
    // the client's checkout response for UPI Autopay mandate payments - Checkout
    // hands back only order-style fields for that transaction even though it used
    // the subscription id internally to compute the signature. We already know the
    // subscription id from createSubscription() (it's on the user's own record), so
    // use that as the source of truth instead of trusting req.body for it.
    const storedSubscriptionId = user.subscription?.razorpay_subscription_id;

    // --- LIFETIME ORDER VERIFICATION ---
    // A genuine one-time Lifetime purchase never has a stored subscription id
    // (it's created via rzp.orders.create, never rzp.subscriptions.create).
    if (isLifetime || !storedSubscriptionId) {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const signData = (razorpay_order_id || "") + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signData.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        console.error('Signature Mismatch for Lifetime Order:', { expectedSignature, razorpay_signature });
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      let order = null;
      try {
        if (razorpay_order_id) order = await rzp.orders.fetch(razorpay_order_id);
      } catch (e) {}

      const planId = order?.notes?.planId || reqPlanId || user.subscription?.plan;
      const SubscriptionPlan = require('../models/SubscriptionPlan');
      const plan = await SubscriptionPlan.findById(planId);

      user.isActive = true;
      user.subscription.isActive = true;
      user.subscription.plan = plan ? plan._id : user.subscription?.plan;
      user.subscription.startDate = new Date();
      user.subscription.endDate = new Date('2099-12-31'); // Never expires
      user.subscription.status = 'active';
      user.subscription.razorpay_subscription_id = null;
      await user.save();

      const CustomerSubscription = require('../models/CustomerSubscription');
      await CustomerSubscription.findOneAndUpdate(
        { razorpaySubscriptionId: razorpay_order_id || razorpay_payment_id },
        {
          user: user._id,
          plan: plan ? plan._id : user.subscription?.plan,
          status: 'active',
          price: plan ? plan.price : ((order?.amount || 0) / 100),
          startDate: new Date(),
          endDate: new Date('2099-12-31'),
          rawRazorpayData: order || {}
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Verified Lifetime Access for ${user.email}`);
      return res.status(200).json({ success: true, message: 'Payment verified and Lifetime access granted' });
    }

    // --- SUBSCRIPTION VERIFICATION (regular plans + trial) ---
    // 1. Verify Signature - using the subscription id we stored ourselves at
    // creation time, not whatever (if anything) the client's checkout response
    // happened to include.
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signData = razorpay_payment_id + "|" + storedSubscriptionId;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signData.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature Mismatch:', { expectedSignature, razorpay_signature });
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 2. Check if it was a trial creation
    const sub = await rzp.subscriptions.fetch(storedSubscriptionId);
    const isTrial = sub.notes && sub.notes.isTrial === "true";

    // 3. Activate Access
    if (isTrial) {
      // --- TRIAL ACTIVATION ---
      const AppSetting = require('../models/AppSetting');
      const settings = await AppSetting.findOne();
      const trialDays = settings?.subscriptionSettings?.trialDurationDays || 4;
      const trialPrice = settings?.subscriptionSettings?.trialPrice || 9;

      user.isActive = true;
      user.subscription.isActive = true;
      user.subscription.isTrialUsed = true;
      user.subscription.plan = sub.notes?.planId || reqPlanId || user.subscription.plan;
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
        razorpaySubscriptionId: storedSubscriptionId
      });
    } else {
      // --- REGULAR PLAN ACTIVATION ---
      const SubscriptionPlan = require('../models/SubscriptionPlan');
      const planId = sub.notes?.planId || reqPlanId || user.subscription.plan;
      const plan = await SubscriptionPlan.findById(planId);
      
      user.isActive = true;
      user.subscription.isActive = true;
      user.subscription.plan = plan ? plan._id : user.subscription.plan;
      user.subscription.startDate = new Date();
      
      const duration = plan ? plan.duration : 'monthly';
      user.subscription.endDate = calculateEndDate(user.subscription.startDate, duration);
      user.subscription.status = 'active';
      await user.save();

      // Record in CustomerSubscription
      const CustomerSubscription = require('../models/CustomerSubscription');
      await CustomerSubscription.findOneAndUpdate(
        { razorpaySubscriptionId: storedSubscriptionId },
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
    const rzp = razorpayService.getInstance();

    let rpPlanId = 'LIFETIME_PLAN';
    if (duration !== 'lifetime') {
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
      rpPlanId = rpPlan.id;
    }

    const plan = await SubscriptionPlan.create({
      ...req.body,
      razorpayPlanId: rpPlanId
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

    const rzp = razorpayService.getInstance();

    if (price !== plan.price || duration !== plan.duration) {
      if (duration !== 'lifetime') {
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
      } else {
        req.body.razorpayPlanId = 'LIFETIME_PLAN';
      }
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
      .sort({ 'subscription.startDate': -1 })
      .limit(2000);

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

      const lifetimeKey = Object.keys(notes).find(key => key.toLowerCase() === 'islifetime');
      const isLifetimeType = lifetimeKey && (notes[lifetimeKey] === 'true' || notes[lifetimeKey] === true);

      if (isTrialType) {
        // --- TRIAL HANDLING ---
        const trialDays = parseInt(notes.trialDays) || 4;
        user.subscription.isTrialUsed = true;
        user.subscription.plan = notes.planId || user.subscription.plan;
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
      } else if (isLifetimeType) {
        // --- LIFETIME HANDLING ---
        user.subscription.endDate = new Date('2099-12-31'); // Never expires
        user.subscription.razorpay_subscription_id = null;
        user.subscription.plan = notes.planId || user.subscription.plan;
        await user.save();

        const CustomerSubscription = require('../models/CustomerSubscription');
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        const plan = await SubscriptionPlan.findById(notes.planId || user.subscription.plan);

        await CustomerSubscription.findOneAndUpdate(
          { razorpaySubscriptionId: order?.id || (payment?.order_id || payment?.id) },
          {
            user: user._id,
            plan: plan?._id || user.subscription.plan,
            status: 'active',
            price: plan?.price || ((payment?.amount || 0) / 100),
            startDate: new Date(),
            endDate: new Date('2099-12-31')
          },
          { upsert: true, new: true }
        );
      } else {
        // --- PLAN HANDLING ---
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        const plan = await SubscriptionPlan.findById(notes.planId || user.subscription.plan);
        const duration = plan ? plan.duration : 'monthly';

        user.subscription.plan = plan ? plan._id : user.subscription.plan;
        user.subscription.endDate = calculateEndDate(user.subscription.startDate, duration);
        await user.save();

        // Record in CustomerSubscription
        const CustomerSubscription = require('../models/CustomerSubscription');

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
    
    // Strict check: If status is cancelled, treat as inactive for immediate revocation
    if (!user.subscription || !user.subscription.isActive || user.subscription.status === 'cancelled') {
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
exports.cancelSubscription = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    if (!user || !user.subscription || !user.subscription.razorpay_subscription_id) {
      return res.status(400).json({ success: false, message: 'No active subscription found or subscription ID missing' });
    }

    const rzp = razorpayService.getInstance();
    const subscriptionId = user.subscription.razorpay_subscription_id;

    console.log(`📂 Attempting to cancel subscription: ${subscriptionId} for user: ${user.email}`);

    try {
      // 1. Fetch current status from Razorpay
      const rzpSub = await rzp.subscriptions.fetch(subscriptionId);
      
      // 2. Only call cancel if it's in a cancellable state
      if (['created', 'authenticated', 'active', 'pending'].includes(rzpSub.status)) {
        // Pass cancel_at_cycle_end: 0 for immediate cancellation
        await rzp.subscriptions.cancel(subscriptionId, { cancel_at_cycle_end: 0 });
        console.log(`✅ Razorpay subscription ${subscriptionId} cancelled IMMEDIATELY.`);
      } else {
        console.log(`ℹ️ Razorpay subscription ${subscriptionId} is already in state: ${rzpSub.status}. Skipping Razorpay cancel call.`);
      }
    } catch (rzpErr) {
      console.error('⚠️ Razorpay cancellation error (might be already cancelled):', rzpErr.message);
    }

    // 3. Update User DB - IMMEDIATE DEACTIVATION (Forceful update)
    // We update using findOneAndUpdate to bypass potential schema save conflicts/middlewares
    await User.findOneAndUpdate(
      { _id: req.user.id },
      { 
        $set: { 
          'subscription.status': 'cancelled',
          'subscription.isActive': false 
        } 
      }
    );
    
    console.log(`✅ Database updated: User ${user.email} subscription deactivated.`);

    // 4. Update CustomerSubscription record
    const CustomerSubscription = require('../models/CustomerSubscription');
    await CustomerSubscription.findOneAndUpdate(
      { razorpaySubscriptionId: subscriptionId },
      { status: 'cancelled' }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Subscription cancelled immediately. You no longer have access to premium content.' 
    });
  } catch (err) {
    console.error('❌ Final Cancel Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
  }
};
