// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAKlnEunlW7vqC1O_CnPSVgiSP8W3EHcP8",
    authDomain: "inplay-43123.firebaseapp.com",
    projectId: "inplay-43123",
    storageBucket: "inplay-43123.firebasestorage.app",
    messagingSenderId: "213005293117",
    appId: "1:213005293117:web:b14d89d63c4356b025bc54"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', payload);

    // If the message contains a notification payload, the browser/FCM automatically
    // displays the notification. Manually showing it here causes duplicate (double) notifications.
    if (payload.notification) {
        console.log('[firebase-messaging-sw.js] Letting FCM SDK automatically display the notification banner.');
        return;
    }

    // Handle data-only messages (manual display needed)
    const notificationTitle = payload.data?.title || 'InPlay';
    const notificationOptions = {
        body: payload.data?.body || '',
        icon: '/favicon.png',
        image: payload.data?.image,
        data: payload.data,
        tag: 'inplay-notification',
        renotify: true
    };

    console.log('[firebase-messaging-sw.js] Manually showing data-only notification:', notificationTitle);
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data;
    const urlToOpen = data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if app is already open, if so navigate and focus it
            for (const client of clientList) {
                if ('navigate' in client && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // Open new window if no active tabs are open
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
