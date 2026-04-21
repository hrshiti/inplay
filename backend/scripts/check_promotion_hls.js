const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Promotion = require('../models/Promotion');

const checkPromotions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const withHLS = await Promotion.countDocuments({ hls_url: { $exists: true, $ne: '' } });
        const withoutHLS = await Promotion.countDocuments({ promoVideoUrl: { $exists: true, $ne: '' }, hls_url: { $in: [null, ''] } });

        console.log('--- PROMOTIONS ---');
        console.log('With HLS:', withHLS);
        console.log('Without HLS:', withoutHLS);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkPromotions();
