/**
 * activate_lifetime_for_9702470288.js
 * 
 * Sets Lifetime Subscription (endDate: 2099-12-31) for user with phone 9702470288.
 * NO CODE CHANGES TO PROJECT.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB\n');

  const db = client.db('inplay');
  const users = db.collection('users');
  const custSubs = db.collection('customersubscriptions');

  const targetPhone = '9702470288';
  const user = await users.findOne({ phone: targetPhone });

  if (!user) {
    console.log(`❌ User with phone ${targetPhone} not found in users collection.`);
    await client.close();
    return;
  }

  const endDate = new Date('2099-12-31T23:59:59.000Z');
  const lifetimePlanId = new ObjectId('69f6cd50be7cc1749e22a09b');

  // 1. Update user document
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        'subscription.isActive': true,
        'subscription.status': 'active',
        'subscription.endDate': endDate,
        'subscription.startDate': new Date(),
        'subscription.plan': lifetimePlanId,
        'subscription.paymentMethod': 'razorpay'
      }
    }
  );
  console.log(`✅ Updated User profile (${user.phone}) -> Lifetime Plan Active (endDate: 2099)`);

  // 2. Insert or Update CustomerSubscription record
  const existingSub = await custSubs.findOne({ user: user._id });
  if (!existingSub) {
    await custSubs.insertOne({
      user: user._id,
      plan: lifetimePlanId,
      razorpaySubscriptionId: 'LIFETIME_PLAN',
      status: 'active',
      price: 999,
      startDate: new Date(),
      endDate: endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });
    console.log(`✅ Created CustomerSubscription record for ${user.phone}`);
  } else {
    await custSubs.updateOne(
      { _id: existingSub._id },
      {
        $set: {
          status: 'active',
          endDate: endDate,
          plan: lifetimePlanId
        }
      }
    );
    console.log(`✅ Updated CustomerSubscription record for ${user.phone}`);
  }

  await client.close();
  console.log('\n🔌 Done! User 9702470288 Lifetime Subscription is now 100% ACTIVE.');
}

main().catch(console.error);
