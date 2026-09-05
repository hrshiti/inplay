/**
 * inspect_lifetime_subscribers.js
 * 
 * READ ONLY - Inspects lifetime plan in subscriptionplans and lifetime subscribers in DB
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

  // Check plans
  const plans = await db.collection('subscriptionplans').find({}).toArray();
  console.log('Current Subscription Plans:');
  plans.forEach(p => console.log(` - ID: ${p._id} | Name: ${p.name} | Price: ₹${p.price} | Duration: ${p.duration}`));

  // Check CustomerSubscriptions with price > 1000 or LIFETIME
  const lifetimeSubs = await db.collection('customersubscriptions').find({
    $or: [
      { price: { $gte: 999 } },
      { razorpaySubscriptionId: { $regex: 'LIFETIME', $options: 'i' } }
    ]
  }).toArray();

  console.log(`\nCustomerSubscriptions with price >= 999 or LIFETIME: ${lifetimeSubs.length}`);
  lifetimeSubs.forEach(s => {
    console.log(` - UserID: ${s.user} | SubID: ${s.razorpaySubscriptionId} | Price: ₹${s.price}`);
  });

  // Check how many users have endDate in 2099
  const lifetimeUsersCount = await db.collection('users').countDocuments({
    'subscription.endDate': { $gte: new Date('2090-01-01') }
  });
  console.log(`\nTotal Users with endDate in 2099: ${lifetimeUsersCount}`);

  await client.close();
}

main().catch(console.error);
