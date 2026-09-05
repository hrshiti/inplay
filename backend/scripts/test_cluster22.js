/**
 * test_cluster22.js
 * 
 * READ ONLY - Checks user count on cluster22 database
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
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
