/**
 * check_payment_proof.js
 * For each expired user, check if they have actual payment proof
 * in CustomerSubscription or CustomerTrial collections
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;
  const now = new Date();

  // The 18 expired users
  const expiredUsers = await db.collection('users').find({
    'subscription.isActive': false,
    'subscription.plan': { $exists: true, $ne: null },
    'subscription.endDate': { $lte: now }
  }).project({
    _id: 1, name: 1, email: 1, phone: 1,
    'subscription.endDate': 1,
    'subscription.plan': 1
  }).toArray();

  console.log(`Checking ${expiredUsers.length} expired users for payment proof...\n`);
  console.log('='.repeat(70));

  let confirmedPaid = [];
  let trialOnly = [];
  let noPurchaseRecord = [];

  for (const u of expiredUsers) {
    // Check CustomerSubscription (real plan purchase)
    const custSub = await db.collection('customersubscriptions').findOne({
      user: u._id,
    });

    // Check CustomerTrial
    const custTrial = await db.collection('customertrialdays').findOne({
      user: u._id
    });

    const expiredDaysAgo = Math.ceil((now - new Date(u.subscription.endDate)) / (1000 * 60 * 60 * 24));

    if (custSub) {
      confirmedPaid.push({ user: u, custSub, custTrial });
      console.log(`✅ PAID: ${u.name} | ${u.email}`);
      console.log(`   Plan endDate: ${u.subscription.endDate} (expired ${expiredDaysAgo}d ago)`);
      console.log(`   CustomerSub status: ${custSub.status} | price: ₹${custSub.price} | endDate: ${custSub.endDate}`);
      if (custTrial) console.log(`   Also has trial record: ₹${custTrial.trialPrice}`);
    } else if (custTrial) {
      trialOnly.push({ user: u, custTrial });
      console.log(`⚡ TRIAL ONLY: ${u.name} | ${u.email}`);
      console.log(`   Plan endDate: ${u.subscription.endDate} (expired ${expiredDaysAgo}d ago)`);
      console.log(`   Trial: ₹${custTrial.trialPrice} | trialEnd: ${custTrial.endDate}`);
    } else {
      noPurchaseRecord.push(u);
      console.log(`❓ NO RECORD: ${u.name} | ${u.email} | expired ${expiredDaysAgo}d ago`);
    }
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('\nSUMMARY:');
  console.log(`  ✅ Has CustomerSubscription (paid plan):  ${confirmedPaid.length}`);
  console.log(`  ⚡ Trial only (no main plan purchase):    ${trialOnly.length}`);
  console.log(`  ❓ No purchase record found:              ${noPurchaseRecord.length}`);

  await mongoose.disconnect();
  console.log('\n🔌 Done.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
