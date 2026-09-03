/**
 * investigate_data_loss.js
 * INVESTIGATION ONLY - NO CHANGES
 * 
 * Checks:
 * 1. Total user count in current DB
 * 2. All databases available on this cluster
 * 3. User createdAt distribution (when were they created)
 * 4. Any deleted/dropped collections
 * 5. MongoDB cluster info
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  console.log('\n========================================');
  console.log('  DATA LOSS INVESTIGATION SCRIPT');
  console.log('  READ ONLY - NO CHANGES WILL BE MADE');
  console.log('========================================\n');
  console.log(`MongoDB URI: ${uri.replace(/:([^:@]+)@/, ':****@')}`); // hide password
  console.log(`Current DB: ${uri.split('/').pop().split('?')[0]}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Connect with native driver to inspect all databases
  const client = new MongoClient(uri);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  // -------------------------------------------------------
  // 1. List ALL databases on this cluster
  // -------------------------------------------------------
  console.log('--- ALL DATABASES ON THIS CLUSTER ---');
  try {
    const adminDb = client.db('admin');
    const dbList = await adminDb.command({ listDatabases: 1 });
    dbList.databases.forEach(db => {
      console.log(`  📁 ${db.name}  (size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
  } catch (e) {
    console.log('  Could not list databases (permission issue):', e.message);
  }

  // -------------------------------------------------------
  // 2. Check current connected database
  // -------------------------------------------------------
  const dbName = uri.split('/').pop().split('?')[0];
  const db = client.db(dbName);
  
  console.log(`\n--- CURRENT DATABASE: "${dbName}" ---`);
  const collections = await db.listCollections().toArray();
  console.log(`Collections found: ${collections.length}`);
  
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  📦 ${col.name}: ${count} documents`);
  }

  // -------------------------------------------------------
  // 3. Users deep dive
  // -------------------------------------------------------
  const users = db.collection('users');
  const totalUsers = await users.countDocuments();
  console.log(`\n--- USERS DEEP DIVE ---`);
  console.log(`Total users: ${totalUsers}`);

  // First user ever created
  const firstUser = await users.find({}).sort({ createdAt: 1 }).limit(1).toArray();
  const lastUser  = await users.find({}).sort({ createdAt: -1 }).limit(1).toArray();
  if (firstUser.length) console.log(`First user created: ${firstUser[0].createdAt} | ${firstUser[0].email}`);
  if (lastUser.length)  console.log(`Last user created:  ${lastUser[0].createdAt} | ${lastUser[0].email}`);

  // Distribution by month
  console.log('\nUsers created per month:');
  const byMonth = await users.aggregate([
    {
      $group: {
        _id: {
          year:  { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]).toArray();

  byMonth.forEach(row => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    console.log(`  ${monthNames[row._id.month - 1]} ${row._id.year}: ${row.count} users`);
  });

  // -------------------------------------------------------
  // 4. Check if there are other databases with user data
  // -------------------------------------------------------
  console.log('\n--- CHECKING OTHER DATABASES FOR USER DATA ---');
  try {
    const adminDb = client.db('admin');
    const dbList = await adminDb.command({ listDatabases: 1 });
    
    for (const dbInfo of dbList.databases) {
      if (dbInfo.name === dbName || dbInfo.name === 'admin' || dbInfo.name === 'local') continue;
      
      try {
        const otherDb = client.db(dbInfo.name);
        const cols = await otherDb.listCollections().toArray();
        const hasUsers = cols.find(c => c.name === 'users');
        if (hasUsers) {
          const count = await otherDb.collection('users').countDocuments();
          console.log(`  ⚠️  Database "${dbInfo.name}" has a "users" collection with ${count} documents!`);
        }
      } catch (e) {
        // permission denied, skip
      }
    }
  } catch (e) {
    console.log('  Cannot check other databases:', e.message);
  }

  // -------------------------------------------------------
  // 5. Check CustomerSubscription count (should reflect 400-500)
  // -------------------------------------------------------
  const custSubCount = await db.collection('customersubscriptions').countDocuments();
  const custTrialCount = await db.collection('customertrialdays').countDocuments();
  console.log(`\n--- SUBSCRIPTION RECORDS ---`);
  console.log(`CustomerSubscriptions: ${custSubCount}`);
  console.log(`CustomerTrials: ${custTrialCount}`);

  // Show recent CustomerSubscriptions
  const recentSubs = await db.collection('customersubscriptions')
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('\nMost recent CustomerSubscriptions:');
  recentSubs.forEach(s => {
    console.log(`  - user: ${s.user} | status: ${s.status} | price: ₹${s.price} | created: ${s.createdAt || 'N/A'}`);
  });

  // -------------------------------------------------------
  // 6. Check if there are users with no createdAt (data migration issue)
  // -------------------------------------------------------
  const noCreatedAt = await users.countDocuments({ createdAt: { $exists: false } });
  console.log(`\nUsers with NO createdAt field: ${noCreatedAt}`);

  // -------------------------------------------------------
  // 7. Check MongoDB change streams / oplog if available
  // -------------------------------------------------------
  console.log('\n--- CHECKING OPLOG (if available) ---');
  try {
    const local = client.db('local');
    const oplog = local.collection('oplog.rs');
    
    // Find recent drop/delete operations on users collection
    const recentDrops = await oplog.find({
      $or: [
        { op: 'c', 'o.drop': 'users' },
        { op: 'c', 'o.dropDatabase': 1 },
        { op: 'd', ns: `${dbName}.users` }
      ]
    }).sort({ ts: -1 }).limit(10).toArray();
    
    if (recentDrops.length > 0) {
      console.log(`⚠️  FOUND ${recentDrops.length} suspicious operations:`);
      recentDrops.forEach(op => {
        console.log(`  - op: ${op.op} | ns: ${op.ns} | ts: ${op.ts}`);
      });
    } else {
      console.log('No recent drop/delete operations found in oplog.');
    }
    
    // Count total deletes on users in oplog
    const totalDeletes = await oplog.countDocuments({
      op: 'd',
      ns: `${dbName}.users`
    });
    console.log(`Total user delete operations in oplog: ${totalDeletes}`);
    
  } catch (e) {
    console.log('Oplog not accessible (normal for Atlas shared tier):', e.message);
  }

  await client.close();
  console.log('\n🔌 Investigation complete. No changes were made.');
}

main().catch(err => {
  console.error('💥 Error:', err);
  process.exit(1);
});
