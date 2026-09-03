/**
 * restore_missing_subscribers_from_customersub.js
 * FAST BULK VERSION - NO CODE CHANGES TO PROJECT.
 * Restores user profiles and active subscription status (including lifetime subscribers)
 * using CustomerSubscription records.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  const users = db.collection('users');
  const custSubs = db.collection('customersubscriptions');
  const now = new Date();

  // Find all active CustomerSubscriptions
  const activeSubs = await custSubs.find({
    status: 'active',
    endDate: { $gt: now }
  }).toArray();

  console.log(`Total Active CustomerSubscriptions in DB: ${activeSubs.length}`);

  // Fetch all existing user IDs at once
  const existingUserIds = new Set((await users.distinct('_id')).map(id => String(id)));

  const stubsToInsert = [];
  const updatesToApply = [];
  let lifetimeCount = 0;

  for (const sub of activeSubs) {
    if (!sub.user) continue;

    const userIdStr = String(sub.user);
    const isLifetime = sub.endDate && new Date(sub.endDate).getFullYear() >= 2090;
    if (isLifetime) lifetimeCount++;

    if (!existingUserIds.has(userIdStr)) {
      stubsToInsert.push({
        _id: new ObjectId(userIdStr),
        name: `Subscriber_${userIdStr.slice(-4)}`,
        email: `user_${userIdStr.slice(-8)}@inplay.com`,
        phone: userIdStr.slice(-10),
        role: 'user',
        isActive: true,
        isEmailVerified: false,
        myList: [],
        likedContent: [],
        preferences: {
          notifications: { newReleases: true, promotions: false, updates: true },
          favoriteGenres: [],
          language: 'en',
          playbackQuality: 'high'
        },
        subscription: {
          isActive: true,
          status: 'active',
          plan: sub.plan || null,
          endDate: sub.endDate,
          startDate: sub.startDate || new Date(),
          paymentMethod: 'razorpay'
        },
        createdAt: sub.createdAt || new Date(),
        updatedAt: new Date(),
        __v: 0
      });
      existingUserIds.add(userIdStr);
    } else {
      updatesToApply.push({
        updateOne: {
          filter: { _id: new ObjectId(userIdStr) },
          update: {
            $set: {
              'subscription.isActive': true,
              'subscription.status': 'active',
              'subscription.endDate': sub.endDate,
              'subscription.plan': sub.plan || null
            }
          }
        }
      });
    }
  }

  console.log(`Lifetime subscriptions identified: ${lifetimeCount}`);
  console.log(`Stubs to insert: ${stubsToInsert.length}`);
  console.log(`Updates to apply: ${updatesToApply.length}`);

  if (stubsToInsert.length > 0) {
    try {
      const res = await users.insertMany(stubsToInsert, { ordered: false });
      console.log(`✅ Successfully inserted ${res.insertedCount} stub user profiles.`);
    } catch (e) {
      console.log(`Inserted ${e.result?.nInserted || 0} stub user profiles (some skipped).`);
    }
  }

  if (updatesToApply.length > 0) {
    const res = await users.bulkWrite(updatesToApply, { ordered: false });
    console.log(`✅ Updated ${res.modifiedCount} existing user subscription states.`);
  }

  const finalTotal = await users.countDocuments();
  const finalActiveSubscribers = await users.countDocuments({ 'subscription.isActive': true });
  const finalLifetimeSubscribers = await users.countDocuments({
    'subscription.isActive': true,
    'subscription.endDate': { $gte: new Date('2090-01-01') }
  });

  console.log(`\n========================================`);
  console.log(`FINAL DATABASE STATUS IN ADMIN PANEL:`);
  console.log(`  Total Users in Admin:             ${finalTotal}`);
  console.log(`  Total Active Subscribers:         ${finalActiveSubscribers}`);
  console.log(`  Total Lifetime Subscribers:       ${finalLifetimeSubscribers}`);
  console.log(`========================================\n`);

  await client.close();
}

main().catch(console.error);
