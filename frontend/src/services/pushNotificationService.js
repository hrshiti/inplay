import { messaging, getToken, onMessage } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const getApiUrl = () => {
    let base = rawApiUrl.replace(/\/$/, '');
    if (!base.endsWith('/api')) {
        base = `${base}/api`;
    }
    return base;
};

// Register service worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('✅ Service Worker registered:', registration.scope);
            return registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            throw error;
        }
    } else {
        throw new Error('Service Workers are not supported');
    }
}

// Request notification permission
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('Notification permission state:', permission);
        return permission === 'granted';
    }
    return false;
}

// Get FCM token
async function getFCMToken() {
    try {
        const registration = await registerServiceWorker();
        await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('✅ FCM Token obtained:', token);
            return token;
        } else {
            console.warn('❌ No FCM token available');
            return null;
        }
    } catch (error) {
        console.error('❌ Error getting FCM token:', error);
        throw error;
    }
}

// Register FCM token with backend
async function registerFCMTokenWithBackend(forceUpdate = false) {
    try {
        const authToken = localStorage.getItem('inplay_token');
        if (!authToken) {
            console.log('No auth token found, skipping FCM registration');
            return;
        }

        const token = await getFCMToken();
        if (!token) return;

        const savedToken = localStorage.getItem('fcm_token_web');
        if (savedToken === token && !forceUpdate) {
            console.log('FCM token already registered locally');
            return;
        }

        const API_URL = getApiUrl();
        console.log(`📡 Sending token to backend: ${API_URL}/user/auth/fcm-token`);

        const response = await fetch(`${API_URL}/user/auth/fcm-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ token, platform: 'web' })
        });

        const data = await response.json();
        if (data.success) {
            localStorage.setItem('fcm_token_web', token);
            console.log('✅ FCM token registered with backend successfully');
        } else {
            console.error('❌ Backend failed to save FCM token:', data.message);
        }
    } catch (error) {
        console.error('❌ Error in registerFCMTokenWithBackend:', error);
    }
}

// Setup foreground notification handler
function setupForegroundNotificationHandler(handler) {
    onMessage(messaging, (payload) => {
        console.log('📬 Foreground message received:', payload);

        if (Notification.permission === 'granted') {
            const notificationTitle = payload.notification?.title || 'InPlay';
            const notificationOptions = {
                body: payload.notification?.body,
                icon: '/favicon.png',
                image: payload.notification?.image || payload.data?.image,
                data: payload.data
            };
            new Notification(notificationTitle, notificationOptions);
        }

        if (handler) handler(payload);
    });
}

export {
    registerFCMTokenWithBackend,
    setupForegroundNotificationHandler,
    requestNotificationPermission
};
