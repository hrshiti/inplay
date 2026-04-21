const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');

const fixDrafts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('--- Fixing Content ---');
        const contents = await Content.updateMany(
            { 
                'video.hls_url': { $exists: true, $ne: '' }
            },
            { $set: { status: 'published' } }
        );
        console.log(`Updated ${contents.modifiedCount} Content records to published`);

        console.log('--- Fixing QuickBytes ---');
        const quickBytes = await QuickByte.updateMany(
            { 
                'video.hls_url': { $exists: true, $ne: '' }
            },
            { $set: { status: 'published' } }
        );
        console.log(`Updated ${quickBytes.modifiedCount} QuickByte records to published`);

        console.log('--- Fixing ForYou Reels ---');
        const forYou = await ForYou.updateMany(
            { 
                'video.hls_url': { $exists: true, $ne: '' }
            },
            { $set: { status: 'published' } }
        );
        console.log(`Updated ${forYou.modifiedCount} ForYou records to published`);

        console.log('--- DONE ---');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixDrafts();
