const canCallFlutter = () =>
  typeof window !== 'undefined' &&
  window.flutter_inappwebview &&
  typeof window.flutter_inappwebview.callHandler === 'function';

/**
 * Notifies the Flutter shell of a content boundary (video end, episode change,
 * playback tick, reel swipe) so its native AdMob interstitial frequency-cap
 * logic can decide whether to show an ad. Flutter listens on handler name
 * 'adTriggerEvent'.
 */
export const sendAdTriggerEvent = (surface, event, meta = {}) => {
  if (!canCallFlutter()) return;
  window.flutter_inappwebview.callHandler('adTriggerEvent', {
    surface,
    event,
    ...meta,
    timestamp: Date.now(),
  });
};

/**
 * Lets Flutter know whether the logged-in user has an active subscription,
 * so it can skip loading/showing interstitials entirely for premium users.
 */
export const sendUserPremiumStatus = (isPremium) => {
  if (!canCallFlutter()) return;
  window.flutter_inappwebview.callHandler('userPremiumStatus', {
    isPremium: !!isPremium,
    timestamp: Date.now(),
  });
};
