/**
 * Core Analytics Module.
 * Decouples the UI components from the Firebase Analytics implementation.
 * Provides a clean, reusable API for tracking events.
 */

import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase";
import { ANALYTICS_EVENTS } from "./analyticsConstants";
import { 
  buildLoginPayload, 
  buildVideoPayload, 
  buildWatchTimePayload, 
  buildSearchPayload, 
  buildSubscriptionPayload,
  buildStandardPurchasePayload
} from "./analyticsEvents";

const canCallFlutter = () =>
  typeof window !== 'undefined' &&
  window.flutter_inappwebview &&
  typeof window.flutter_inappwebview.callHandler === 'function';

/**
 * Helper to safely log events only if analytics is initialized
 */
const safeLogEvent = (eventName, params = {}) => {
  // Try forwarding to native Flutter app via InAppWebView bridge first
  if (canCallFlutter()) {
    try {
      window.flutter_inappwebview.callHandler('logAnalyticsEvent', {
        name: eventName,
        parameters: params
      });
    } catch (e) {
      console.warn("[Analytics] Failed to bridge event to Flutter", e);
    }
  }

  if (analytics) {
    try {
      // Enable DebugView in development by injecting debug_mode
      const eventParams = import.meta.env.DEV 
        ? { ...params, debug_mode: true } 
        : params;
        
      logEvent(analytics, eventName, eventParams);
      
      if (import.meta.env.DEV) {
        // console.log(`📊 [Analytics Debug] ${eventName}`, eventParams);
      }
    } catch (error) {
      console.warn(`[Analytics] Failed to log event: ${eventName}`, error);
    }
  } else {
    // For development / SSR where analytics might not be initialized
    if (import.meta.env.DEV) {
        console.warn(`📊 [Analytics Mock] Analytics not initialized. Event: ${eventName}`, params);
    }
  }
};

// --- Auth Tracking ---
export const trackLogin = (method = "phone") => {
  safeLogEvent(ANALYTICS_EVENTS.SIGN_IN, buildLoginPayload(method));
};

export const trackLogout = () => {
  safeLogEvent(ANALYTICS_EVENTS.LOGOUT);
};

export const trackProfileUpdated = () => {
  safeLogEvent(ANALYTICS_EVENTS.PROFILE_UPDATED);
};

// --- Video/Content Tracking ---
export const trackVideoView = ({ contentId, contentType, title }) => {
  safeLogEvent(ANALYTICS_EVENTS.VIDEO_VIEW, buildVideoPayload(contentId, contentType, title));
};

export const trackWatchTime = ({ contentId, durationWatched }) => {
  safeLogEvent(ANALYTICS_EVENTS.WATCH_TIME, buildWatchTimePayload(contentId, durationWatched));
};

export const trackVideoCompleted = ({ contentId, title }) => {
  safeLogEvent(ANALYTICS_EVENTS.VIDEO_COMPLETED, buildVideoPayload(contentId, null, title));
};

export const trackAddToWatchlist = ({ contentId, title }) => {
  safeLogEvent(ANALYTICS_EVENTS.ADD_TO_WATCHLIST, buildVideoPayload(contentId, null, title));
};

export const trackRemoveFromWatchlist = ({ contentId, title }) => {
  safeLogEvent(ANALYTICS_EVENTS.REMOVE_FROM_WATCHLIST, buildVideoPayload(contentId, null, title));
};

export const trackLikeVideo = ({ contentId, title }) => {
  safeLogEvent(ANALYTICS_EVENTS.LIKE_VIDEO, buildVideoPayload(contentId, null, title));
};

export const trackUnlikeVideo = ({ contentId, title }) => {
  safeLogEvent(ANALYTICS_EVENTS.UNLIKE_VIDEO, buildVideoPayload(contentId, null, title));
};

export const trackShareContent = ({ contentId, title }) => {
  safeLogEvent(ANALYTICS_EVENTS.SHARE_CONTENT, buildVideoPayload(contentId, null, title));
};

// --- Search Tracking ---
export const trackSearch = (searchTerm) => {
  if (!searchTerm) return;
  safeLogEvent(ANALYTICS_EVENTS.SEARCH, buildSearchPayload(searchTerm));
};

// --- Subscription Tracking ---
export const trackSubscriptionView = () => {
  safeLogEvent(ANALYTICS_EVENTS.SUBSCRIPTION_VIEW);
};

export const trackSubscriptionInitiated = ({ planId }) => {
  safeLogEvent(ANALYTICS_EVENTS.SUBSCRIPTION_INITIATED, buildSubscriptionPayload(planId));
};

export const trackSubscriptionPurchase = ({ planId, price, currency = 'INR' }) => {
  safeLogEvent(ANALYTICS_EVENTS.SUBSCRIPTION_PURCHASE, buildSubscriptionPayload(planId, price, currency));
  if (price) safeLogEvent('purchase', buildStandardPurchasePayload(planId, price, currency, false));
};

export const trackSubscriptionRenewed = ({ planId, price, currency = 'INR' }) => {
  safeLogEvent(ANALYTICS_EVENTS.SUBSCRIPTION_RENEWED, buildSubscriptionPayload(planId, price, currency));
  if (price) safeLogEvent('purchase', buildStandardPurchasePayload(planId, price, currency, false));
};

export const trackSubscriptionCancelled = () => {
  safeLogEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELLED);
};

// --- Trial Tracking ---
export const trackTrialInitiated = ({ planId }) => {
  safeLogEvent(ANALYTICS_EVENTS.TRIAL_INITIATED, buildSubscriptionPayload(planId));
};

export const trackTrialPurchase = ({ planId, price, currency = 'INR' }) => {
  safeLogEvent(ANALYTICS_EVENTS.TRIAL_PURCHASE, buildSubscriptionPayload(planId, price, currency));
  if (price) safeLogEvent('purchase', buildStandardPurchasePayload(planId, price, currency, true));
};

export const trackTrialRenewed = ({ planId, price, currency = 'INR' }) => {
  safeLogEvent(ANALYTICS_EVENTS.TRIAL_RENEWED, buildSubscriptionPayload(planId, price, currency));
  if (price) safeLogEvent('purchase', buildStandardPurchasePayload(planId, price, currency, true));
};
