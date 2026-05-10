const { admin, sendPushNotification } = require('../services/firebaseService');

async function testService() {
    console.log('--- Testing Refactored Firebase Service ---');
    if (admin.apps.length > 0) {
        console.log('✅ Service loaded and initialized correctly');
        
        // Test function structure (not sending real notification yet)
        console.log('Checking sendPushNotification function...');
        try {
            await sendPushNotification([], { title: 'Test', body: 'Test' });
            console.log('✅ sendPushNotification handled empty tokens correctly');
        } catch (e) {
            console.log('❌ sendPushNotification error:', e.message);
        }
    } else {
        console.log('❌ Service failed to initialize');
    }
}

testService();
