/**
 * check_missing_subscribers.js
 * READ ONLY - Find the 605 paid subscribers whose user docs are missing
 * and see what info we can recover from other collections
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected\n');

  const db = client.db('inplay');
  const users = db.collection('users');
  const custSubs = db.collection('customersubscriptions');
  const custTrials = db.collection('customertrialdays');
  const now = new Date();

  // Get all active CustomerSubscription user IDs
  const activeSubs = await custSubs.find({
    status: 'active',
    endDate: { $gt: now }
  }).toArray();

  console.log(`Total active CustomerSubscriptions: ${activeSubs.length}`);

  // Find which user IDs don't exist in users collection
  const missingUserIds = [];
  const missingSubData = [];

  for (const sub of activeSubs) {
    const userId = String(sub.user);
    let userExists = false;
    try {
      const user = await users.findOne({ _id: new ObjectId(userId) });
      if (user) userExists = true;
    } catch(e) {}

    if (!userExists) {
      missingUserIds.push(userId);
      missingSubData.push(sub);
    }
  }

  console.log(`\nMissing user documents (paid subscribers): ${missingUserIds.length}`);

  // Check if any notifications have info about these users
  const notifs = db.collection('notifications');
  const adEvents = db.collection('adevents');

  // Sample of missing subscribers
  console.log('\n--- Sample of missing paid subscribers ---');
  for (let i = 0; i < Math.min(5, missingSubData.length); i++) {
    const sub = missingSubData[i];
    const userId = String(sub.user);
    
    // Check adEvents for this user
    const adEvent = await adEvents.findOne({ userId: sub.user });
    
    // Check customertrialdays
    const trial = await custTrials.findOne({ user: sub.user });
    
    console.log(`\n${i+1}. UserID: ${userId}`);
    console.log(`   Sub endDate: ${sub.endDate} | price: ₹${sub.price}`);
    console.log(`   AdEvent found: ${adEvent ? 'YES - ' + JSON.stringify(adEvent).substring(0,100) : 'No'}`);
    console.log(`   Trial found: ${trial ? 'YES - endDate: ' + trial.endDate : 'No'}`);
  }

  // Check if adevents has userId field that matches missing users
  const adEventSample = await adEvents.findOne({});
  console.log('\n\nAdEvent sample keys:', adEventSample ? Object.keys(adEventSample).join(', ') : 'none');

  // Summary
  console.log('\n\n=== RECOVERY OPTIONS FOR 605 MISSING USERS ===');
  console.log('1. Firebase Auth - if they logged in via phone OTP, Firebase has their phone numbers');
  console.log('2. Their subscription records exist - when they log in again, we can relink');
  console.log('3. Create stub user documents with old _id so subscription link is maintained');
  console.log('\nThese users CANNOT log in right now because their MongoDB user doc is gone.');
  console.log('When they try to login via OTP, the app will create a NEW user _id,');
  console.log('which won\'t match the old CustomerSubscription record.');

  await client.close();
}

main().catch(console.error);
