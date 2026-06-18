import React, { useEffect, useRef } from 'react';

const canCallFlutter = () =>
  window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function';

const callUpdateAdPosition = (payload) => {
  if (canCallFlutter()) {
    window.flutter_inappwebview.callHandler('updateAdPosition', payload);
  }
};

/**
 * AdPlaceholder
 * Creates an empty space in the React DOM and continuously syncs its Y-coordinate
 * to the Flutter layer so that a Native AdMob Banner can be overlaid exactly on top of it.
 */
const AdPlaceholder = ({ pageName, height = 60, scrollContainerRef }) => {
  const adPlaceholderRef = useRef(null);
  const bridgeReadyRef = useRef(canCallFlutter());

  useEffect(() => {
    let animationFrameId;
    let resizeObserver;

    const sendPositionToFlutter = () => {
      if (!bridgeReadyRef.current || !adPlaceholderRef.current) return;

      const rect = adPlaceholderRef.current.getBoundingClientRect();

      callUpdateAdPosition({
        page: pageName,
        y: rect.top,
        visible: rect.top < window.innerHeight && rect.bottom > 0,
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
      resizeObserver?.disconnect();

      callUpdateAdPosition({ page: pageName, y: -1000, visible: false });
    };
  }, [pageName, scrollContainerRef]);

  return (
    <div
      ref={adPlaceholderRef}
      className="flutter-ad-placeholder"
      style={{
        width: '100%',
        height: `${height}px`,
        margin: '12px 0',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
};

export default AdPlaceholder;
