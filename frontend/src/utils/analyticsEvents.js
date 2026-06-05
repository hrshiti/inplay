/**
 * Centralized payload structures for analytics events.
 * Provides helper functions to format data consistently before sending to Firebase.
 */
import { ANALYTICS_EVENTS } from './analyticsConstants';

export const buildLoginPayload = (method) => ({
  method,
});

export const buildVideoPayload = (contentId, contentType, title) => ({
  content_id: contentId,
  content_type: contentType || 'video',
  title: title || 'unknown',
});

export const buildWatchTimePayload = (contentId, durationWatched) => ({
  content_id: contentId,
  duration_watched: durationWatched,
});

export const buildSearchPayload = (searchTerm) => ({
  search_term: searchTerm,
});

export const buildSubscriptionPayload = (planId, price = null, currency = 'INR') => {
  const payload = { plan_id: planId };
  if (price !== null) {
    payload.value = price;
    payload.currency = currency;
  }
  return payload;
};
