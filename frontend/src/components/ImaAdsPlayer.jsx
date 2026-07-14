import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from 'react';
import HlsPlayer from './HlsPlayer';
import { loadImaSdk, getVmapTagUrl, getIsPremiumUser } from '../utils/imaSdk';
import { trackAdEvent } from '../utils/adAnalytics';

/**
 * Wraps HlsPlayer with Google IMA SDK mid-roll/pre-roll/post-roll ad breaks,
 * driven by the backend's admin-configurable VMAP endpoint (GET /api/vmap).
 * Forwards the underlying <video> element via ref so existing play/pause/seek/
 * speed/quality controls in VideoPlayer.jsx keep working unchanged.
 * Ads render inline, sized and positioned to the visible video frame (the
 * player box, minus any object-fit:contain letterboxing) — never full screen.
 * Every ad lifecycle event (request/impression/quartiles/errors) is reported
 * via trackAdEvent for fill-rate and error monitoring.
 */
const ImaAdsPlayer = forwardRef(({ src, hlsUrl, style = {}, onTimeUpdate, onPause, onEnded, startTime, midRollEnabled = true, contentId = '', ...props }, ref) => {
    const contentVideoRef = useRef(null);
    const adContainerRef = useRef(null);
    const adsManagerRef = useRef(null);
    const adsLoaderRef = useRef(null);
    const adDisplayContainerRef = useRef(null);
    const requestedRef = useRef(false);
    const [adActive, setAdActive] = useState(false);
    const [adRect, setAdRect] = useState(null);

    useImperativeHandle(ref, () => contentVideoRef.current);

    // object-fit belongs on the <video> element (it's meaningless on the
    // wrapper div); everything else in the incoming style stays on the wrapper.
    const { objectFit, ...wrapperStyle } = style;

    // The box the ad must occupy: the video's rendered frame inside the
    // wrapper. With object-fit contain/scale-down that is the letterboxed
    // content area; with cover/fill (or before metadata) it's the element box.
    const computeAdRect = () => {
        const video = contentVideoRef.current;
        if (!video) return null;
        const cw = video.clientWidth;
        const ch = video.clientHeight;
        if (!cw || !ch) return null;

        const base = { left: video.offsetLeft, top: video.offsetTop, width: cw, height: ch };
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const fit = (typeof getComputedStyle === 'function' && getComputedStyle(video).objectFit) || 'contain';
        if (!vw || !vh || fit === 'cover' || fit === 'fill' || fit === 'none') return base;

        const scale = Math.min(cw / vw, ch / vh);
        const width = Math.round(vw * scale);
        const height = Math.round(vh * scale);
        return {
            left: base.left + Math.round((cw - width) / 2),
            top: base.top + Math.round((ch - height) / 2),
            width,
            height
        };
    };

    const syncAdRect = () => {
        const rect = computeAdRect();
        if (!rect) return null;
        setAdRect((prev) => (
            prev && prev.left === rect.left && prev.top === rect.top &&
            prev.width === rect.width && prev.height === rect.height
        ) ? prev : rect);
        return rect;
    };

    useEffect(() => {
        if (!midRollEnabled) return undefined;
        const video = contentVideoRef.current;
        if (!video) return undefined;

        requestedRef.current = false;

        // Pod index -1 is IMA's convention for post-roll; 0 is the pre-roll.
        const breakIdFromEvent = (event) => {
            try {
                const podIndex = event.getAd()?.getAdPodInfo()?.getPodIndex();
                if (podIndex === 0) return 'preroll';
                if (podIndex === -1) return 'postroll';
                if (podIndex > 0) return `midroll-${podIndex}`;
            } catch { /* ad may be null for some events */ }
            return '';
        };

        const track = (eventType, event, extra = {}) => {
            trackAdEvent(eventType, {
                contentId,
                adBreakId: event ? breakIdFromEvent(event) : '',
                ...extra
            });
        };

        // Keep the ad canvas glued to the video frame across rotations,
        // fullscreen toggles and layout changes while an ad is on screen.
        const handleResize = () => {
            const rect = syncAdRect();
            if (rect && adsManagerRef.current && window.google?.ima) {
                try {
                    adsManagerRef.current.resize(rect.width, rect.height, window.google.ima.ViewMode.NORMAL);
                } catch { /* manager may already be destroyed */ }
            }
        };
        window.addEventListener('resize', handleResize);
        document.addEventListener('fullscreenchange', handleResize);
        let resizeObserver;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(video);
        }

        const requestAdsIfReady = async () => {
            if (requestedRef.current || !video.duration || !isFinite(video.duration)) return;
            requestedRef.current = true;

            try {
                const ima = await loadImaSdk();

                // Without this, on iOS (Safari and WebViews) IMA plays ads
                // through its "custom playback" path, which pops the native
                // FULLSCREEN player for the ad even though content plays
                // inline. Must be set before creating the AdDisplayContainer.
                try {
                    ima.settings.setDisableCustomPlaybackForIOS10Plus(true);
                } catch { /* older SDK builds may not expose this */ }

                adDisplayContainerRef.current = new ima.AdDisplayContainer(adContainerRef.current, video);
                adDisplayContainerRef.current.initialize();

                const adsLoader = new ima.AdsLoader(adDisplayContainerRef.current);
                adsLoaderRef.current = adsLoader;

                const resumeContent = () => {
                    setAdActive(false);
                    video.play().catch(() => {});
                };

                const trackAdError = (adErrorEvent) => {
                    try {
                        const error = adErrorEvent.getError();
                        const errorCode = error?.getErrorCode?.();
                        const errorMessage = error?.getMessage?.() || 'Unknown IMA error';
                        console.warn(`[IMA] Ad error ${errorCode}: ${errorMessage}`);
                        trackAdEvent('error', { contentId, errorCode, errorMessage });
                    } catch {
                        trackAdEvent('error', { contentId, errorMessage: 'Unparseable IMA error' });
                    }
                };

                adsLoader.addEventListener(
                    ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
                    (event) => {
                        const adsManager = event.getAdsManager(video);
                        adsManagerRef.current = adsManager;

                        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
                            handleResize(); // measure the frame right before covering it
                            setAdActive(true);
                            video.pause();
                        });
                        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, resumeContent);
                        adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (adErrorEvent) => {
                            trackAdError(adErrorEvent);
                            adsManager.destroy();
                            resumeContent();
                        });

                        // Lifecycle telemetry → /api/ad-events + GA4 (fill rate, quartiles)
                        adsManager.addEventListener(ima.AdEvent.Type.LOADED, (e) => track('loaded', e));
                        adsManager.addEventListener(ima.AdEvent.Type.IMPRESSION, (e) => track('impression', e));
                        adsManager.addEventListener(ima.AdEvent.Type.STARTED, (e) => { handleResize(); track('started', e); });
                        adsManager.addEventListener(ima.AdEvent.Type.FIRST_QUARTILE, (e) => track('first_quartile', e));
                        adsManager.addEventListener(ima.AdEvent.Type.MIDPOINT, (e) => track('midpoint', e));
                        adsManager.addEventListener(ima.AdEvent.Type.THIRD_QUARTILE, (e) => track('third_quartile', e));
                        adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, (e) => track('complete', e));
                        adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, (e) => track('skipped', e));
                        adsManager.addEventListener(ima.AdEvent.Type.CLICK, (e) => track('clicked', e));

                        try {
                            const rect = syncAdRect() || { width: video.clientWidth || 640, height: video.clientHeight || 360 };
                            adsManager.init(rect.width, rect.height, ima.ViewMode.NORMAL);
                            adsManager.start();
                        } catch {
                            resumeContent();
                        }
                    },
                    false
                );

                adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (adErrorEvent) => {
                    trackAdError(adErrorEvent);
                    resumeContent();
                }, false);

                const slot = computeAdRect() || { width: video.clientWidth || 640, height: video.clientHeight || 360 };
                const adsRequest = new ima.AdsRequest();
                adsRequest.adTagUrl = getVmapTagUrl(video.duration, getIsPremiumUser());
                adsRequest.linearAdSlotWidth = slot.width;
                adsRequest.linearAdSlotHeight = slot.height;
                adsRequest.nonLinearAdSlotWidth = slot.width;
                adsRequest.nonLinearAdSlotHeight = Math.floor(slot.height / 3);

                trackAdEvent('request', { contentId });
                adsLoader.requestAds(adsRequest);
            } catch {
                // IMA SDK failed to load (network/ad-blocker) — fail silently, content just plays normally.
                trackAdEvent('error', { contentId, errorCode: 'sdk_load_failed', errorMessage: 'IMA SDK script failed to load (network or ad blocker)' });
            }
        };

        video.addEventListener('loadedmetadata', requestAdsIfReady);
        video.addEventListener('durationchange', requestAdsIfReady);
        return () => {
            video.removeEventListener('loadedmetadata', requestAdsIfReady);
            video.removeEventListener('durationchange', requestAdsIfReady);
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('fullscreenchange', handleResize);
            resizeObserver?.disconnect();
        };
    }, [src, hlsUrl, midRollEnabled, contentId]);

    // Full cleanup whenever the source changes or the component unmounts
    useEffect(() => {
        return () => {
            adsManagerRef.current?.destroy();
            adsManagerRef.current = null;
            adsLoaderRef.current?.destroy();
            adsLoaderRef.current = null;
            adDisplayContainerRef.current = null;
        };
    }, [src, hlsUrl]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', ...wrapperStyle }}>
            <HlsPlayer
                ref={contentVideoRef}
                src={src}
                hlsUrl={hlsUrl}
                startTime={startTime}
                onTimeUpdate={onTimeUpdate}
                onPause={onPause}
                onEnded={onEnded}
                style={{ width: '100%', height: '100%', ...(objectFit ? { objectFit } : {}) }}
                {...props}
            />
            <div
                ref={adContainerRef}
                style={{
                    position: 'absolute',
                    ...(adRect
                        ? { left: adRect.left, top: adRect.top, width: adRect.width, height: adRect.height }
                        : { inset: 0 }),
                    overflow: 'hidden',
                    zIndex: adActive ? 50 : -1,
                    background: adActive ? 'black' : 'transparent',
                    pointerEvents: adActive ? 'auto' : 'none'
                }}
            />
        </div>
    );
});

ImaAdsPlayer.displayName = 'ImaAdsPlayer';

export default ImaAdsPlayer;
