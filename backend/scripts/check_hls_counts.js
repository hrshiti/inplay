const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Content = require('../models/Content');
const QuickByte = require('../models/QuickByte');
const ForYou = require('../models/ForYou');

const checkHLS = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const contentWithHLS = await Content.countDocuments({ 'video.hls_url': { $exists: true, $ne: '' } });
        const contentWithoutHLS = await Content.countDocuments({ 'video.url': { $exists: true, $ne: '' }, 'video.hls_url': { $in: [null, ''] } });

        const quickByteWithHLS = await QuickByte.countDocuments({ 'video.hls_url': { $exists: true, $ne: '' } });
        const quickByteWithoutHLS = await QuickByte.countDocuments({ 'video.url': { $exists: true, $ne: '' }, 'video.hls_url': { $in: [null, ''] } });

        const forYouWithHLS = await ForYou.countDocuments({ 'video.hls_url': { $exists: true, $ne: '' } });
        const forYouWithoutHLS = await ForYou.countDocuments({ 'video.url': { $exists: true, $ne: '' }, 'video.hls_url': { $in: [null, ''] } });

        console.log('--- CONTENT ---');
        console.log('With HLS:', contentWithHLS);
        console.log('Without HLS:', contentWithoutHLS);

        console.log('--- QUICKBYTE ---');
        console.log('With HLS:', quickByteWithHLS);
        console.log('Without HLS:', quickByteWithoutHLS);

        console.log('--- FORYOU ---');
        console.log('With HLS:', forYouWithHLS);
        console.log('Without HLS:', forYouWithoutHLS);

        // Find one sample without HLS to see what's happening
        const sample = await Content.findOne({ 'video.url': { $exists: true, $ne: '' }, 'video.hls_url': { $in: [null, ''] } });
        if (sample) {
            console.log('\nSample Content without HLS:', sample.title, 'ID:', sample._id);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkHLS();
