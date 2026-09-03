/**
 * check_all_plans.js
 * Check what plan ID 6a7b1314037d3a21c79e81ad is and all plan details
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;

  // Check all subscription plans
  const plans = await db.collection('subscriptionplans').find({}).toArray();
  console.log(`Total subscription plans: ${plans.length}`);
  plans.forEach(p => {
    console.log(`\n  Plan: ${p.name} | _id: ${p._id}`);
    console.log(`  duration: ${p.duration} | price: ${p.price} | isActive: ${p.isActive}`);
    console.log(`  razorpayPlanId: ${p.razorpayPlanId}`);
  });

  // Now check who are the actual paying subscribers
  // Find users with subscription.isActive = false, grouped by endDate proximity
  const now = new Date();
  const inactiveWithPlan = await db.collection('users').find({
    'subscription.isActive': false,
    'subscription.plan': { $exists: true, $ne: null }
  }).toArray();

  console.log(`\n\nUsers with plan but subscription.isActive = false: ${inactiveWithPlan.length}`);
  
  // Group by plan
  const planGroups = {};
  inactiveWithPlan.forEach(u => {
    const planId = String(u.subscription?.plan);
    if (!planGroups[planId]) planGroups[planId] = [];
    planGroups[planId].push(u);
  });
  
  Object.entries(planGroups).forEach(([planId, users]) => {
    console.log(`\n  Plan ${planId}: ${users.length} inactive users`);
  });

  // Also check CustomerSubscription collection
  const collections = await db.listCollections().toArray();
  console.log('\n\nAll collections:', collections.map(c => c.name).join(', '));

  // Check customersubscriptions
  const custSubs = await db.collection('customersubscriptions').find({}).limit(10).toArray();
  console.log(`\nCustomerSubscriptions sample (${custSubs.length}):`);
  custSubs.forEach(cs => {
    console.log(`  - user: ${cs.user} | status: ${cs.status} | endDate: ${cs.endDate} | price: ${cs.price}`);
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
