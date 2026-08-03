require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const CustomerSubscription = require('./models/CustomerSubscription');

// Same helper as subscriptionController
const calculateEndDate = (startDate, duration) => {
  const date = new Date(startDate);
  switch (duration) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'half-yearly':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'lifetime':
      date.setFullYear(2099, 11, 31); // 2099-12-31
      break;
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date;
};

async function fixUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const users = await User.find({ 'subscription.isActive': true }).populate('subscription.plan');
    console.log(`Total active users found: ${users.length}`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        if (!user.subscription || !user.subscription.plan) {
          skipped++;
          continue;
        }

        const plan = user.subscription.plan;
        const startDate = new Date(user.subscription.startDate);
        const currentEndDate = new Date(user.subscription.endDate);

        // Skip monthly plans - they are correct
        if (plan.duration === 'monthly') {
          skipped++;
          continue;
        }

        // Calculate how many days the current expiry is set for
        const diffTime = currentEndDate - startDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Only fix if it looks like a wrong 30-day window (between 29 and 31 days)
        if (diffDays >= 29 && diffDays <= 31) {
          const correctEndDate = calculateEndDate(startDate, plan.duration);
          const oldEndDateStr = currentEndDate.toISOString().split('T')[0];
          const newEndDateStr = correctEndDate.toISOString().split('T')[0];

          // 1. Update User record
          await User.findByIdAndUpdate(user._id, {
            $set: { 'subscription.endDate': correctEndDate }
          });

          // 2. Update CustomerSubscription record (if any)
          await CustomerSubscription.findOneAndUpdate(
            { user: user._id, status: 'active' },
            { $set: { endDate: correctEndDate } }
          );

          console.log(`✅ Fixed: ${user.email} | Plan: ${plan.name} (${plan.duration}) | ${oldEndDateStr} → ${newEndDateStr}`);
          fixed++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`❌ Error fixing user ${user.email}:`, err.message);
        errors++;
      }
    }

    console.log('\n========= DONE =========');
    console.log(`✅ Fixed   : ${fixed} users`);
    console.log(`⏭️  Skipped : ${skipped} users (monthly plan or already correct)`);
    console.log(`❌ Errors  : ${errors} users`);

  } catch (error) {
    console.error('Fatal Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('\nDB Connection closed.');
  }
}

fixUsers();
