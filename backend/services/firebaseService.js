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
    };

    if (payload.imageUrl) {
        message.notification.image = payload.imageUrl;
        message.data.image = payload.imageUrl;
    }

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`📡 Sent: ${response.successCount}, Failed: ${response.failureCount}`);
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
