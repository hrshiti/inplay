const mongoose = require('mongoose');
require('dotenv').config();

const checkTokens = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    const usersWithTokens = await User.find({
      $or: [
        { fcm_web: { $exists: true, $not: { $size: 0 } } },
        { fcm_mobile: { $exists: true, $not: { $size: 0 } } }
      ]
    }).select('name email fcm_web fcm_mobile');

    console.log(`Found ${usersWithTokens.length} users with tokens.`);
    usersWithTokens.forEach(u => {
      console.log(`- User: ${u.name || u.email}, Web: ${u.fcm_web?.length || 0}, Mobile: ${u.fcm_mobile?.length || 0}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkTokens();
