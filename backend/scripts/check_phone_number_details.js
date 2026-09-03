/**
 * check_phone_number_details.js
 * READ ONLY - Inspect user profile and payment/subscription history for phone number
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  const queryPhone = '97024702888';
  const shortPhone = '7024702888';
  const tenDigitPhone = '9702470288';

  console.log(`========================================`);
  console.log(`CHECKING PHONE NUMBER: ${queryPhone}`);
  console.log(`========================================\n`);

  // Search users collection by exact match or regex
  const matchingUsers = await db.collection('users').find({
    $or: [
      { phone: queryPhone },
      { phone: shortPhone },
      { phone: tenDigitPhone },
      { phone: { $regex: '7024702888|9702470288' } },
      { email: { $regex: '7024702888|9702470288' } }
    ]
  }).toArray();

  console.log(`Users found in DB: ${matchingUsers.length}`);
  matchingUsers.forEach((u, i) => {
    console.log(`\nUser [${i+1}]:`);
    console.log(`  _id: ${u._id}`);
    console.log(`  name: ${u.name}`);
    console.log(`  email: ${u.email}`);
    console.log(`  phone: ${u.phone}`);
    console.log(`  role: ${u.role}`);
    console.log(`  subscription:`, JSON.stringify(u.subscription, null, 2));
    console.log(`  createdAt: ${u.createdAt}`);
  });

  // Search CustomerSubscriptions
  const userIds = matchingUsers.map(u => u._id);
  const custSubs = await db.collection('customersubscriptions').find({
    $or: [
      { user: { $in: userIds } },
      { user: { $in: userIds.map(id => String(id)) } }
    ]
  }).toArray();

  console.log(`\nCustomerSubscriptions found for user IDs: ${custSubs.length}`);
  custSubs.forEach((cs, i) => {
    console.log(`\nCustomerSub [${i+1}]:`);
    console.log(`  _id: ${cs._id}`);
    console.log(`  user: ${cs.user}`);
    console.log(`  status: ${cs.status}`);
    console.log(`  price: ₹${cs.price}`);
    console.log(`  plan: ${cs.plan}`);
    console.log(`  startDate: ${cs.startDate}`);
    console.log(`  endDate: ${cs.endDate}`);
    console.log(`  razorpay_subscription_id: ${cs.razorpay_subscription_id}`);
  });

  // Search CustomerTrialDays
  const custTrials = await db.collection('customertrialdays').find({
    $or: [
      { user: { $in: userIds } },
      { user: { $in: userIds.map(id => String(id)) } }
    ]
  }).toArray();

  console.log(`\nCustomerTrialDays found: ${custTrials.length}`);
  custTrials.forEach((ct, i) => {
    console.log(`  Trial [${i+1}]: user=${ct.user}, endDate=${ct.endDate}, price=₹${ct.trialPrice}`);
  });

  // Also check if there's any CustomerSubscription with string phone search
  const allCustSubs = await db.collection('customersubscriptions').find({}).toArray();
  const matchedCustSubs = [];
  for (const cs of allCustSubs) {
    if (String(cs.user).includes('7024702888') || String(cs.user).includes('9702470288')) {
      matchedCustSubs.push(cs);
    }
  }
  console.log(`\nCustomerSubscriptions matching phone string in user field: ${matchedCustSubs.length}`);

  await client.close();
}

main().catch(console.error);
