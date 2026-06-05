/**
 * Centralized constant definitions for Firebase Analytics events.
 * Keeps event names consistent across the app.
 */

export const ANALYTICS_EVENTS = {
  // Auth Events
  SIGN_IN: 'sign_in',
  LOGOUT: 'logout',
  PROFILE_UPDATED: 'profile_updated',

  // Video Engagement Events
  VIDEO_VIEW: 'video_view',
  WATCH_TIME: 'watch_time',
  VIDEO_COMPLETED: 'video_completed',
  ADD_TO_WATCHLIST: 'add_to_watchlist',
  REMOVE_FROM_WATCHLIST: 'remove_from_watchlist',
  SHARE_CONTENT: 'share_content',
  LIKE_VIDEO: 'like_video',
  UNLIKE_VIDEO: 'unlike_video',

  // Search Events
  SEARCH: 'search',

  // Subscription Events
  SUBSCRIPTION_VIEW: 'subscription_view',
  SUBSCRIPTION_INITIATED: 'subscription_initiated',
  SUBSCRIPTION_PURCHASE: 'subscription_purchase',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Trial Events
  TRIAL_INITIATED: 'subscription_trial_initiated',
  TRIAL_PURCHASE: 'subscription_trial_purchase',
  TRIAL_RENEWED: 'subscription_trial_renewed',
};
