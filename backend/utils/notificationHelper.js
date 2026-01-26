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

module.exports = {
    notifyAllUsers
};
