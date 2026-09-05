/**
 * find_all_plan_ids_in_db.js
 * 
 * READ ONLY - Finds all distinct plan IDs used across CustomerSubscriptions and Users
 */
const { MongoClient } = require('mongodb');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB Cluster 1\n');

  const db = client.db('inplay');

  const distinctPlansInSubs = await db.collection('customersubscriptions').distinct('plan');
  console.log('Distinct plan IDs in CustomerSubscriptions:', distinctPlansInSubs);

  const distinctPlansInUsers = await db.collection('users').distinct('subscription.plan');
  console.log('Distinct plan IDs in Users:', distinctPlansInUsers);

  // Check sample CustomerSubscription docs
  const sampleSubs = await db.collection('customersubscriptions').find({}).limit(5).toArray();
  console.log('\nSample CustomerSubscription docs:');
  console.log(JSON.stringify(sampleSubs, null, 2));

  await client.close();
}

main().catch(console.error);
