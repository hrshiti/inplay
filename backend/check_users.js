require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const SubscriptionPlan = require('./models/SubscriptionPlan');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users with an active subscription
    const users = await User.find({ 'subscription.isActive': true }).populate('subscription.plan');
    console.log(`Total active users found: ${users.length}`);

    let incorrectCount = 0;
    const details = [];

    for (const user of users) {
      if (!user.subscription || !user.subscription.plan) continue;

      const plan = user.subscription.plan;
      const startDate = new Date(user.subscription.startDate);
      const endDate = new Date(user.subscription.endDate);
      
      // Calculate how many days difference
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If duration is NOT monthly, but days diff is around 30, it's incorrect.
      if (plan.duration && plan.duration !== 'monthly') {
        if (diffDays >= 29 && diffDays <= 31) {
          incorrectCount++;
          details.push({
            email: user.email,
            planName: plan.name,
            duration: plan.duration,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          });
        }
      }
    }

    console.log(`\nFound ${incorrectCount} users with an incorrect 30-day expiration for a non-monthly plan.\n`);
    
    if (incorrectCount > 0) {
      console.log('Sample details (up to 5):');
      console.log(details.slice(0, 5));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUsers();
