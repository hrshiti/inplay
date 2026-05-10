const mongoose = require('mongoose');
const firebaseService = require('../services/firebaseService');
const User = require('../models/User');
require('dotenv').config();

const sendTestNotification = async () => {
    try {
        console.log('🚀 Starting Test Notification Broadcast...');
        
        // Connect to DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Fetch all users with tokens
        const users = await User.find({
            $or: [
                { fcm_web: { $exists: true, $not: { $size: 0 } } },
                { fcm_mobile: { $exists: true, $not: { $size: 0 } } }
            ]
        });

        if (users.length === 0) {
            console.log('⚠️ No users found with registered FCM tokens.');
            process.exit(0);
        }

        console.log(`👥 Found ${users.length} users with tokens.`);

        const allTokens = [];
        users.forEach(user => {
            if (user.fcm_web) allTokens.push(...user.fcm_web);
            if (user.fcm_mobile) allTokens.push(...user.fcm_mobile);
        });

        // Unique tokens only
        const uniqueTokens = [...new Set(allTokens)];
        console.log(`📡 Total unique tokens to notify: ${uniqueTokens.length}`);

        if (uniqueTokens.length === 0) {
            process.exit(0);
        }

        const payload = {
            title: 'Test Notification 🚀',
            body: 'Hello from InPlay! This is a test broadcast to all registered devices.',
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                type: 'test_broadcast',
                timestamp: new Date().toISOString()
            },
            imageUrl: 'https://api.inplays.in/uploads/images/example.jpg' // Using a placeholder or existing image if any
        };

        // Firebase limit for multicast is 500 tokens per call
        const CHUNK_SIZE = 500;
        for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
            const chunk = uniqueTokens.slice(i, i + CHUNK_SIZE);
            console.log(`📤 Sending chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} tokens)...`);
            await firebaseService.sendPushNotification(chunk, payload);
        }

        console.log('✅ Broadcast completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error sending broadcast:', error);
        process.exit(1);
    }
};

sendTestNotification();
