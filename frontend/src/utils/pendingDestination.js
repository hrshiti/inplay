// Remembers where an anonymous/unsubscribed user was trying to go so that, after
// completing login and/or subscribing, they land back on their original destination
// instead of the home dashboard. sessionStorage (not React state) so it survives the
// full-page redirects Razorpay checkout can involve.
const STORAGE_KEY = 'inplay_pending_destination';

// Never store the auth/subscription flow's own pages as a destination — doing so
// would bounce the user right back into /login or /plan after they resolve the gate.
const EXCLUDED_PATHS = ['/login', '/signup', '/plan'];

export function setPendingDestination(path) {
  if (!path || EXCLUDED_PATHS.includes(path)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch (e) {
    // sessionStorage unavailable (private browsing, etc.) — non-fatal, user just
    // lands on home instead of their original destination.
  }
}

// Reads and clears the pending destination in one step, so a successful resume
// doesn't leave a stale destination around for a later, unrelated auth event.
export function consumePendingDestination() {
  try {
    const path = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return path || null;
  } catch (e) {
    return null;
  }
}
