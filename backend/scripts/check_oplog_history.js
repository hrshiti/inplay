/**
 * check_oplog_history.js
 * 
 * READ ONLY - Checks recent oplog operations on inplay.users
 */
const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://inplayott_db_user:xy3yWz7KlB29QBPI@cluster1.43ac8dg.mongodb.net/local";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Connected to local db for oplog check\n');
    const localDb = client.db('local');
    const oplog = localDb.collection('oplog.rs');

    // Check drop operations
    const drops = await oplog.find({
      'ns': 'inplay.$cmd',
      'op': 'c'
    }).toArray();
    console.log('Commands/Drops recorded in oplog:');
    drops.forEach(d => console.log(` [${new Date(d.wall || d.ts.getHighBits() * 1000).toLocaleString()}] Command:`, d.o));

    // Check delete operations on users collection
    const deleteCount = await oplog.countDocuments({
      'ns': 'inplay.users',
      'op': 'd'
    });
    console.log(`\nTotal DELETE operations on inplay.users in oplog: ${deleteCount}`);

    // Check recent delete operations
    const recentDeletes = await oplog.find({
      'ns': 'inplay.users',
      'op': 'd'
    }).sort({ $natural: -1 }).limit(5).toArray();

    if (recentDeletes.length > 0) {
      console.log('\nRecent DELETE operations on inplay.users:');
      recentDeletes.forEach(d => console.log(` [${new Date(d.wall || d.ts.getHighBits() * 1000).toLocaleString()}] Deleted ID:`, d.o._id));
    }

  } catch (err) {
    console.error('Error checking oplog:', err.message);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
