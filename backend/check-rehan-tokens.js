const mongoose = require('mongoose');
require('dotenv').config();

const checkTokens = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    const user = await User.findOne({ email: 'mrmmultani@gmail.com' }).select('name email fcm_web fcm_mobile');

    if (user) {
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`Web Tokens (${user.fcm_web?.length || 0}):`);
      user.fcm_web?.forEach((t, i) => console.log(`  ${i+1}: ${t.substring(0, 20)}...`));
      console.log(`Mobile Tokens (${user.fcm_mobile?.length || 0}):`);
      user.fcm_mobile?.forEach((t, i) => console.log(`  ${i+1}: ${t.substring(0, 20)}...`));
    } else {
      console.log('User not found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkTokens();
