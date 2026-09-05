/**
 * sync_user_real_plans_and_dates.js
 * 
 * Safely syncs each user's subscription plan reference and calculates 
 * exact original expiry dates based on their CustomerSubscription records.
 */
const { MongoClient, ObjectId } = require('mongodb');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB Cluster 1\n');

  const db = client.db('inplay');
  const usersCol = db.collection('users');
  const plansCol = db.collection('subscriptionplans');
  const customerSubCol = db.collection('customersubscriptions');

  // Fetch current plans
  const plans = await plansCol.find({}).toArray();
  console.log('Current Subscription Plans in DB:');
  plans.forEach(p => console.log(` - ID: ${p._id} | Name: ${p.name} | Price: ₹${p.price} | Duration: ${p.duration}`));

  const monthlyPlan = plans.find(p => p.duration === 'monthly' || p.name.toLowerCase().includes('month')) || plans[0];
  const quarterlyPlan = plans.find(p => p.duration === 'quarterly' || p.name.toLowerCase().includes('quarter')) || plans[1] || plans[0];
  const yearlyPlan = plans.find(p => p.duration === 'yearly' || p.name.toLowerCase().includes('year')) || plans[2] || plans[0];

  console.log('\nMapping Rules:');
  console.log(` - Monthly Plan ID:   ${monthlyPlan?._id} (${monthlyPlan?.name})`);
  console.log(` - Quarterly Plan ID: ${quarterlyPlan?._id} (${quarterlyPlan?.name})`);
  console.log(` - Yearly Plan ID:    ${yearlyPlan?._id} (${yearlyPlan?.name})`);

  // Fetch all CustomerSubscriptions
  const customerSubs = await customerSubCol.find({}).toArray();
  console.log(`\nProcessing ${customerSubs.length} CustomerSubscriptions...`);

  let updatedUsersCount = 0;

  for (const sub of customerSubs) {
    if (!sub.user) continue;

    const startDate = sub.startDate ? new Date(sub.startDate) : (sub.createdAt ? new Date(sub.createdAt) : new Date());
    const price = sub.price || 0;

    let targetPlanId = monthlyPlan?._id;
    let daysToAdd = 30;

    if (price >= 500) {
      targetPlanId = yearlyPlan?._id;
      daysToAdd = 365;
    } else if (price >= 200) {
      targetPlanId = quarterlyPlan?._id;
      daysToAdd = 90;
    } else {
      targetPlanId = monthlyPlan?._id;
      daysToAdd = 30;
    }

    // Calculate exact calculated endDate from purchase date
    const calculatedEndDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // Update user record
    await usersCol.updateOne(
      { _id: typeof sub.user === 'string' ? new ObjectId(sub.user) : sub.user },
      {
        $set: {
          'subscription.isActive': true,
          'subscription.status': 'active',
          'subscription.plan': targetPlanId,
          'subscription.startDate': startDate,
          'subscription.endDate': calculatedEndDate
        }
      }
    );
    updatedUsersCount++;
  }

  console.log(`\n========================================`);
  console.log(`  SYNC COMPLETE!`);
  console.log(`  Updated Users: ${updatedUsersCount}`);
  console.log(`========================================\n`);

  await client.close();
}

main().catch(console.error);
