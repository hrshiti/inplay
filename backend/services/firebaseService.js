const admin = require('firebase-admin');
require('dotenv').config();

/**
 * Initialize Firebase Admin SDK using Base64 credentials from environment
 */
const initializeFirebase = () => {
    try {
        if (admin.apps.length) return;

        let serviceAccount;
        const base64Data = process.env.FIREBASE_SERVICE;

        if (base64Data) {
            let data = base64Data.trim();
            // Decode if it's base64, otherwise assume it's already a JSON string
            if (!data.startsWith('{')) {
                data = Buffer.from(data, 'base64').toString('utf8');
            }
            serviceAccount = JSON.parse(data);
            
            // Fix private key formatting
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin Initialized from Base64');
        } else {
            console.warn('⚠️ FIREBASE_SERVICE environment variable not found. Push notifications will not work.');
        }
    } catch (error) {
        console.error('❌ Firebase Initialization Error:', error.message);
    }
};

initializeFirebase();

/**
 * Send push notification to multiple tokens
 */
const sendPushNotification = async (tokens, payload) => {
    if (!tokens?.length || !admin.apps.length) return null;

    const message = {
        notification: {
            title: payload.title,
            body: payload.body,
        },
        data: payload.data || {},
        tokens: tokens,
        android: {
            priority: 'high',
            notification: {
                channelId: 'inplay_notifications',
                priority: 'max',
                visibility: 'public',
                sound: 'default',
                defaultSound: true,
                notificationCount: 1,
            }
        },
        webpush: {
            headers: {
                Urgency: 'high'
            },
            notification: {
                requireInteraction: true,
                badge: '/favicon.png',
                icon: '/favicon.png',
                click_action: payload.data?.link || '/'
            }
        }
    };

    if (payload.imageUrl) {
        let hydratedUrl = payload.imageUrl;
        if (hydratedUrl.startsWith('/')) {
            const backendUrl = (process.env.BACKEND_URL || 'https://api.inplays.in').replace(/\/$/, '');
            hydratedUrl = `${backendUrl}${hydratedUrl}`;
        }
        
        // Global
        message.notification.image = hydratedUrl;
        
        // Android Specific
        if (message.android && message.android.notification) {
            message.android.notification.image = hydratedUrl;
            message.android.notification.icon = hydratedUrl;
        }
        
        // Webpush Specific
        if (message.webpush && message.webpush.notification) {
            message.webpush.notification.image = hydratedUrl;
            message.webpush.notification.icon = hydratedUrl;
        }
        
        // Data Fallback (For background processing in various mobile SDKs)
        message.data.image = hydratedUrl;
        message.data.imageUrl = hydratedUrl;
        message.data.picture = hydratedUrl;
        message.data.icon = hydratedUrl;
        message.data.large_icon = hydratedUrl;
        message.data.small_icon = hydratedUrl;
        
        console.log(`🖼️ Attached hydrated image to notification: ${hydratedUrl}`);
    }

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`📡 Firebase Multicast Response:`);
        console.log(`   - Success: ${response.successCount}`);
        console.log(`   - Failure: ${response.failureCount}`);
        
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`   - Error for token ${tokens[idx].substring(0, 10)}...: ${resp.error.message}`);
                }
            });
        }
        return response;
    } catch (error) {
        console.error('❌ Push Notification Error:', error.message);
        throw error;
    }
};

module.exports = {
    sendPushNotification,
    admin
};
