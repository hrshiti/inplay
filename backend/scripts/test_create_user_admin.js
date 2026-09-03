/**
 * test_create_user_admin.js
 * 
 * Tests the new Admin Create User API & Service.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const adminUserService = require('../services/adminUserService');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB via Mongoose\n');

  const testPhone = '9998887771';
  const testEmail = `testuser_${testPhone}@inplay.com`;

  // Clean up previous test user if exists
  const User = require('../models/User');
  await User.deleteOne({ phone: testPhone });

  console.log(`Creating test user with Phone: ${testPhone}, Subscription: Lifetime Plan...`);
  
  const db = mongoose.connection.db;
  const lifetimePlan = await db.collection('subscriptionplans').findOne({ duration: 'lifetime' });

  const newUser = await adminUserService.createUser({
    name: 'Admin Created Test User',
    phone: testPhone,
    email: testEmail,
    password: 'TestPassword123',
    planId: lifetimePlan ? String(lifetimePlan._id) : null,
    isActive: true
  });

  console.log('\n✅ User Created Successfully!');
  console.log('User ID:', newUser._id);
  console.log('Name:', newUser.name);
  console.log('Phone:', newUser.phone);
  console.log('Email:', newUser.email);
  console.log('Subscription active:', newUser.subscription?.isActive);
  console.log('Subscription endDate:', newUser.subscription?.endDate);

  // Clean up
  await User.deleteOne({ _id: newUser._id });
  await db.collection('customersubscriptions').deleteOne({ user: newUser._id });
  console.log('\n🧹 Test user cleaned up cleanly.');

  await mongoose.disconnect();
}

main().catch(console.error);
