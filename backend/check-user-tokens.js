const mongoose = require('mongoose');
const User = require('./models/User');

const run = async () => {
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI);
    
    const users = await User.find({
        $or: [
            { fcm_web: { $exists: true, $not: { $size: 0 } } },
            { fcm_mobile: { $exists: true, $not: { $size: 0 } } }
        ]
    }).select('name email phone fcm_web fcm_mobile');
    
    console.log(`Found ${users.length} users with active FCM tokens:\n`);
    
    users.forEach(user => {
        console.log(`👤 User: ${user.name} (${user.email}) | Phone: ${user.phone}`);
        console.log(`   🌐 Web Tokens (${user.fcm_web?.length || 0}):`, user.fcm_web);
        console.log(`   📱 Mobile Tokens (${user.fcm_mobile?.length || 0}):`, user.fcm_mobile);
        console.log("-".repeat(50));
    });
    
    await mongoose.disconnect();
};

run().catch(console.error);
