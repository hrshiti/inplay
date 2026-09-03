/**
 * check_users_count.js
 * 
 * READ ONLY - Checks total user count and collection stats in MongoDB.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  const collections = await db.listCollections().toArray();
  console.log('Collections in database:');
  for (let c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(` - ${c.name}: ${count} documents`);
  }

  // Also check if there are other databases or oplog entries
  const adminDb = client.db().admin();
  const dbs = await adminDb.listDatabases();
  console.log('\nDatabases on cluster:');
  console.log(dbs.databases);

  await client.close();
}

main().catch(console.error);
