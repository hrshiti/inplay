import React, { useEffect, useRef } from 'react';

/**
 * AdPlaceholder
 * Creates an empty space in the React DOM and continuously syncs its Y-coordinate
 * to the Flutter layer so that a Native AdMob Banner can be overlaid exactly on top of it.
 */
const AdPlaceholder = ({ pageName, height = 60 }) => {
  const adPlaceholderRef = useRef(null);

  useEffect(() => {
    let animationFrameId;

    const sendPositionToFlutter = () => {
      if (adPlaceholderRef.current) {
        const rect = adPlaceholderRef.current.getBoundingClientRect();
        
        // Send Y position to Flutter via Javascript bridge
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
           window.flutter_inappwebview.callHandler('updateAdPosition', {
             page: pageName,
             y: rect.top,
             // Optional: send visible flag so flutter knows if it's currently on screen
             visible: rect.top < window.innerHeight && rect.bottom > 0
           });
        }
      }
    };

    // Use requestAnimationFrame for smoother scroll handling without blocking main thread
    const handleScroll = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(sendPositionToFlutter);
    };

    // Send initial position immediately
    sendPositionToFlutter();
    
    // Add event listeners. Passive: true improves scrolling performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      // When unmounting, tell flutter to hide the ad
      if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
         window.flutter_inappwebview.callHandler('updateAdPosition', {
           page: pageName,
           y: -1000,
           visible: false
         });
      }
    };
  }, [pageName]);

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
        justifyContent: 'center'
      }} 
    />
  );
};

export default AdPlaceholder;
