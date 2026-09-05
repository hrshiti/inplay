/**
 * investigate_today_drop.js
 * 
 * READ ONLY - Inspects the oplog entry for today's drop command (3/9/2026 12:48:47 pm)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const localDb = client.db('local');
  const oplog = localDb.collection('oplog.rs');

  const dropOps = await oplog.find({
    'op': 'c',
    'o.drop': 'users'
  }).toArray();

  console.log('\n--- ALL DROP USER OPERATIONS IN OPLOG ---');
  dropOps.forEach((op, index) => {
    const time = new Date(op.wall || op.ts.getHighBits() * 1000).toLocaleString();
    console.log(`\nDrop #${index + 1} at ${time}:`);
    console.log(JSON.stringify(op, null, 2));
  });

  await client.close();
}

main().catch(console.error);
