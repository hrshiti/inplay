/**
 * test_admin_update_user_subscription.js
 * 
 * Tests the new Admin 1-Click Subscription Update feature.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const adminUserService = require('../services/adminUserService');
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  
  // Get a test user
  const testUser = await db.collection('users').findOne({ phone: '9702470288' });
  console.log(`Test User found: ${testUser.name} (${testUser.phone})`);
  console.log(`Initial Subscription:`, JSON.stringify(testUser.subscription, null, 2));

  // Test 1: Assign Monthly Plan
  const monthlyPlan = await db.collection('subscriptionplans').findOne({ duration: 'monthly' });
  if (monthlyPlan) {
    console.log(`\n--- Test 1: Assigning Monthly Plan (${monthlyPlan.name}) ---`);
    const updatedUser = await adminUserService.updateUserSubscription(String(testUser._id), {
      planId: String(monthlyPlan._id),
      isActive: true
    });
    console.log(`Updated User Subscription:`, JSON.stringify(updatedUser.subscription, null, 2));
  }

  // Test 2: Re-assign Lifetime Plan
  const lifetimePlan = await db.collection('subscriptionplans').findOne({ duration: 'lifetime' });
  if (lifetimePlan) {
    console.log(`\n--- Test 2: Assigning Lifetime Plan (${lifetimePlan.name}) ---`);
    const updatedUser = await adminUserService.updateUserSubscription(String(testUser._id), {
      planId: String(lifetimePlan._id),
      isActive: true
    });
    console.log(`Updated User Subscription (Lifetime):`, JSON.stringify(updatedUser.subscription, null, 2));
  }

  await client.close();
  console.log('\n🔌 Test complete cleanly!');
}

main().catch(console.error);
