/**
 * restore_all_692_lifetime_users.js
 * 
 * Inspects oplog for all users who originally had lifetime subscriptions
 * and restores their Lifetime Plan (6a99aafd54a7ad7065bab2ea) + 2099-12-31 endDate.
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
  const localDb = client.db('local');
  const oplog = localDb.collection('oplog.rs');
  const usersCol = db.collection('users');
  const plansCol = db.collection('subscriptionplans');

  const lifetimePlan = await plansCol.findOne({ name: 'Lifetime Plan' });
  const lifetimePlanId = lifetimePlan._id;
  console.log(`Lifetime Plan ID: ${lifetimePlanId}`);

  // Find all user inserts/updates in oplog that had 2099 endDate or lifetime
  const lifetimeOps = await oplog.find({
    ns: 'inplay.users',
    $or: [
      { 'o.subscription.endDate': { $gte: new Date('2090-01-01') } },
      { 'o.$set.subscription.endDate': { $gte: new Date('2090-01-01') } },
      { 'o.subscription.plan': { $regex: 'lifetime', $options: 'i' } }
    ]
  }).toArray();

  console.log(`Found ${lifetimeOps.length} lifetime operations in oplog.`);

  const lifetimeUserIds = new Set();
  lifetimeOps.forEach(op => {
    const userId = op.o?._id || op.o2?._id;
    if (userId) lifetimeUserIds.add(String(userId));
  });

  console.log(`Unique Lifetime User IDs found in Oplog: ${lifetimeUserIds.size}`);

  // Also include users created by lifetime scripts (e.g., 9702470288)
  const manualUser = await usersCol.findOne({ phone: '9702470288' });
  if (manualUser) lifetimeUserIds.add(String(manualUser._id));

  // Also include users whose CustomerSubscription is >= 999 or LIFETIME_PLAN
  const customerSubLifetime = await db.collection('customersubscriptions').find({
    $or: [
      { price: { $gte: 999 } },
      { razorpaySubscriptionId: { $regex: 'LIFETIME', $options: 'i' } }
    ]
  }).toArray();

  customerSubLifetime.forEach(s => {
    if (s.user) lifetimeUserIds.add(String(s.user));
  });

  console.log(`Total Target Lifetime Users to restore: ${lifetimeUserIds.size}`);

  let updatedCount = 0;
  for (const idStr of lifetimeUserIds) {
    const res = await usersCol.updateOne(
      { _id: new (require('mongodb').ObjectId)(idStr) },
      {
        $set: {
          'subscription.isActive': true,
          'subscription.status': 'active',
          'subscription.plan': lifetimePlanId,
          'subscription.endDate': new Date('2099-12-31T23:59:59.000Z')
        }
      }
    );
    if (res.modifiedCount > 0) updatedCount++;
  }

  const finalLifetimeUsers = await usersCol.countDocuments({
    'subscription.plan': lifetimePlanId
  });

  console.log('\n========================================');
  console.log('  LIFETIME USERS FULLY RESTORED');
  console.log(`  Plan Name: "Lifetime Plan"`);
  console.log(`  Total Lifetime Users Now: ${finalLifetimeUsers}`);
  console.log('========================================\n');

  await client.close();
}

main().catch(console.error);
