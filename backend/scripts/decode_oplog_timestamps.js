/**
 * decode_oplog_timestamps.js
 * READ ONLY - Decodes MongoDB oplog timestamps for delete operations
 * to find WHEN and HOW users were deleted
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient, Timestamp } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  console.log('✅ Connected\n');

  const local = client.db('local');
  const oplog = local.collection('oplog.rs');
  const dbName = uri.split('/').pop().split('?')[0];

  console.log('========================================');
  console.log('  OPLOG DELETE ANALYSIS');
  console.log('========================================\n');

  // Get ALL delete operations on users collection, sorted by time
  const deletes = await oplog.find({
    op: 'd',
    ns: `${dbName}.users`
  }).sort({ ts: -1 }).toArray();

  console.log(`Total delete operations on users collection: ${deletes.length}\n`);

  // Decode MongoDB Timestamp (BSON Timestamp: seconds + increment)
  deletes.forEach((op, i) => {
    const ts = op.ts;
    // BSON Timestamp: high 32 bits = unix seconds, low 32 bits = ordinal
    const seconds = ts.high;
    const date = new Date(seconds * 1000);
    const deletedId = op.o?._id;
    console.log(`${i+1}. Deleted at: ${date.toISOString()} (IST: ${date.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})})`);
    console.log(`   Deleted _id: ${deletedId}`);
    if (i < 10) {
      // For first 10, show more detail
      console.log(`   Operation: ${JSON.stringify(op.o)}`);
    }
    console.log('');
  });

  // Time range of deletions
  if (deletes.length > 0) {
    const oldest = deletes[deletes.length - 1];
    const newest = deletes[0];
    const oldestDate = new Date(oldest.ts.high * 1000);
    const newestDate = new Date(newest.ts.high * 1000);
    
    console.log('='.repeat(50));
    console.log(`DELETION WINDOW:`);
    console.log(`  First deletion: ${oldestDate.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
    console.log(`  Last deletion:  ${newestDate.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
    console.log(`  Duration: ${Math.ceil((newestDate - oldestDate) / 1000 / 60)} minutes`);
    console.log('='.repeat(50));
  }

  // Also check for any bulk write or drop commands
  console.log('\n\n--- CHECKING FOR BULK DELETES / DROP COMMANDS ---');
  const commands = await oplog.find({
    ns: `${dbName}.$cmd`,
    $or: [
      { 'o.drop': 'users' },
      { 'o.dropDatabase': 1 },
      { 'o.deleteMany': { $exists: true } }
    ]
  }).sort({ ts: -1 }).limit(20).toArray();

  if (commands.length > 0) {
    console.log(`Found ${commands.length} command operations:`);
    commands.forEach(cmd => {
      const date = new Date(cmd.ts.high * 1000);
      console.log(`  ${date.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}: ${JSON.stringify(cmd.o).substring(0, 200)}`);
    });
  } else {
    console.log('No drop/dropDatabase commands found.');
  }

  // Check if any script ran deleteMany
  const recentApplyOps = await oplog.find({
    ns: `${dbName}.users`,
    ts: { $gte: new Timestamp(Math.floor(Date.now()/1000) - 86400, 0) } // last 24 hours
  }).sort({ ts: 1 }).limit(5).toArray();
  
  console.log('\n\n--- FIRST OPERATIONS ON USERS IN LAST 24H ---');
  recentApplyOps.forEach(op => {
    const date = new Date(op.ts.high * 1000);
    console.log(`  ${date.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})} | op: ${op.op} | _id: ${op.o?._id || op.o2?._id}`);
  });

  await client.close();
  console.log('\n🔌 Done. No changes were made.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
