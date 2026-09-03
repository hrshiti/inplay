/**
 * test_cluster22.js
 * 
 * READ ONLY - Checks user count on cluster22 database
 */
const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://bhatiabhishek597_db_user:bhatiabhishek597_db_user@cluster22.pwaaksa.mongodb.net/inplay";
  const client = new MongoClient(uri);
  await client.connect();
  console.log('✅ Connected to cluster22 MongoDB\n');

  const db = client.db('inplay');
  const collections = await db.listCollections().toArray();
  console.log('Collections in database:');
  for (let c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(` - ${c.name}: ${count} documents`);
  }

  await client.close();
}

main().catch(console.error);
