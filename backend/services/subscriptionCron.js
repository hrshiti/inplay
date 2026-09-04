const cron = require('node-cron');
const User = require('../models/User');
const Razorpay = require('razorpay');

const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
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
        
        // 1. Bulk update users with expired subscriptions that do NOT have active Razorpay subscription ID
        const bulkResult = await User.updateMany(
            {
                'subscription.isActive': true,
                'subscription.endDate': { $lte: now },
                $or: [
                    { 'subscription.razorpay_subscription_id': { $exists: false } },
                    { 'subscription.razorpay_subscription_id': null },
                    { 'subscription.razorpay_subscription_id': '' }
                ]
            },
            { $set: { 'subscription.isActive': false } }
        );

        if (bulkResult.modifiedCount > 0) {
            console.log(`🚫 [Cron] Bulk deactivated ${bulkResult.modifiedCount} expired non-Razorpay users.`);
        }

        // 2. Limit processing for users with Razorpay subscriptions (batch of 50 at a time)
        const expiredRzpUsers = await User.find({
            'subscription.isActive': true,
            'subscription.endDate': { $lte: now },
            'subscription.razorpay_subscription_id': { $exists: true, $ne: null, $ne: '' }
        }).limit(50);

        if (expiredRzpUsers.length > 0) {
            console.log(`🔄 [Cron] Checking ${expiredRzpUsers.length} Razorpay subscriptions...`);

            for (const user of expiredRzpUsers) {
                try {
                    if (user.subscription.razorpay_subscription_id) {
                        const sub = await rzp.subscriptions.fetch(user.subscription.razorpay_subscription_id);
                        if (sub.status === 'active' || sub.status === 'authenticated') {
                             console.log(`ℹ️ [Cron] User ${user.email} is active in Razorpay. Skipping.`);
                             continue;
                        }
                    }

                    user.subscription.isActive = false;
                    await user.save();
                } catch (err) {
                    const reason = err?.error?.description || err?.message || 'Verification error';
                    console.error(`❌ [Cron] Error checking user ${user._id}: ${reason}. Marking inactive.`);
                    user.subscription.isActive = false;
                    await user.save();
                }
            }
        } else {
            console.log('✅ [Cron] No pending expired Razorpay memberships found.');
        }
    } catch (err) {
        console.error('🔥 [Cron Critical Error]:', err.message);
    }
};

// Schedule: Run every 6 hours instead of every 1 minute
const startSubscriptionCron = () => {
    console.log('🚀 [Subscription Cron] Initialized (runs every 6 hours).');
    
    // Check for expired memberships every 6 hours (00:00, 06:00, 12:00, 18:00)
    cron.schedule('0 */6 * * *', checkAndExpireSubscriptions);
};

module.exports = { startSubscriptionCron };

