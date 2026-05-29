import { messaging, getToken, onMessage, isSupported } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';

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
        const supported = await isSupported();
        if (!supported) {
            console.warn('❌ FCM is not supported in this browser/environment');
            return null;
        }

        const registration = await registerServiceWorker();
        if (!registration) {
            console.warn('❌ Service Worker registration not available');
            return null;
        }

        // Wait for service worker to be active
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.ready;
        }

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
        // Special check for permission error
        if (error.code === 'messaging/permission-blocked') {
            console.warn('⚠️ Notification permission was blocked by user');
        }
        return null;
    }
}

// Register FCM token with backend
async function registerFCMTokenWithBackend(userId = null, forceUpdate = false, manualToken = null, manualPlatform = null) {
    try {
        const authToken = localStorage.getItem('inplay_token');
        if (!authToken) {
            console.log('No auth token found, skipping FCM registration');
            return;
        }

        const userAgent = navigator.userAgent;
        
        // Comprehensive platform detection
        let platform = 'web';
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
        const isWebView = window.webkit && window.webkit.messageHandlers;

        if (/Android/i.test(userAgent)) {
            platform = 'android';
        } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
            platform = 'ios';
            // If it's iOS but running in standalone mode (PWA) or has a native bridge
            if (isStandalone || isWebView || window.InPlayMobile) {
                platform = 'app';
            }
        } else if (/webOS|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|Tablet|Kindle|Silk/i.test(userAgent)) {
            platform = 'mobile';
        }
        
        // Check for specific APK/Native wrappers or indicators
        if (window.InPlayMobile || userAgent.includes('inplay-apk') || userAgent.includes('wv') || (userAgent.includes('app') && !userAgent.includes('apple'))) {
            platform = 'app';
        }
        
        console.log(`📱 [FCM] Platform Detection Result: ${platform}`);
        console.log(`📱 [FCM] Is Standalone (PWA): ${isStandalone}`);
        console.log(`📱 [FCM] Is WebView: ${!!isWebView}`);
        console.log(`📱 [FCM] Bridge Detected: ${!!window.InPlayMobile}`);
        console.log(`📱 [FCM] User Agent: ${userAgent}`);
        console.log(`📱 [FCM] Notification Permission: ${Notification.permission}`);
        
        // Use manual token if provided (from native bridge), else get from Firebase Web SDK
        let token = manualToken || await getFCMToken();
        
        // Fallback: If no token yet, check if we have a persisted native token
        if (!token) {
            token = localStorage.getItem('last_native_fcm_token');
            if (token) {
                console.log('📱 [FCM] Using persisted native token as fallback');
                // If we use native token fallback, we should ensure platform is set correctly
                if (!manualPlatform) {
                    const savedPlatform = localStorage.getItem('last_native_fcm_platform');
                    if (savedPlatform) platform = savedPlatform;
                    else platform = 'apk'; // Default for native fallback
                }
            }
        }

        if (manualPlatform) platform = manualPlatform;

        if (!token) {
            console.warn('⚠️ No FCM token obtained (Web SDK or Native), skipping backend registration');
            return;
        }

        // Check local storage to avoid redundant registrations
        const savedToken = localStorage.getItem('fcm_token_registered');
        const savedPlatform = localStorage.getItem('fcm_platform');
        const savedUserId = localStorage.getItem('fcm_user_id');

        // Force cleanup if userId changed
        if (savedUserId && userId && String(savedUserId) !== String(userId)) {
            console.log('🔄 User ID changed, clearing old FCM registration state');
            localStorage.removeItem('fcm_token_registered');
        }

        // Force update if platform detection has improved (e.g., went from 'web' to 'android')
        const platformChanged = savedPlatform && savedPlatform !== platform;
        if (platformChanged) {
            console.log(`🔄 Platform detection changed from ${savedPlatform} to ${platform}, forcing re-registration`);
        }

        // Only skip if token, platform AND userId match
        if (savedToken === token && savedPlatform === platform && String(savedUserId) === String(userId) && !forceUpdate && !platformChanged) {
            console.log(`ℹ️ FCM token already registered locally for ${platform} (User: ${userId})`);
            return;
        }

        const API_URL = getApiUrl();
        console.log(`📡 Sending ${platform} token to backend: ${API_URL}/user/auth/fcm-token`);

        try {
            const response = await fetch(`${API_URL}/user/auth/fcm-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ token, platform })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            if (data.success) {
                localStorage.setItem('fcm_token_registered', token);
                localStorage.setItem('fcm_platform', platform);
                if (userId) localStorage.setItem('fcm_user_id', String(userId));
                console.log(`✅ FCM token registered for ${platform} successfully`);
            } else {
                console.error('❌ Backend failed to save FCM token:', data.message);
            }
        } catch (fetchError) {
            console.error('❌ Network error during FCM registration:', fetchError.message);
            // Don't throw here, just log so it doesn't break the app
        }
    } catch (error) {
        console.error('❌ Error in registerFCMTokenWithBackend:', error);
    }
}

// Setup foreground notification handler
function setupForegroundNotificationHandler(handler) {
    // Listen for tokens from native bridge (Flutter/WebView)
    window.setMobileFCMToken = async (token) => {
        console.log('📱 [FCM] Token received from Native Bridge');
        
        // Always persist the native token so it can be used after login if needed
        if (token) {
            localStorage.setItem('last_native_fcm_token', token);
            
            const userAgent = navigator.userAgent;
            let platform = 'app';
            if (/Android/i.test(userAgent)) platform = 'app';
            else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = 'ios';
            localStorage.setItem('last_native_fcm_platform', platform);
            
            const authToken = localStorage.getItem('inplay_token');
            if (authToken) {
                console.log('📱 [FCM] User is logged in, registering native token immediately');
                await registerFCMTokenWithBackend(null, true, token, platform);
            } else {
                console.log('📱 [FCM] User not logged in, token persisted for later registration');
            }
        }
    };

    onMessage(messaging, (payload) => {
        console.log('📬 Foreground message received:', payload);

        // Rely only on the beautiful in-app Toast notification when the app is in the foreground
        if (handler) handler(payload);
    });
}

// Mark notification as seen
async function markNotificationAsSeen(notificationId) {
    try {
        const authToken = localStorage.getItem('inplay_token');
        if (!authToken) {
            console.log('No auth token found, skipping markNotificationAsSeen');
            return;
        }

        const API_URL = getApiUrl();
        const response = await fetch(`${API_URL}/user/notifications/${notificationId}/seen`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            console.warn(`Failed to mark notification ${notificationId} as seen (Status: ${response.status})`);
        } else {
            console.log(`✅ Notification ${notificationId} marked as seen successfully`);
        }
    } catch (error) {
        console.error('Error marking notification as seen:', error);
    }
}

export {
    registerFCMTokenWithBackend,
    setupForegroundNotificationHandler,
    requestNotificationPermission,
    markNotificationAsSeen
};
