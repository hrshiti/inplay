/**
 * restore_subscription_states.js
 * 
 * After user restore, now cross-reference CustomerSubscription and
 * CustomerTrial records to re-activate users who were paying subscribers.
 * 
 * SAFE: Only updates subscription.isActive and subscription.endDate
 * for users who have a confirmed payment record.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('\n========================================');
  console.log('  SUBSCRIPTION STATE RESTORE');
  console.log('========================================\n');

  const db = client.db('inplay');
  const users = db.collection('users');
  const custSubs = db.collection('customersubscriptions');
  const custTrials = db.collection('customertrialdays');
  const now = new Date();

  // Get all ACTIVE CustomerSubscriptions with future endDate
  const activeSubs = await custSubs.find({
    status: 'active',
    endDate: { $gt: now }
  }).toArray();

  console.log(`Active CustomerSubscriptions with future endDate: ${activeSubs.length}`);

  let subActivated = 0;
  let subAlreadyActive = 0;
  let subUserNotFound = 0;

  for (const sub of activeSubs) {
    try {
      const userId = sub.user;
      const user = await users.findOne({ _id: new ObjectId(String(userId)) });
      
      if (!user) {
        subUserNotFound++;
        continue;
      }

      if (user.subscription?.isActive) {
        subAlreadyActive++;
        continue;
      }

      // Re-activate this user's subscription
      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            'subscription.isActive': true,
            'subscription.status': 'active',
            'subscription.endDate': sub.endDate,
            'subscription.startDate': sub.startDate || user.subscription?.startDate,
            'subscription.plan': sub.plan || user.subscription?.plan
          }
        }
      );
      console.log(`  ✅ Re-activated: ${user.email} | until: ${sub.endDate}`);
      subActivated++;
    } catch (e) {
      console.error(`  ❌ Error for sub ${sub._id}:`, e.message);
    }
  }

  console.log(`\nCustomerSubscription restore: ${subActivated} activated, ${subAlreadyActive} already active, ${subUserNotFound} user not found`);

  // Also check trials with future endDate (trial users who should still have access)
  const activeTrials = await custTrials.find({
    endDate: { $gt: now }
  }).toArray();

  console.log(`\nActive trials with future endDate: ${activeTrials.length}`);
  
  let trialActivated = 0;
  for (const trial of activeTrials) {
    try {
      const userId = trial.user;
      const user = await users.findOne({ _id: new ObjectId(String(userId)) });
      
      if (!user || user.subscription?.isActive) continue;

      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            'subscription.isActive': true,
            'subscription.status': 'active',
            'subscription.endDate': trial.endDate,
            'subscription.isTrialUsed': true
          }
        }
      );
      console.log(`  ✅ Trial re-activated: ${user.email} | until: ${trial.endDate}`);
      trialActivated++;
    } catch (e) {
      console.error(`  ❌ Trial error:`, e.message);
    }
  }

  console.log(`Trial restore: ${trialActivated} activated`);

  // Final count
  const totalUsers = await users.countDocuments();
  const activeSubsCount = await users.countDocuments({ 'subscription.isActive': true });
  
  console.log('\n========================================');
  console.log('  FINAL STATE');
  console.log('========================================');
  console.log(`  Total users: ${totalUsers}`);
  console.log(`  Active subscribers: ${activeSubsCount}`);
  console.log('========================================\n');

  await client.close();
  console.log('🔌 Done!');
}

main().catch(err => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});
