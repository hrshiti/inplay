// Dev testing numbers that always get treated as subscribed (mirrors backend/utils/subscriptionAccess.js)
const BYPASS_TEST_PHONES = ['6268204871', '6268455485', '6260491554'];

export function isUserSubscribed(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin') return true;
  if (user.phone && BYPASS_TEST_PHONES.includes(user.phone)) return true;

  const sub = user.subscription;
  if (!sub || !sub.isActive) return false;
  if (sub.endDate && new Date(sub.endDate) < new Date()) return false;
  return true;
}
