/**
 * restore_lifetime_plans_and_users.js
 * 
 * Creates the Lifetime Plan in subscriptionplans if missing,
 * and restores Lifetime subscription access (endDate: 2099-12-31) for all Lifetime subscribers.
 */
const { MongoClient, ObjectId } = require('mongodb');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB Cluster 1\n');

  const db = client.db('inplay');
  const plansCol = db.collection('subscriptionplans');
  const usersCol = db.collection('users');
  const customerSubCol = db.collection('customersubscriptions');

  // 1. Check or create Lifetime Plan
  let lifetimePlan = await plansCol.findOne({
    $or: [
      { duration: 'lifetime' },
      { name: { $regex: 'lifetime', $options: 'i' } }
    ]
  });

  if (!lifetimePlan) {
    console.log('✨ Creating Lifetime Plan in subscriptionplans...');
    const res = await plansCol.insertOne({
      name: 'Lifetime Plan',
      price: 999,
      duration: 'lifetime',
      features: ['Unlimited Access', 'All Devices', 'HD/4K Quality', 'No Ads'],
      isActive: true,
      razorpayPlanId: 'LIFETIME_PLAN',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    lifetimePlan = await plansCol.findOne({ _id: res.insertedId });
    console.log(`✅ Lifetime Plan created with ID: ${lifetimePlan._id}`);
  } else {
    console.log(`✅ Lifetime Plan already exists with ID: ${lifetimePlan._id}`);
  }

  // 2. Find Lifetime CustomerSubscriptions
  const lifetimeSubs = await customerSubCol.find({
    $or: [
      { price: { $gte: 999 } },
      { razorpaySubscriptionId: { $regex: 'LIFETIME', $options: 'i' } },
      { plan: lifetimePlan._id }
    ]
  }).toArray();

  console.log(`Found ${lifetimeSubs.length} Lifetime CustomerSubscription records.`);

  let updatedCount = 0;
  for (const sub of lifetimeSubs) {
    if (!sub.user) continue;

    const userIdObj = typeof sub.user === 'string' ? new ObjectId(sub.user) : sub.user;

    await usersCol.updateOne(
      { _id: userIdObj },
      {
        $set: {
          'subscription.isActive': true,
          'subscription.status': 'active',
          'subscription.plan': lifetimePlan._id,
          'subscription.endDate': new Date('2099-12-31T23:59:59.000Z')
        }
      }
    );
    updatedCount++;
  }

  // 3. Check specific manual lifetime scripts (e.g. phone 9702470288 and other manual lifetime users)
  const manualLifetimeUser = await usersCol.findOne({ phone: '9702470288' });
  if (manualLifetimeUser) {
    await usersCol.updateOne(
      { _id: manualLifetimeUser._id },
      {
        $set: {
          'subscription.isActive': true,
          'subscription.status': 'active',
          'subscription.plan': lifetimePlan._id,
          'subscription.endDate': new Date('2099-12-31T23:59:59.000Z')
        }
      }
    );
    console.log(`✅ Restored Lifetime access for phone 9702470288`);
  }

  const finalLifetimeCount = await usersCol.countDocuments({
    'subscription.endDate': { $gte: new Date('2090-01-01') }
  });

  console.log('\n========================================');
  console.log('  LIFETIME SUBSCRIPTION RESTORATION COMPLETE!');
  console.log(`  Lifetime Plan ID: ${lifetimePlan._id}`);
  console.log(`  Lifetime Users Restored: ${finalLifetimeCount}`);
  console.log('========================================\n');

  await client.close();
}

main().catch(console.error);
