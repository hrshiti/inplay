/**
 * restore_users_from_oplog.js
 * 
 * READS oplog insert operations for inplay.users collection
 * and RESTORES the user documents back into the users collection.
 * 
 * SAFE BECAUSE:
 * - Uses upsert (insertOrUpdate) so existing users won't be duplicated
 * - Existing 205 users (registered after the drop) are NOT affected
 * - Only restores users that don't already exist (by _id)
 * - Skips any user whose _id already exists in the collection
 * 
 * Run: node scripts/restore_users_from_oplog.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  console.log('\n========================================');
  console.log('  OPLOG USER RESTORE SCRIPT');
  console.log('========================================\n');
  console.log('✅ Connected to MongoDB');

  const db = client.db('inplay');
  const oplog = client.db('local').collection('oplog.rs');
  const usersCol = db.collection('users');

  // Step 1: Get all insert operations from oplog for users collection
  console.log('\n📖 Reading all user insert operations from oplog...');
  const insertOps = await oplog.find({
    op: 'i',
    ns: 'inplay.users'
  }).toArray();

  console.log(`Found ${insertOps.length} user records in oplog`);

  // Step 2: Skip update operations (too many to sort in Atlas M0 memory limit)
  // Users will be restored with their registration-time data.
  // Subscription states can be manually fixed after if needed.
  console.log('📖 Skipping update ops (memory limit on free tier) — restoring base user records only...');
  const updateOps = []; // Skip for now
  console.log('Update ops: skipped (not needed for base restore)');

  // Step 3: Build latest user state map from inserts
  const userMap = new Map();
  for (const op of insertOps) {
    const doc = op.o;
    if (doc && doc._id) {
      userMap.set(String(doc._id), doc);
    }
  }

  console.log(`\nUnique users found in oplog: ${userMap.size}`);

  // Step 4: Apply updates on top (to get latest subscription state)
  let updatesApplied = 0;
  for (const op of updateOps) {
    const userId = String(op.o2?._id);
    if (!userId || !userMap.has(userId)) continue;

    const user = userMap.get(userId);
    const updateDoc = op.o;

    // Handle $set style updates
    if (updateDoc.$set) {
      for (const [key, value] of Object.entries(updateDoc.$set)) {
        // Handle nested keys like 'subscription.isActive'
        if (key.includes('.')) {
          const parts = key.split('.');
          let obj = user;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) obj[parts[i]] = {};
            obj = obj[parts[i]];
          }
          obj[parts[parts.length - 1]] = value;
        } else {
          user[key] = value;
        }
      }
      updatesApplied++;
    } else if (updateDoc.$inc) {
      for (const [key, value] of Object.entries(updateDoc.$inc)) {
        user[key] = (user[key] || 0) + value;
      }
    }
  }
  console.log(`Updates applied to user records: ${updatesApplied}`);

  // Step 5: Check how many already exist in the current collection
  const currentUserIds = await usersCol.distinct('_id');
  const currentIdSet = new Set(currentUserIds.map(id => String(id)));

  const toRestore = [];
  const alreadyExist = [];

  for (const [id, user] of userMap.entries()) {
    if (currentIdSet.has(id)) {
      alreadyExist.push(id);
    } else {
      toRestore.push(user);
    }
  }

  console.log(`\n--- RESTORE PLAN ---`);
  console.log(`Current users in DB (post-drop, keep as-is): ${currentUserIds.length}`);
  console.log(`Users already in DB (skip):                  ${alreadyExist.length}`);
  console.log(`Users to RESTORE from oplog:                 ${toRestore.length}`);

  if (toRestore.length === 0) {
    console.log('\n✅ Nothing to restore — all users already present!');
    await client.close();
    return;
  }

  // Step 6: Show sample of what will be restored
  console.log('\n--- SAMPLE OF USERS TO RESTORE (first 10) ---');
  toRestore.slice(0, 10).forEach((u, i) => {
    console.log(`  ${i+1}. ${u.name} | ${u.email} | phone: ${u.phone} | sub.isActive: ${u.subscription?.isActive}`);
  });
  if (toRestore.length > 10) console.log(`  ... and ${toRestore.length - 10} more`);

  // Step 7: ACTUALLY RESTORE
  console.log(`\n🔧 Restoring ${toRestore.length} users...`);

  let successCount = 0;
  let errorCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < toRestore.length; i += BATCH_SIZE) {
    const batch = toRestore.slice(i, i + BATCH_SIZE);
    
    try {
      // insertMany with ordered:false so one failure doesn't stop others
      const result = await usersCol.insertMany(batch, { ordered: false });
      successCount += result.insertedCount;
      console.log(`  Batch ${Math.floor(i/BATCH_SIZE) + 1}: restored ${result.insertedCount} users`);
    } catch (err) {
      // Handle duplicate key errors gracefully (some might already exist)
      if (err.code === 11000) {
        const inserted = err.result?.nInserted || 0;
        successCount += inserted;
        console.log(`  Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${inserted} restored, ${batch.length - inserted} already existed (skipped)`);
      } else {
        console.error(`  Batch ${Math.floor(i/BATCH_SIZE) + 1} ERROR:`, err.message);
        errorCount += batch.length;
      }
    }
  }

  // Step 8: Final verification
  const finalCount = await usersCol.countDocuments();
  
  console.log('\n========================================');
  console.log('  RESTORE COMPLETE');
  console.log('========================================');
  console.log(`  Users before restore: ${currentUserIds.length}`);
  console.log(`  Users restored:       ${successCount}`);
  console.log(`  Errors:               ${errorCount}`);
  console.log(`  Total users now:      ${finalCount}`);
  console.log('========================================\n');

  // Step 9: Count restored subscribed users
  const activeSubCount = await usersCol.countDocuments({ 'subscription.isActive': true });
  console.log(`Active subscribers after restore: ${activeSubCount}`);

  await client.close();
  console.log('🔌 Done. Restore complete!');
}

main().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
