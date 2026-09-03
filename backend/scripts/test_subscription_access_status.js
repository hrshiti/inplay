/**
 * test_subscription_access_status.js
 * 
 * READ ONLY - Tests isUserSubscribed on Lifetime and Active subscribers
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');
const { isUserSubscribed } = require('../utils/subscriptionAccess');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  const users = db.collection('users');
  const now = new Date();

  // Test Lifetime Subscribers
  const lifetimeUsers = await users.find({
    'subscription.isActive': true,
    'subscription.endDate': { $gte: new Date('2090-01-01') }
  }).limit(10).toArray();

  console.log('--- TESTING LIFETIME SUBSCRIBERS (Sample 10) ---');
  lifetimeUsers.forEach((u, i) => {
    const access = isUserSubscribed(u);
    console.log(`[${i+1}] ${u.email} | Plan End: ${u.subscription?.endDate} | Access: ${access ? '✅ ALLOWED' : '❌ BLOCKED'}`);
  });

  // Test Active Non-Lifetime Subscribers (Future endDate)
  const regularActiveUsers = await users.find({
    'subscription.isActive': true,
    'subscription.endDate': { $gt: now, $lt: new Date('2090-01-01') }
  }).limit(10).toArray();

  console.log('\n--- TESTING REGULAR ACTIVE SUBSCRIBERS (Sample 10) ---');
  regularActiveUsers.forEach((u, i) => {
    const access = isUserSubscribed(u);
    console.log(`[${i+1}] ${u.email} | Plan End: ${u.subscription?.endDate} | Access: ${access ? '✅ ALLOWED' : '❌ BLOCKED'}`);
  });

  // Total summary
  const totalSubscribed = await users.countDocuments({ 'subscription.isActive': true });
  const totalSubscribedFuture = await users.countDocuments({
    'subscription.isActive': true,
    'subscription.endDate': { $gt: now }
  });

  console.log(`\n========================================`);
  console.log(`SUBSCRIPTION ACCESS HEALTH CHECK:`);
  console.log(`  Total Users with isActive = true:           ${totalSubscribed}`);
  console.log(`  Users with isActive = true & future endDate: ${totalSubscribedFuture}`);
  console.log(`========================================\n`);

  await client.close();
}

main().catch(console.error);
