const { sendPushNotification } = require('../services/firebaseService');
const User = require('../models/User');

/**
 * Send notification to all users
 * @param {Object} payload - { title, body, imageUrl, data }
 */
const notifyAllUsers = async (payload) => {
    try {
        // Find all users who have notifications enabled or just all users with tokens
        const users = await User.find({
            $or: [
                { fcm_web: { $exists: true, $not: { $size: 0 } } },
                { fcm_mobile: { $exists: true, $not: { $size: 0 } } }
            ]
        }).select('fcm_web fcm_mobile');

        if (!users || users.length === 0) {
            console.log('No users with FCM tokens found');
            return;
        }

        let webTokens = [];
        let mobileTokens = [];

        users.forEach(user => {
            if (user.fcm_web && user.fcm_web.length > 0) {
                webTokens = [...webTokens, ...user.fcm_web];
            }
            if (user.fcm_mobile && user.fcm_mobile.length > 0) {
                mobileTokens = [...mobileTokens, ...user.fcm_mobile];
            }
        });

        const uniqueWebTokens = [...new Set(webTokens)];
        const uniqueMobileTokens = [...new Set(mobileTokens)];

        // Send to Web
        if (uniqueWebTokens.length > 0) {
            await sendPushNotification(uniqueWebTokens, {
                ...payload,
                data: { ...payload.data, platform: 'web' }
            });
        }

        // Send to Mobile
        if (uniqueMobileTokens.length > 0) {
            await sendPushNotification(uniqueMobileTokens, {
                ...payload,
                data: { ...payload.data, platform: 'mobile' }
            });
        }

    } catch (error) {
        console.error('Error in notifyAllUsers:', error);
    }
};

/**
 * Send notification to subscribed users
 * @param {Object} payload - { title, body, imageUrl, data }
 */
const notifySubscribedUsers = async (payload) => {
    try {
        const users = await User.find({
            'subscription.isActive': true,
            $or: [
                { fcm_web: { $exists: true, $not: { $size: 0 } } },
                { fcm_mobile: { $exists: true, $not: { $size: 0 } } }
            ]
        }).select('fcm_web fcm_mobile');

        if (!users || users.length === 0) return;

        let tokens = [];
        users.forEach(user => {
            if (user.fcm_web) tokens = [...tokens, ...user.fcm_web];
            if (user.fcm_mobile) tokens = [...tokens, ...user.fcm_mobile];
        });

        const uniqueTokens = [...new Set(tokens)];
        if (uniqueTokens.length > 0) {
            await sendPushNotification(uniqueTokens, payload);
        }
    } catch (error) {
        console.error('Error in notifySubscribedUsers:', error);
    }
};

/**
 * Send notification to specific user
 * @param {string} userId
 * @param {Object} payload - { title, body, imageUrl, data }
 */
const notifySpecificUser = async (userId, payload) => {
    try {
        const user = await User.findById(userId).select('fcm_web fcm_mobile');
        if (!user) return;

        let tokens = [...(user.fcm_web || []), ...(user.fcm_mobile || [])];
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length > 0) {
            return await sendPushNotification(uniqueTokens, payload);
        }
    } catch (error) {
        console.error('Error in notifySpecificUser:', error);
        throw error;
    }
};

module.exports = {
    notifyAllUsers,
    notifySubscribedUsers,
    notifySpecificUser
};
