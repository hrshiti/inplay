/**
 * check_inactive_subscribers_full.js
 * Deep dive: Who paid but is now deactivated?
 * Shows endDate, plan type, and payment history from CustomerSubscription
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;
  const now = new Date();

  // Get all inactive subscribed users with their full subscription info
  const inactiveUsers = await db.collection('users').find({
    'subscription.isActive': false,
    'subscription.plan': { $exists: true, $ne: null }
  }).project({
    name: 1, email: 1, phone: 1,
    'subscription.isActive': 1,
    'subscription.status': 1,
    'subscription.endDate': 1,
    'subscription.startDate': 1,
    'subscription.plan': 1,
    'subscription.razorpay_subscription_id': 1,
    createdAt: 1
  }).toArray();

  console.log(`Total inactive users with a plan assigned: ${inactiveUsers.length}`);

  // Separate: whose endDate is FUTURE (still should have access) vs PAST
  const futureEndDate  = inactiveUsers.filter(u => u.subscription?.endDate && new Date(u.subscription.endDate) > now);
  const pastEndDate    = inactiveUsers.filter(u => u.subscription?.endDate && new Date(u.subscription.endDate) <= now);
  const noEndDate      = inactiveUsers.filter(u => !u.subscription?.endDate);

  console.log(`\nAmong those 18 inactive-plan users:`);
  console.log(`  ❌ endDate is in the PAST (legit expired):   ${pastEndDate.length}`);
  console.log(`  ✅ endDate is in the FUTURE (wrongly kicked): ${futureEndDate.length}`);
  console.log(`  ⚠️  No endDate at all:                        ${noEndDate.length}`);

  if (futureEndDate.length > 0) {
    console.log('\n--- Users with FUTURE endDate who are wrongly inactive ---');
    futureEndDate.forEach((u, i) => {
      const endDate = new Date(u.subscription.endDate);
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      console.log(`\n  ${i+1}. ${u.name} | ${u.email} | phone: ${u.phone}`);
      console.log(`     endDate: ${endDate.toISOString()} (${daysLeft} days left)`);
      console.log(`     status: ${u.subscription?.status} | planId: ${u.subscription?.plan}`);
      console.log(`     razorpay_sub_id: ${u.subscription?.razorpay_subscription_id || 'none'}`);
    });
  }

  if (pastEndDate.length > 0) {
    console.log('\n--- Users with PAST endDate (legitimately expired) ---');
    pastEndDate.forEach((u, i) => {
      const endDate = new Date(u.subscription.endDate);
      const daysAgo = Math.ceil((now - endDate) / (1000 * 60 * 60 * 24));
      console.log(`  ${i+1}. ${u.name} | ${u.email} | expired ${daysAgo} days ago (${endDate.toISOString()})`);
    });
  }

  // Cross-check with CustomerSubscription for payment proof
  if (futureEndDate.length > 0) {
    console.log('\n--- Cross-checking CustomerSubscription for payment proof ---');
    for (const u of futureEndDate) {
      const custSub = await db.collection('customersubscriptions').findOne({
        user: u._id,
        status: 'active'
      });
      const custTrial = await db.collection('customertrialdays').findOne({
        user: u._id
      });
      console.log(`\n  ${u.email}:`);
      console.log(`    CustomerSubscription (active): ${custSub ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
      if (custSub) console.log(`      endDate: ${custSub.endDate} | price: ${custSub.price}`);
      console.log(`    CustomerTrial: ${custTrial ? 'FOUND (trial user)' : 'none'}`);
      if (custTrial) console.log(`      endDate: ${custTrial.endDate} | price: ${custTrial.trialPrice}`);
    }
  }

  await mongoose.disconnect();
  console.log('\n🔌 Done.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
