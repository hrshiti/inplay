/**
 * get_drop_commands_audit.js
 * 
 * READ ONLY - Extracts all available oplog details (timestamps, LSIDs, transaction IDs)
 * for both Drop #1 (Sept 2) and Drop #2 (Sept 3).
 */
const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://inplayott_db_user:xy3yWz7KlB29QBPI@cluster1.43ac8dg.mongodb.net/local";

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB Oplog\n');

  const oplog = client.db('local').collection('oplog.rs');

  const drops = await oplog.find({
    op: 'c',
    'o.drop': 'users'
  }).toArray();

  console.log('====================================================');
  console.log('  OPLOG METADATA FOR USER COLLECTION DROPS');
  console.log('====================================================\n');

  drops.forEach((op, index) => {
    const time = new Date(op.wall || op.ts.getHighBits() * 1000).toLocaleString();
    console.log(`📌 DROP #${index + 1}:`);
    console.log(`   Exact Time:   ${time}`);
    console.log(`   Records Dropped: ${op.o2?.numRecords || 'Unknown'}`);
    console.log(`   UUID:         ${op.ui}`);
    console.log(`   Session ID:   ${op.lsid ? JSON.stringify(op.lsid.id) : 'N/A (Direct Command)'}`);
    console.log(`   Full Entry:   `, JSON.stringify(op, null, 2));
    console.log('----------------------------------------------------\n');
  });

  await client.close();
}

main().catch(console.error);
