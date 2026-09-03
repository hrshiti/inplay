/**
 * deep_search_user_history.js
 * Search entire database and oplog for any trace of 9702470288 or 7024702888
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  const oplog = client.db('local').collection('oplog.rs');
  const targetPhone = '9702470288';
  const altPhone = '7024702888';

  console.log(`========================================`);
  console.log(`DEEP SEARCHING DATABASE & OPLOG FOR: ${targetPhone} / ${altPhone}`);
  console.log(`========================================\n`);

  // 1. Search Oplog for any insert/update/delete containing 9702470288 or 7024702888
  console.log('--- 1. OPLOG SEARCH ---');
  const oplogMatches = await oplog.find({
    $or: [
      { 'o.phone': targetPhone },
      { 'o.phone': altPhone },
      { 'o.email': `user_${targetPhone}@inplay.com` },
      { 'o.email': `user_${altPhone}@inplay.com` }
    ]
  }).toArray();

  console.log(`Oplog entries found: ${oplogMatches.length}`);
  oplogMatches.forEach((op, i) => {
    const sec = op.ts.high || op.ts.t;
    const date = new Date(sec * 1000);
    console.log(`  [${i+1}] Date: ${date.toISOString()} | Op: ${op.op} | NS: ${op.ns}`);
    console.log(`      Doc:`, JSON.stringify(op.o).substring(0, 150));
  });

  // 2. Search all collections for any document containing the phone string
  console.log('\n--- 2. ALL COLLECTIONS SEARCH ---');
  const cols = await db.listCollections().toArray();
  for (const c of cols) {
    const col = db.collection(c.name);
    const count = await col.countDocuments({
      $or: [
        { phone: targetPhone },
        { phone: altPhone },
        { userPhone: targetPhone },
        { mobile: targetPhone }
      ]
    });
    if (count > 0) {
      console.log(`  Found ${count} documents in collection "${c.name}"`);
    }
  }

  await client.close();
}

main().catch(console.error);
