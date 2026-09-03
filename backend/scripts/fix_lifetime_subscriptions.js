/**
 * fix_lifetime_subscriptions.js
 * 
 * PURPOSE:
 *   Finds all lifetime subscribers (endDate >= 2090-01-01) who have been
 *   wrongly deactivated (isActive = false) and restores ONLY their
 *   subscription.isActive and subscription.status fields.
 * 
 * WHAT IT TOUCHES:
 *   - user.subscription.isActive  → set to true
 *   - user.subscription.status    → set to 'active'
 * 
 * WHAT IT DOES NOT TOUCH:
 *   - name, email, phone, password, role
 *   - subscription.endDate, startDate, plan, paymentMethod
 *   - watchHistory, myList, downloads, preferences
 *   - Any other user data whatsoever
 * 
 * USAGE:
 *   DRY RUN (no changes):  node scripts/fix_lifetime_subscriptions.js
 *   ACTUAL FIX:            node scripts/fix_lifetime_subscriptions.js --fix
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const LIFETIME_CUTOFF_DATE = new Date('2090-01-01T00:00:00.000Z');
const DRY_RUN = !process.argv.includes('--fix');

async function main() {
  console.log('\n========================================');
  console.log('  LIFETIME SUBSCRIPTION FIX SCRIPT');
  console.log('========================================');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '🔧 LIVE FIX (changes WILL be written)'}`);
  console.log(`Connecting to MongoDB...`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // -------------------------------------------------------------------
  // STEP 1: Find all lifetime users (endDate >= 2090)
  // -------------------------------------------------------------------
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const allLifetimeUsers = await User.find({
    'subscription.endDate': { $gte: LIFETIME_CUTOFF_DATE }
  }).select('name email phone subscription.isActive subscription.status subscription.endDate subscription.startDate subscription.plan createdAt');

  console.log(`📊 Total users with lifetime endDate (>= 2090): ${allLifetimeUsers.length}`);

  // -------------------------------------------------------------------
  // STEP 2: Split — who is active vs wrongly deactivated
  // -------------------------------------------------------------------
  const alreadyActive   = allLifetimeUsers.filter(u => u.subscription?.isActive === true);
  const needsActivation = allLifetimeUsers.filter(u => u.subscription?.isActive !== true);

  console.log(`✅ Already active (no change needed):   ${alreadyActive.length}`);
  console.log(`🚫 Wrongly deactivated (needs fix):     ${needsActivation.length}`);

  if (needsActivation.length === 0) {
    console.log('\n🎉 All lifetime subscribers are already active. Nothing to do!');
    await mongoose.disconnect();
    return;
  }

  // -------------------------------------------------------------------
  // STEP 3: Show details of affected users
  // -------------------------------------------------------------------
  console.log('\n--- Users that will be activated ---');
  needsActivation.forEach((u, idx) => {
    console.log(`  ${idx + 1}. ${u.name} | ${u.email} | phone: ${u.phone || 'N/A'}`);
    console.log(`     endDate: ${u.subscription?.endDate} | status: ${u.subscription?.status || 'N/A'} | isActive: ${u.subscription?.isActive}`);
  });
  console.log('------------------------------------\n');

  // -------------------------------------------------------------------
  // STEP 4: If dry run, stop here
  // -------------------------------------------------------------------
  if (DRY_RUN) {
    console.log('🔍 DRY RUN complete. No changes were made.');
    console.log('👉 To apply the fix, run: node scripts/fix_lifetime_subscriptions.js --fix');
    await mongoose.disconnect();
    return;
  }

  // -------------------------------------------------------------------
  // STEP 5: ACTUAL FIX — only update isActive + status, nothing else
  // -------------------------------------------------------------------
  console.log('🔧 Applying fix...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const user of needsActivation) {
    try {
      // Use updateOne with $set — ONLY touches these 2 fields, NOTHING ELSE
      const result = await User.updateOne(
        {
          _id: user._id,
          // Double-safety: re-confirm this is indeed a lifetime user
          'subscription.endDate': { $gte: LIFETIME_CUTOFF_DATE }
        },
        {
          $set: {
            'subscription.isActive': true,
            'subscription.status': 'active'
          }
        }
      );

      if (result.modifiedCount === 1) {
        console.log(`  ✅ Activated: ${user.email}`);
        successCount++;
      } else {
        console.log(`  ⚠️  No change for: ${user.email} (already updated or not matched)`);
      }
    } catch (err) {
      console.error(`  ❌ Error for ${user.email}: ${err.message}`);
      errorCount++;
    }
  }

  // -------------------------------------------------------------------
  // STEP 6: Summary
  // -------------------------------------------------------------------
  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(`  Total lifetime users found:  ${allLifetimeUsers.length}`);
  console.log(`  Were already active:         ${alreadyActive.length}`);
  console.log(`  Successfully activated:      ${successCount}`);
  console.log(`  Errors:                      ${errorCount}`);
  console.log('========================================\n');

  if (errorCount === 0) {
    console.log('🎉 All done! Lifetime subscribers have been restored.');
  } else {
    console.log('⚠️  Some users had errors. Please check logs above.');
  }

  await mongoose.disconnect();
  console.log('🔌 MongoDB disconnected. Script complete.');
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
