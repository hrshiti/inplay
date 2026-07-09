import React, { useEffect, useRef } from 'react';
import { NATIVE_BANNER_HEIGHT } from '../constants/adConfig';

const canCallFlutter = () =>
  window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function';

const callUpdateAdPosition = (payload) => {
  if (canCallFlutter()) {
    window.flutter_inappwebview.callHandler('updateAdPosition', payload);
  }
};
/**
 * AdPlaceholder — empty slot synced to Flutter native AdMob overlay.
 * Use NATIVE_BANNER_HEIGHT (50px) so the close/info button is not clipped.
 *
 * `pageName` selects which AdMob ad unit Flutter uses (a "group"). `slotId`
 * uniquely identifies this rendered instance's position/visibility — it
 * defaults to `pageName` so the original single-slot pages (inplay-cinema,
 * inplay-bhojpuri, content-details) need no changes. Multiple instances that
 * share one `pageName` (e.g. repeated in-grid ad slots) must pass distinct
 * `slotId`s or they'll clobber each other's position on the Flutter side.
 */
const AdPlaceholder = ({ pageName, slotId, height = NATIVE_BANNER_HEIGHT, scrollContainerRef }) => {
  const adPlaceholderRef = useRef(null);
  const bridgeReadyRef = useRef(canCallFlutter());
  const resolvedSlotId = slotId || pageName;

  useEffect(() => {
    let animationFrameId;
    let resizeObserver;

    const sendPositionToFlutter = () => {
      if (!bridgeReadyRef.current || !adPlaceholderRef.current) return;

      const rect = adPlaceholderRef.current.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

      callUpdateAdPosition({
        page: pageName,
        slotId: resolvedSlotId,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        visible: inViewport,
      });
    };

    const handleScroll = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(sendPositionToFlutter);
    };

    const onBridgeReady = () => {
      bridgeReadyRef.current = true;
      sendPositionToFlutter();
    };

    const scrollContainer = scrollContainerRef?.current;

    if (canCallFlutter()) {
      bridgeReadyRef.current = true;
    }

    window.addEventListener('flutterInAppWebViewPlatformReady', onBridgeReady);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    sendPositionToFlutter();

    // Heartbeat: Flutter hides the ad if it hears nothing for a few seconds
    // (protects against stale ads lingering after reload/route change). Without
    // this, a static ad the user isn't scrolling would get hidden by that same
    // watchdog since scroll/resize/ResizeObserver only fire on movement.
    const heartbeatId = setInterval(sendPositionToFlutter, 1500);

    if (adPlaceholderRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(adPlaceholderRef.current);
    }

    return () => {
      window.removeEventListener('flutterInAppWebViewPlatformReady', onBridgeReady);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      clearInterval(heartbeatId);
      resizeObserver?.disconnect();

      callUpdateAdPosition({ page: pageName, slotId: resolvedSlotId, x: 0, y: -1000, width: 0, height: 0, visible: false });
    };
  }, [pageName, resolvedSlotId, scrollContainerRef]);

  // No empty gap in regular browser — only reserve space inside the Flutter WebView app
  if (!canCallFlutter()) {
    return null;
  }

  return (
    <div
      ref={adPlaceholderRef}
      className="flutter-ad-placeholder"
      style={{
        width: '100%',
        maxWidth: '100%',
        height: `${height}px`,
        minHeight: `${height}px`,
        maxHeight: `${height}px`,
        margin: '8px 0',
        padding: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        flexShrink: 0,
        background: 'transparent',
      }}
      aria-hidden="true"
    />
  );
};

export default AdPlaceholder;
