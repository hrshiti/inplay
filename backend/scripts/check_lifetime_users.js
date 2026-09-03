/**
 * check_lifetime_users.js
 * Just inspect what lifetime users exist and their raw subscription data
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // Check 1: All users who have a subscription at all
  const withSub = await users.find({ 'subscription.plan': { $exists: true, $ne: null } }).toArray();
  console.log(`Total users with subscription.plan set: ${withSub.length}`);

  // Check 2: Users where isActive is false in subscription
  const subInactive = await users.find({ 'subscription.isActive': false }).toArray();
  console.log(`Users with subscription.isActive = false: ${subInactive.length}`);

  // Check 3: Users where subscription.isActive is true  
  const subActive = await users.find({ 'subscription.isActive': true }).toArray();
  console.log(`Users with subscription.isActive = true: ${subActive.length}`);

  // Check 4: Show ALL users with any subscription data (first 20)
  console.log('\n--- Sample of users with subscription ---');
  const sample = await users.find(
    { 'subscription.plan': { $exists: true, $ne: null } },
    { projection: { name: 1, email: 1, 'subscription.isActive': 1, 'subscription.status': 1, 'subscription.endDate': 1, 'subscription.plan': 1 } }
  ).limit(20).toArray();

  sample.forEach((u, i) => {
    console.log(`\n${i+1}. ${u.name} | ${u.email}`);
    console.log(`   isActive: ${u.subscription?.isActive}`);
    console.log(`   status: ${u.subscription?.status}`);
    console.log(`   endDate: ${JSON.stringify(u.subscription?.endDate)} (type: ${typeof u.subscription?.endDate})`);
    console.log(`   plan: ${u.subscription?.plan}`);
  });

  // Check 5: Check for endDate = 2099 specifically (as string or date)
  const endDate2099 = await users.find({
    $or: [
      { 'subscription.endDate': new Date('2099-12-31') },
      { 'subscription.endDate': '2099-12-31T00:00:00.000Z' },
      { 'subscription.endDate': '2099-12-31' }
    ]
  }).toArray();
  console.log(`\nUsers with endDate exactly 2099-12-31: ${endDate2099.length}`);
  endDate2099.forEach(u => {
    console.log(`  - ${u.name} | ${u.email} | isActive: ${u.subscription?.isActive} | status: ${u.subscription?.status}`);
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
