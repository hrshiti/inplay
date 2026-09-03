/**
 * test_cluster1_live.js
 * 
 * READ ONLY - Checks user count on cluster1 with live password
 */
const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://inplayott_db_user:xy3yWz7KlB29QBPI@cluster1.43ac8dg.mongodb.net/inplay";
  const client = new MongoClient(uri);
  await client.connect();
  console.log('✅ Connected to cluster1 MongoDB\n');

  const db = client.db('inplay');
  const collections = await db.listCollections().toArray();
  console.log('Collections in database:');
  for (let c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(` - ${c.name}: ${count} documents`);
  }

  // Check sample users
  const sampleUsers = await db.collection('users').find({}).limit(5).toArray();
  console.log('\nSample users in cluster1:');
  sampleUsers.forEach(u => console.log(` - ${u.name} | ${u.phone} | ${u.email} | Created: ${u.createdAt}`));

  await client.close();
}

main().catch(console.error);
