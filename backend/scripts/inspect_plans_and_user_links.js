/**
 * inspect_plans_and_user_links.js
 * 
 * READ ONLY - Inspect newly created subscriptionplans and how users reference them
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

  // 1. Check newly created plans
  const plans = await db.collection('subscriptionplans').find({}).toArray();
  console.log('========================================');
  console.log(`  CURRENT SUBSCRIPTION PLANS IN DB (${plans.length}):`);
  console.log('========================================');
  plans.forEach(p => console.log(` - ID: ${p._id} | Name: ${p.name} | Price: ${p.price} | Duration: ${p.duration}`));

  // 2. Check sample CustomerSubscriptions and their plan IDs vs newly created plan IDs
  const sampleCustomerSubs = await db.collection('customersubscriptions').find({}).limit(10).toArray();
  console.log('\n========================================');
  console.log('  SAMPLE CUSTOMERSUBSCRIPTIONS (plan vs price):');
  console.log('========================================');
  sampleCustomerSubs.forEach(s => {
    console.log(` - UserID: ${s.user} | PlanID: ${s.plan} | Price: ₹${s.price} | EndDate: ${s.endDate}`);
  });

  // 3. Check sample users in DB
  const sampleUsers = await db.collection('users').find({ 'subscription.isActive': true }).limit(10).toArray();
  console.log('\n========================================');
  console.log('  SAMPLE USERS IN DB (subscription object):');
  console.log('========================================');
  sampleUsers.forEach(u => {
    console.log(` - User: ${u.name} | PlanRef: ${u.subscription?.plan} | EndDate: ${u.subscription?.endDate}`);
  });

  await client.close();
}

main().catch(console.error);
