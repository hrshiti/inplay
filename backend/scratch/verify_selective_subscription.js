const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const userContentService = require('../services/userContentService');

async function runVerification() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Create a test user with no subscription
        console.log('\n--- Step 1: Creating/Resetting Test User ---');
        const testEmail = 'subscription_test_user@inplay.com';
        await User.deleteMany({ email: testEmail });
        
        const user = await User.create({
            name: 'Subscription Test User',
            email: testEmail,
            phone: '9876543210',
            isActive: true,
            isEmailVerified: true,
            watchHistory: [],
            freeEpisodesWatched: [],
            subscription: {
                isActive: false,
                status: 'none'
            },
            // createdBy dummy values if required, but not on User model
        });
        console.log(`✅ Test User created (ID: ${user._id})`);

        // 2. Create InPlay Drama dummy content
        console.log('\n--- Step 2: Creating Test Content ---');
        const adminUser = await User.findOne({ role: 'admin' }) || user; // Fallback to test user if no admin exists
        
        const dramaContent = await Content.create({
            title: 'InPlay Drama Test Series',
            description: 'A test series in the InPlay Drama category',
            type: 'series',
            category: 'inplay dharmaa',
            genre: ['Drama'],
            year: 2026,
            status: 'published',
            createdBy: adminUser._id,
            seasons: [{
                seasonNumber: 1,
                title: 'Season 1',
                episodes: [
                    { episodeNumber: 1, title: 'Ep 1', video: { secure_url: '/videos/ep1.mp4', url: '/videos/ep1.mp4' } },
                    { episodeNumber: 2, title: 'Ep 2', video: { secure_url: '/videos/ep2.mp4', url: '/videos/ep2.mp4' } },
                    { episodeNumber: 3, title: 'Ep 3', video: { secure_url: '/videos/ep3.mp4', url: '/videos/ep3.mp4' } },
                    { episodeNumber: 4, title: 'Ep 4', video: { secure_url: '/videos/ep4.mp4', url: '/videos/ep4.mp4' } },
                    { episodeNumber: 5, title: 'Ep 5', video: { secure_url: '/videos/ep5.mp4', url: '/videos/ep5.mp4' } },
                    { episodeNumber: 6, title: 'Ep 6', video: { secure_url: '/videos/ep6.mp4', url: '/videos/ep6.mp4' } },
                    { episodeNumber: 7, title: 'Ep 7', video: { secure_url: '/videos/ep7.mp4', url: '/videos/ep7.mp4' } }
                ]
            }]
        });
        console.log(`✅ InPlay Drama Content created (ID: ${dramaContent._id})`);

        // Create Bhojpuri dummy content (should be free)
        const bhojpuriContent = await Content.create({
            title: 'Bhojpuri Test Film',
            description: 'A test film in Bhojpuri category',
            type: 'movie',
            category: 'Bhojpuri',
            genre: ['Drama'],
            year: 2026,
            status: 'published',
            createdBy: adminUser._id,
            video: { secure_url: '/videos/bhojpuri.mp4', url: '/videos/bhojpuri.mp4', duration: 100 }
        });
        console.log(`✅ Bhojpuri Content created (ID: ${bhojpuriContent._id})`);

        // 3. Verify initial state shows all episodes unlocked (since we have 5 free passes)
        console.log('\n--- Step 3: Verifying Initial Redaction / Lock State ---');
        let initialDrama = await userContentService.getContentById(dramaContent._id, user._id);
        let episodes = initialDrama.seasons[0].episodes;
        
        console.log(`Drama episodes total: ${episodes.length}`);
        console.log(`Ep 1 lock status: ${episodes[0].isLocked} (Expected: false / undefined)`);
        console.log(`Ep 6 lock status: ${episodes[5].isLocked} (Expected: false / undefined)`);
        console.log(`Ep 6 video URL: "${episodes[5].video?.url || ''}" (Expected: not empty)`);

        // 4. Simulate watching episodes one by one
        console.log('\n--- Step 4: Watching 5 Unique Episodes ---');
        for (let i = 0; i < 5; i++) {
            console.log(`Watching episode index ${i}...`);
            const res = await userContentService.updateWatchHistory(
                user._id,
                dramaContent._id,
                50, // progress
                false, // completed
                30, // watchedSeconds
                60, // totalDuration
                'series', // contentType
                i // episodeIndex
            );
            console.log(`   Result: ${res.message}`);
        }

        // Fetch updated user to see freeEpisodesWatched array length
        let updatedUser = await User.findById(user._id);
        console.log(`Logged episodes watched in freeEpisodesWatched: ${updatedUser.freeEpisodesWatched.length} (Expected: 5)`);

        // 5. Verify that 6th episode is now locked
        console.log('\n--- Step 5: Verifying Redaction After 5 Free Episodes Consumed ---');
        let postWatchedDrama = await userContentService.getContentById(dramaContent._id, user._id);
        let postWatchedEp = postWatchedDrama.seasons[0].episodes;
        
        console.log(`Ep 1 (index 0, watched) lock status: ${postWatchedEp[0].isLocked} (Expected: false)`);
        console.log(`Ep 6 (index 5, unwatched) lock status: ${postWatchedEp[5].isLocked} (Expected: true)`);
        console.log(`Ep 6 (index 5) video URL redacted: "${postWatchedEp[5].video?.url || ''}" (Expected: empty string)`);

        // 6. Test re-watching an already watched episode (should succeed and not add to list)
        console.log('\n--- Step 6: Testing Re-watching Ep 1 (index 0) ---');
        await userContentService.updateWatchHistory(
            user._id,
            dramaContent._id,
            80,
            false,
            48,
            60,
            'series',
            0 // episodeIndex 0 (already watched)
        );
        updatedUser = await User.findById(user._id);
        console.log(`freeEpisodesWatched count after re-watching: ${updatedUser.freeEpisodesWatched.length} (Expected: 5)`);

        // 7. Verify watching 6th unique episode is blocked
        console.log('\n--- Step 7: Testing Block on 6th Unique Episode ---');
        try {
            await userContentService.updateWatchHistory(
                user._id,
                dramaContent._id,
                10,
                false,
                6,
                60,
                'series',
                5 // episodeIndex 5 (unwatched, index 5 = Ep 6)
            );
            console.log('❌ Error: Allowed watching 6th episode without subscription!');
        } catch (e) {
            console.log(`✅ Correctly blocked 6th episode. Error message: "${e.message}"`);
        }

        // 8. Verify Bhojpuri Content is free and completely unaffected
        console.log('\n--- Step 8: Verifying Bhojpuri Content is Unaffected ---');
        const fetchedBhojpuri = await userContentService.getContentById(bhojpuriContent._id, user._id);
        console.log(`Bhojpuri video URL: "${fetchedBhojpuri.video?.url || ''}" (Expected: not empty)`);
        console.log(`Bhojpuri isLocked: ${fetchedBhojpuri.isLocked} (Expected: undefined)`);

        // Cleanup
        console.log('\n--- Step 9: Cleaning up test data ---');
        await User.deleteMany({ email: testEmail });
        await Content.findByIdAndDelete(dramaContent._id);
        await Content.findByIdAndDelete(bhojpuriContent._id);
        console.log('✅ Cleanup finished.');

    } catch (err) {
        console.error('❌ Test failed with error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
}

runVerification();
