/**
 * diagnose_subscriptions_and_number.js
 * READ ONLY - Inspects total subscriptions and finds lifetime subscription for 9702470288
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  const custSubs = db.collection('customersubscriptions');
  const users = db.collection('users');
  const oplog = client.db('local').collection('oplog.rs');

  console.log('========================================');
  console.log('  1. TOTAL CUSTOMER SUBSCRIPTIONS IN DB');
  console.log('========================================');

  const totalCustSubs = await custSubs.countDocuments();
  const byStatus = await custSubs.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();

  console.log(`Total CustomerSubscription documents: ${totalCustSubs}`);
  console.log('Breakdown by status:');
  byStatus.forEach(b => console.log(`  - ${b._id}: ${b.count}`));

  console.log('\n========================================');
  console.log('  2. ALL LIFETIME SUBSCRIPTIONS IN DB');
  console.log('========================================');

  const lifetimeSubs = await custSubs.find({
    $or: [
      { endDate: { $gte: new Date('2090-01-01') } },
      { plan: new ObjectId('69f6cd50be7cc1749e22a09b') } // Lifetime Plan ID
    ]
  }).toArray();

  console.log(`Total Lifetime CustomerSubscriptions found: ${lifetimeSubs.length}`);

  console.log('\nChecking which Lifetime Subs are currently assigned vs unassigned:');
  let activeCount = 0;
  let unassignedCount = 0;

  for (const ls of lifetimeSubs) {
    const u = await users.findOne({ _id: new ObjectId(String(ls.user)) });
    if (u) {
      if (u.subscription?.isActive) activeCount++;
      else console.log(`  ⚠️ User exists but subscription.isActive is FALSE: ${u.phone} | ${u.email}`);
    } else {
      unassignedCount++;
      console.log(`  ❓ Unassigned Lifetime Sub (User ID ${ls.user} not in users collection)`);
    }
  }

  console.log(`\nLifetime Subs Active: ${activeCount} | Unassigned/Inactive: ${unassignedCount}`);

  console.log('\n========================================');
  console.log('  3. SEARCHING OPLOG FOR 9702470288 OLD USER RECORD');
  console.log('========================================');

  // Search oplog for any historical user record with phone 9702470288 or 7024702888
  const oldUserOps = await oplog.find({
    op: 'i',
    ns: 'inplay.users',
    $or: [
      { 'o.phone': '9702470288' },
      { 'o.phone': '7024702888' },
      { 'o.email': { $regex: '9702470288|7024702888' } }
    ]
  }).toArray();

  console.log(`Found ${oldUserOps.length} historical registration ops in oplog for this phone number:`);
  oldUserOps.forEach((op, i) => {
    console.log(`\n[${i+1}] Original User ID: ${op.o._id}`);
    console.log(`    Name: ${op.o.name} | Phone: ${op.o.phone} | Email: ${op.o.email}`);
    console.log(`    Created at: ${op.o.createdAt}`);
  });

  // Check if CustomerSubscription exists for any of those original User IDs
  for (const op of oldUserOps) {
    const origId = op.o._id;
    const sub = await custSubs.findOne({
      $or: [
        { user: new ObjectId(String(origId)) },
        { user: String(origId) }
      ]
    });
    console.log(`\n  Checking CustomerSubscription for Old User ID ${origId}:`);
    if (sub) {
      console.log(`  ✅ FOUND SUBSCRIPTION: status=${sub.status}, price=₹${sub.price}, endDate=${sub.endDate}`);
    } else {
      console.log(`  ❌ No CustomerSubscription found for Old User ID ${origId}`);
    }
  }

  await client.close();
}

main().catch(console.error);
