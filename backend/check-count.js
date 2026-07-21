const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const users = await User.find({
        $or: [
            { fcm_web: { $exists: true, $not: { $size: 0 } } },
            { fcm_mobile: { $exists: true, $not: { $size: 0 } } }
        ]
    }).select('fcm_web fcm_mobile');
    
    let w = 0, m = 0;
    
    let webTokens = [];
    let mobileTokens = [];

    users.forEach(user => {
        w += (user.fcm_web || []).length;
        m += (user.fcm_mobile || []).length;
        
        if (user.fcm_mobile && user.fcm_mobile.length > 0) {
            mobileTokens.push(user.fcm_mobile[user.fcm_mobile.length - 1]);
        } else if (user.fcm_web && user.fcm_web.length > 0) {
            webTokens.push(user.fcm_web[user.fcm_web.length - 1]);
        }
    });

    const uniqueWebTokens = [...new Set(webTokens)];
    const uniqueMobileTokens = [...new Set(mobileTokens)];

    console.log(`Total Web: ${w}, Total Mobile: ${m}`);
    console.log(`Unique Web (for broadcast): ${uniqueWebTokens.length}`);
    console.log(`Unique Mobile (for broadcast): ${uniqueMobileTokens.length}`);

    await mongoose.disconnect();
};

run().catch(console.error);
