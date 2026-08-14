// READ-ONLY. Find the user/subscription tied to this exact recent 149 purchase attempt.
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // order created_at 1786739319 (epoch seconds) -> Date
  const orderCreatedAt = new Date(1786739319 * 1000);
  console.log('Order created at:', orderCreatedAt.toISOString());

  // Find users updated within a couple minutes of this timestamp with a razorpay_subscription_id set
  const windowStart = new Date(orderCreatedAt.getTime() - 5 * 60 * 1000);
  const windowEnd = new Date(orderCreatedAt.getTime() + 5 * 60 * 1000);

  const candidates = await db.collection('users').find({
    updatedAt: { $gte: windowStart, $lte: windowEnd },
    'subscription.razorpay_subscription_id': { $ne: null, $exists: true }
  }).project({ phone: 1, email: 1, subscription: 1, updatedAt: 1 }).toArray();

  console.log('\n--- Candidate users updated in that window with a subscription id set ---');
  console.log('count:', candidates.length);
  candidates.forEach(u => console.log(JSON.stringify(u)));

  await mongoose.disconnect();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
