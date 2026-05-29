const { notifyAllUsers } = require('./utils/notificationHelper');
const mongoose = require('mongoose');

const firebaseService = require('./services/firebaseService');
const User = require('./models/User');

let sentWebTokens = null;
let sentMobileTokens = null;

firebaseService.sendPushNotification = async (tokens, payload) => {
    if (payload.data && payload.data.platform === 'web') {
        sentWebTokens = tokens;
    } else if (payload.data && payload.data.platform === 'mobile') {
        sentMobileTokens = tokens;
    }
    console.log(`👉 [MOCK] sendPushNotification called for ${tokens.length} tokens, Platform: ${payload.data?.platform}`);
    return { successCount: tokens.length, failureCount: 0, responses: [] };
};

const runTest = async () => {
    console.log("Starting Token Deduplication Verification...");
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Create a mock user in DB with the SAME token in both fcm_web and fcm_mobile
    const testToken = "MOCK_TOKEN_DEDUP_TEST_" + Date.now();
    const mockUser = await User.create({
        name: 'Mock Dedup User',
        email: 'dedup_user_' + Date.now() + '@test.com',
        fcm_web: [testToken],
        fcm_mobile: [testToken]
    });
    
    console.log("✅ Created mock user with identical web & mobile tokens");
    
    // Call notifyAllUsers
    await notifyAllUsers({
        title: 'Test Dedup',
        body: 'Testing notification de-duplication logic'
    });
    
    console.log("\nVerification Results:");
    console.log("Sent Web Tokens:", sentWebTokens);
    console.log("Sent Mobile Tokens:", sentMobileTokens);
    
    // If the token was correctly de-duplicated:
    // It should be sent to WebTokens (first batch)
    // But it should NOT be sent to MobileTokens (second batch) because it was already sent to Web!
    const isWebValid = sentWebTokens && sentWebTokens.includes(testToken);
    const isMobileValid = !sentMobileTokens || !sentMobileTokens.includes(testToken);
    
    console.log(`Token sent via Web? ${isWebValid}`);
    console.log(`Token sent via Mobile? ${!isMobileValid}`);
    
    if (isWebValid && isMobileValid) {
        console.log("\n🎉 SUCCESS: Push tokens are cross-deduplicated perfectly across Web & Mobile platforms!");
    } else {
        console.error("\n❌ FAILURE: Token de-duplication failed.");
    }
    
    // Cleanup mock user
    await User.findByIdAndDelete(mockUser._id);
    console.log("🧹 Cleaned up mock database record");
    await mongoose.disconnect();
};

runTest().catch(console.error);
