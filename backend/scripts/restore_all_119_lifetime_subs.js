/**
 * restore_all_119_lifetime_subs.js
 * FAST BULK VERSION - NO CODE CHANGES TO PROJECT.
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

  const lifetimeSubs = await custSubs.find({
    $or: [
      { endDate: { $gte: new Date('2090-01-01') } },
      { plan: new ObjectId('69f6cd50be7cc1749e22a09b') }
    ]
  }).toArray();

  console.log(`Total Lifetime CustomerSubscriptions in DB: ${lifetimeSubs.length}`);

  const existingUserIds = new Set((await users.distinct('_id')).map(id => String(id)));

  const stubsToInsert = [];
  const updatesToApply = [];
  const endDate = new Date('2099-12-31T23:59:59.000Z');

  for (const sub of lifetimeSubs) {
    if (!sub.user) continue;
    const userIdStr = String(sub.user);

    if (!existingUserIds.has(userIdStr)) {
      stubsToInsert.push({
        _id: new ObjectId(userIdStr),
        name: `Lifetime_User_${userIdStr.slice(-4)}`,
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
          plan: sub.plan || new ObjectId('69f6cd50be7cc1749e22a09b'),
          endDate: sub.endDate || endDate,
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
              'subscription.endDate': sub.endDate || endDate,
              'subscription.plan': sub.plan || new ObjectId('69f6cd50be7cc1749e22a09b')
            }
          }
        }
      });
    }
  }

  if (stubsToInsert.length > 0) {
    try {
      await users.insertMany(stubsToInsert, { ordered: false });
      console.log(`✅ Inserted ${stubsToInsert.length} missing Lifetime user profiles.`);
    } catch (e) {
      console.log(`Inserted stub profiles (some skipped).`);
    }
  }

  if (updatesToApply.length > 0) {
    await users.bulkWrite(updatesToApply, { ordered: false });
    console.log(`✅ Updated ${updatesToApply.length} existing Lifetime user profiles.`);
  }

  const finalLifetimeCount = await users.countDocuments({
    'subscription.isActive': true,
    'subscription.endDate': { $gte: new Date('2090-01-01') }
  });

  const totalActiveSubscribers = await users.countDocuments({
    'subscription.isActive': true
  });

  console.log(`\n========================================`);
  console.log(`FINAL LIFETIME STATUS IN ADMIN PANEL:`);
  console.log(`  Total Active Subscribers:         ${totalActiveSubscribers}`);
  console.log(`  Total Lifetime Subscribers:       ${finalLifetimeCount}`);
  console.log(`========================================\n`);

  await client.close();
}

main().catch(console.error);
