/**
 * investigate_drop_command_details.js
 * 
 * Inspects MongoDB oplog in depth to gather details about the drop command:
 * exact timestamp, connection info, BSON details, and preceding commands.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const local = client.db('local');
  const oplog = local.collection('oplog.rs');
  const dbName = 'inplay';

  // Find the exact drop command entry in oplog
  const dropOp = await oplog.findOne({
    ns: `${dbName}.$cmd`,
    'o.drop': 'users'
  });

  console.log('========================================');
  console.log('  USER COLLECTION DROP DETAILS');
  console.log('========================================');

  if (dropOp) {
    const sec = dropOp.ts.high || dropOp.ts.t;
    const date = new Date(sec * 1000);
    console.log(`Exact Time (UTC): ${date.toISOString()}`);
    console.log(`Exact Time (IST): ${date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Operation Object: ${JSON.stringify(dropOp.o, null, 2)}`);
    console.log(`LSID (Logical Session ID): ${JSON.stringify(dropOp.lsid, null, 2)}`);
    console.log(`Full Oplog Entry:\n${JSON.stringify(dropOp, null, 2)}`);
  } else {
    console.log('Drop operation entry not found directly in oplog filter.');
  }

  // Find operations right around the drop command (10 seconds before and after)
  if (dropOp) {
    const targetTs = dropOp.ts;
    const surrounding = await oplog.find({
      $or: [
        { ns: `${dbName}.$cmd` },
        { ns: `${dbName}.users` }
      ]
    }).sort({ ts: -1 }).limit(20).toArray();

    console.log('\n--- RECENT COMMANDS / ACTIONS NEAR DROP ---');
    surrounding.forEach((op, idx) => {
      const s = op.ts.high || op.ts.t;
      const d = new Date(s * 1000);
      console.log(`[${idx+1}] ${d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | NS: ${op.ns} | OP: ${op.op} | Obj: ${JSON.stringify(op.o).substring(0, 120)}`);
    });
  }

  await client.close();
}

main().catch(console.error);
