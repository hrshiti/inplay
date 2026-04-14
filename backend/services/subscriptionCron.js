const cron = require('node-cron');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Razorpay = require('razorpay');

const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Automatically handle transition from Trial to Monthly Plan
 */
const initiateSubscriptionTransition = async () => {
    console.log('🕒 [Cron] Checking for expired trials...');
    
    try {
        const now = new Date();
        
        // 1. Find users whose trial has ended but are still marked as active
        const expiredTrialUsers = await User.find({
            'subscription.isActive': true,
            'subscription.isTrialUsed': true,
            'subscription.endDate': { $lte: now }
        });

        if (expiredTrialUsers.length === 0) {
            console.log('✅ [Cron] No expired trials found.');
            return;
        }

        console.log(`🔄 [Cron] Found ${expiredTrialUsers.length} expired trials. Transitioning to defaults...`);

        // 2. Fetch a default monthly plan to transition them to
        let defaultPlan = await SubscriptionPlan.findOne({ duration: 'monthly', isActive: true });
        if (!defaultPlan) {
            defaultPlan = await SubscriptionPlan.findOne({ isActive: true });
        }

        if (!defaultPlan || !defaultPlan.razorpayPlanId) {
            console.error('❌ [Cron] No default Razorpay plan found. Cannot create auto-subscriptions.');
            return;
        }

        for (const user of expiredTrialUsers) {
            try {
                console.log(`📦 [Cron] Transitioning user: ${user.email}`);

                // 3. Create a Razorpay Subscription for them (Unpaid state)
                const subscription = await rzp.subscriptions.create({
                    plan_id: defaultPlan.razorpayPlanId,
                    customer_notify: 1,
                    total_count: 12, // Annual cycles
                    notes: {
                        userId: user._id.toString(),
                        autoTransition: "true",
                        previousTrial: "true"
                    }
                });

                // 4. Update User: Mark as inactive (must pay) but link the new subscription
                user.subscription.isActive = false; // User must pay to re-activate
                user.subscription.razorpay_subscription_id = subscription.id;
                user.subscription.plan = defaultPlan._id;
                await user.save();

                // 5. RECORD IN MONGODB: Save to CustomerSubscription collection
                const CustomerSubscription = require('../models/CustomerSubscription');
                await CustomerSubscription.create({
                    user: user._id,
                    plan: defaultPlan._id,
                    razorpaySubscriptionId: subscription.id,
                    status: subscription.status || 'created',
                    price: defaultPlan.price,
                    shortUrl: subscription.short_url,
                    rawRazorpayData: subscription, // Store the FULL object
                    isAutoTransition: true,
                    startDate: new Date()
                });

                console.log(`✅ [Cron] User ${user.email} transitioned and recorded in MongoDB.`);
            } catch (err) {
                console.error(`❌ [Cron] Failed for user ${user._id}:`, err.message);
                // Even if subscription fails, deactivate them to prevent free access
                user.subscription.isActive = false;
                await user.save();
            }
        }
    } catch (err) {
        console.error('🔥 [Cron Critical Error]:', err.message);
    }
};

// Schedule: Run every 5 seconds FOR TESTING
const startSubscriptionCron = () => {
    console.log('🚀 [Subscription Cron] Initialized and running every 5 seconds (TEST MODE).');
    
    // Check for expired trials every 5 seconds
    cron.schedule('*/5 * * * * *', initiateSubscriptionTransition);
};

module.exports = { startSubscriptionCron };
