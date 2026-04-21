const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const QuickByte = require('../models/QuickByte');

const checkQuickByte = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const qb = await QuickByte.findOne().lean();
        console.log('QuickByte Sample:', JSON.stringify(qb, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkQuickByte();
