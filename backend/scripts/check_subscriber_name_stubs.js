/**
 * check_subscriber_name_stubs.js
 * READ ONLY - Inspect Subscriber_XXXX stub profiles in DB
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  const stubs = await db.collection('users').find({
    name: { $regex: '^Subscriber_' }
  }).limit(5).toArray();

  console.log(`Total Subscriber_XXXX profiles in DB: ${await db.collection('users').countDocuments({ name: { $regex: '^Subscriber_' } })}`);
  console.log('\nSample profiles:');
  stubs.forEach((u, i) => {
    console.log(`\n[${i+1}] Name: ${u.name}`);
    console.log(`    Email: ${u.email}`);
    console.log(`    Phone: ${u.phone}`);
    console.log(`    Subscription Active: ${u.subscription?.isActive}`);
    console.log(`    Plan End Date: ${u.subscription?.endDate}`);
  });

  await client.close();
}

main().catch(console.error);
