const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');

async function seedPlans() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to DB successfully');

  const plansToCreate = [
    {
      _id: new mongoose.Types.ObjectId('6a99a782d3ad3f100091a59f'),
      name: 'Monthly Plan',
      description: 'Full access for 1 Month',
      price: 99,
      duration: 'monthly',
      isActive: true,
      order: 1
    },
    {
      _id: new mongoose.Types.ObjectId('6a99a7aed3ad3f100091a77e'),
      name: 'Half Yearly Plan',
      description: 'Full access for 6 Months',
      price: 299,
      duration: 'half_yearly',
      isActive: true,
      order: 2
    },
    {
      _id: new mongoose.Types.ObjectId('6a99a7c7d3ad3f100091a7fd'),
      name: 'Yearly Plan',
      description: 'Full access for 1 Year',
      price: 599,
      duration: 'yearly',
      isActive: true,
      order: 3
    },
    {
      _id: new mongoose.Types.ObjectId('6a99aafd54a7ad7065bab2ea'),
      name: 'Lifetime Plan',
      description: 'Unlimited Lifetime Access',
      price: 999,
      duration: 'lifetime',
      isActive: true,
      order: 4
    }
  ];

  for (const p of plansToCreate) {
    await SubscriptionPlan.findByIdAndUpdate(p._id, p, { upsert: true, new: true });
    console.log('Restored plan:', p.name, p._id.toString());
  }

  // Update minor user plan IDs to main plan IDs
  const res1 = await User.updateMany(
    { 'subscription.plan': new mongoose.Types.ObjectId('6a9bf0e9deacf5b30690ce96') },
    { $set: { 'subscription.plan': new mongoose.Types.ObjectId('6a99a7aed3ad3f100091a77e') } }
  );
  console.log('Re-mapped minor plan 1 users:', res1.modifiedCount);

  const res2 = await User.updateMany(
    { 'subscription.plan': new mongoose.Types.ObjectId('6a9bf044deacf5b30690cb68') },
    { $set: { 'subscription.plan': new mongoose.Types.ObjectId('6a99a782d3ad3f100091a59f') } }
  );
  console.log('Re-mapped minor plan 2 users:', res2.modifiedCount);

  const totalPlans = await SubscriptionPlan.find({});
  console.log('Total Plans in DB after restore:', totalPlans.map(tp => ({ id: tp._id, name: tp.name })));

  await mongoose.disconnect();
  console.log('Done!');
}

seedPlans().catch(err => {
  console.error('Error seeding plans:', err);
  process.exit(1);
});
