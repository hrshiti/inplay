/**
 * check_plans_and_subscriptions_status.js
 * 
 * READ ONLY - Inspects subscriptionplans collection and users.subscription in MongoDB
 */
const { MongoClient } = require('mongodb');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB Cluster 1\n');

  const db = client.db('inplay');

  // 1. Check SubscriptionPlans
  const plans = await db.collection('subscriptionplans').find({}).toArray();
  console.log(`========================================`);
  console.log(`  SUBSCRIPTION PLANS IN DB: ${plans.length}`);
  console.log(`========================================`);
  plans.forEach(p => console.log(` - ID: ${p._id} | Name: ${p.name} | Duration: ${p.duration} | Price: ${p.price}`));

  // 2. Check Users subscription.plan fields
  const usersWithPlan = await db.collection('users').find({ 'subscription.isActive': true }).limit(10).toArray();
  console.log(`\n========================================`);
  console.log(`  SAMPLE ACTIVE SUBSCRIBERS IN DB:`);
  console.log(`========================================`);
  usersWithPlan.forEach(u => {
    console.log(` - Name: ${u.name} | Phone: ${u.phone} | PlanField: ${u.subscription?.plan} | EndDate: ${u.subscription?.endDate}`);
  });

  // 3. Check CustomerSubscriptions sample
  const customerSubs = await db.collection('customersubscriptions').find({}).limit(5).toArray();
  console.log(`\n========================================`);
  console.log(`  SAMPLE CUSTOMERSUBSCRIPTIONS:`);
  console.log(`========================================`);
  customerSubs.forEach(s => {
    console.log(` - UserID: ${s.user} | PlanID: ${s.plan} | Price: ${s.price} | EndDate: ${s.endDate}`);
  });

  await client.close();
}

main().catch(console.error);
