const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const checkAvatar = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ name: /Rehan/i });

    if (user) {
      console.log('USER_FOUND');
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Avatar:', user.avatar);
      console.log('---');
    } else {
      console.log('USER_NOT_FOUND');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkAvatar();
