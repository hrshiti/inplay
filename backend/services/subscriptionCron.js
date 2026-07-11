const cron = require('node-cron');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Razorpay = require('razorpay');

const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Safety Deactivation Guard
 * Deactivates users whose subscription/trial end date has passed.
 * Note: Webhooks usually handle this, but this is a fallback for reliability.
 */
const checkAndExpireSubscriptions = async () => {
    console.log('🕒 [Cron] Checking for expired memberships...');
    
    try {
        const now = new Date();
        
        // Find users whose endDate has passed and are still marked as active
        const expiredUsers = await User.find({
            'subscription.isActive': true,
            'subscription.endDate': { $lte: now }
        });

        if (expiredUsers.length === 0) {
            console.log('✅ [Cron] No expired memberships found.');
            return;
        }

        console.log(`🔄 [Cron] Found ${expiredUsers.length} expired memberships. Checking status...`);

        for (const user of expiredUsers) {
            try {
                // Check Razorpay status to see if payment was actually successful but webhook missed
                if (user.subscription.razorpay_subscription_id) {
                    const sub = await rzp.subscriptions.fetch(user.subscription.razorpay_subscription_id);
                    
                    // If Razorpay says it's active and has charges, we might need to update the endDate here
                    // but usually we trust the webhook. For safety, if it's "active" in RZP, we let it be.
                    if (sub.status === 'active' || sub.status === 'authenticated') {
                         console.log(`ℹ️ [Cron] User ${user.email} is active in Razorpay. Skipping deactivation.`);
                         continue;
                    }
                }

                console.log(`🚫 [Cron] Deactivating expired user: ${user.email}`);
                user.subscription.isActive = false;
                await user.save();
                
                console.log(`✅ [Cron] User ${user.email} deactivated.`);
            } catch (err) {
                const reason = err?.error?.description || err?.message || JSON.stringify(err);
                console.error(`❌ [Cron] Error processing user ${user._id}:`, reason);
            }
        }
    } catch (err) {
        console.error('🔥 [Cron Critical Error]:', err.message);
    }
};

// Schedule: Run every 1 minute 
const startSubscriptionCron = () => {
    console.log('🚀 [Subscription Cron] Initialized and running every 1 minute.');
    
    // Check for expired memberships every minute
    cron.schedule('*/1 * * * *', checkAndExpireSubscriptions);
};

module.exports = { startSubscriptionCron };
