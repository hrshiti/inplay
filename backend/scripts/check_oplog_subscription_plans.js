/**
 * check_oplog_subscription_plans.js
 * 
 * READ ONLY - Finds all subscription plans ever created in oplog.rs
 */
const { MongoClient } = require('mongodb');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB Oplog\n');

  const oplog = client.db('local').collection('oplog.rs');

  const planInserts = await oplog.find({
    op: 'i',
    ns: 'inplay.subscriptionplans'
  }).toArray();

  console.log(`========================================`);
  console.log(`  SUBSCRIPTION PLANS FOUND IN OPLOG: ${planInserts.length}`);
  console.log(`========================================\n`);

  const planMap = new Map();
  planInserts.forEach(op => {
    if (op.o && op.o._id) {
      planMap.set(String(op.o._id), op.o);
    }
  });

  for (const [id, doc] of planMap.entries()) {
    console.log(`📌 Plan ID: ${id}`);
    console.log(`   Name:     ${doc.name}`);
    console.log(`   Price:    ₹${doc.price}`);
    console.log(`   Duration: ${doc.duration}`);
    console.log(`   Razorpay: ${doc.razorpayPlanId}`);
    console.log('----------------------------------------');
  }

  await client.close();
}

main().catch(console.error);
