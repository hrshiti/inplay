const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');
const mediaService = require('../services/mediaService');

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Migrate Movies/Series
        const contentItems = await Content.find({ "video.url": { $regex: /^\/uploads/ } });
        console.log(`Found ${contentItems.length} content items to migrate`);

        for (const item of contentItems) {
            const localVideoPath = path.join(__dirname, '..', item.video.url);
            if (fs.existsSync(localVideoPath)) {
                console.log(`Migrating ${item.title}...`);
                const hlsUrl = await mediaService.handleVideoHLS(localVideoPath, item._id, 'movie');
                if (hlsUrl) {
                    item.video.hls_url = hlsUrl;
                    await item.save();
                    console.log(`Successfully migrated ${item.title}`);
                }
            }
        }

        // 2. Migrate QuickBytes
        const qbItems = await QuickByte.find({ "video.url": { $regex: /^\/uploads/ } });
        console.log(`Found ${qbItems.length} QuickBytes to migrate`);
        for (const item of qbItems) {
            const localVideoPath = path.join(__dirname, '..', item.video.url);
            if (fs.existsSync(localVideoPath)) {
                console.log(`Migrating QuickByte: ${item.title}...`);
                const hlsUrl = await mediaService.handleVideoHLS(localVideoPath, item._id, 'quickbyte');
                if (hlsUrl) {
                    item.video.hls_url = hlsUrl;
                    await item.save();
                }
            }
        }

        console.log('Migration completed!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
