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
            if (user.fcm_mobile && user.fcm_mobile.length > 0) {
                mobileTokens = [...mobileTokens, ...user.fcm_mobile];
            } else if (user.fcm_web && user.fcm_web.length > 0) {
                webTokens = [...webTokens, ...user.fcm_web];
            }
        });

        const uniqueWebTokens = [...new Set(webTokens)];
        const uniqueMobileTokens = [...new Set(mobileTokens)];

        // Send to Web
        if (uniqueWebTokens.length > 0) {
            console.log(`📡 Sending notification to ${uniqueWebTokens.length} Web tokens`);
            const response = await sendPushNotification(uniqueWebTokens, {
                ...payload,
                data: { ...payload.data, platform: 'web' }
            });
            await cleanupTokens(uniqueWebTokens, response);
        }

        // Send to Mobile
        if (uniqueMobileTokens.length > 0) {
            console.log(`📡 Sending notification to ${uniqueMobileTokens.length} Mobile tokens`);
            const response = await sendPushNotification(uniqueMobileTokens, {
                ...payload,
                data: { ...payload.data, platform: 'mobile' }
            });
            await cleanupTokens(uniqueMobileTokens, response);
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

        let webTokens = [];
        let mobileTokens = [];
        users.forEach(user => {
            if (user.fcm_mobile && user.fcm_mobile.length > 0) {
                mobileTokens = [...mobileTokens, ...user.fcm_mobile];
            } else if (user.fcm_web && user.fcm_web.length > 0) {
                webTokens = [...webTokens, ...user.fcm_web];
            }
        });

        const uniqueTokens = [...new Set([...webTokens, ...mobileTokens])];
        if (uniqueTokens.length > 0) {
            const response = await sendPushNotification(uniqueTokens, payload);
            await cleanupTokens(uniqueTokens, response);
        }
    } catch (error) {
        console.error('Error in notifySubscribedUsers:', error);
    }
};

/**
 * Helper to remove invalid tokens from all users
 */
const cleanupTokens = async (tokens, response) => {
    if (!response || response.failureCount === 0) return;

    const tokensToRemove = [];
    response.responses.forEach((resp, idx) => {
        if (!resp.success) {
            const errorMessage = resp.error?.message || '';
            const errorCode = resp.error?.code;
            if (
                errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token' ||
                errorMessage.includes('NotRegistered') ||
                errorMessage.includes('unregistered')
            ) {
                tokensToRemove.push(tokens[idx]);
            }
        }
    });

    if (tokensToRemove.length > 0) {
        console.log(`🧹 Removing ${tokensToRemove.length} stale tokens from database`);
        await User.updateMany({}, {
            $pull: {
                fcm_web: { $in: tokensToRemove },
                fcm_mobile: { $in: tokensToRemove }
            }
        });
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

        let tokens = [];
        if (user.fcm_mobile && user.fcm_mobile.length > 0) {
            tokens = user.fcm_mobile;
        } else if (user.fcm_web && user.fcm_web.length > 0) {
            tokens = user.fcm_web;
        }
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length > 0) {
            const response = await sendPushNotification(uniqueTokens, payload);
            
            // Clean up invalid tokens
            if (response && response.failureCount > 0) {
                const tokensToRemove = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        const errorMessage = resp.error?.message || '';
                        // Firebase errors for stale tokens
                        if (
                            errorCode === 'messaging/registration-token-not-registered' ||
                            errorCode === 'messaging/invalid-registration-token' ||
                            errorMessage.includes('NotRegistered') ||
                            errorMessage.includes('unregistered')
                        ) {
                            tokensToRemove.push(uniqueTokens[idx]);
                        }
                    }
                });

                if (tokensToRemove.length > 0) {
                    console.log(`🧹 Removing ${tokensToRemove.length} invalid tokens for user ${userId}`);
                    await User.findByIdAndUpdate(userId, {
                        $pull: {
                            fcm_web: { $in: tokensToRemove },
                            fcm_mobile: { $in: tokensToRemove }
                        }
                    });
                }
            }
            return response;
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
