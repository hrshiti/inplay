import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from 'react';
import HlsPlayer from './HlsPlayer';
import { loadImaSdk, getVmapTagUrl } from '../utils/imaSdk';

/**
 * Wraps HlsPlayer with Google IMA SDK mid-roll/pre-roll/post-roll ad breaks,
 * driven by the backend's admin-configurable VMAP endpoint (GET /api/vmap).
 * Forwards the underlying <video> element via ref so existing play/pause/seek/
 * speed/quality controls in VideoPlayer.jsx keep working unchanged.
 */
const ImaAdsPlayer = forwardRef(({ src, hlsUrl, style = {}, onTimeUpdate, onPause, onEnded, startTime, midRollEnabled = true, ...props }, ref) => {
    const contentVideoRef = useRef(null);
    const adContainerRef = useRef(null);
    const adsManagerRef = useRef(null);
    const adsLoaderRef = useRef(null);
    const adDisplayContainerRef = useRef(null);
    const requestedRef = useRef(false);
    const [adActive, setAdActive] = useState(false);

    useImperativeHandle(ref, () => contentVideoRef.current);

    useEffect(() => {
        if (!midRollEnabled) return undefined;
        const video = contentVideoRef.current;
        if (!video) return undefined;

        requestedRef.current = false;

        const requestAdsIfReady = async () => {
            if (requestedRef.current || !video.duration || !isFinite(video.duration)) return;
            requestedRef.current = true;

            try {
                const ima = await loadImaSdk();

                adDisplayContainerRef.current = new ima.AdDisplayContainer(adContainerRef.current, video);
                adDisplayContainerRef.current.initialize();

                const adsLoader = new ima.AdsLoader(adDisplayContainerRef.current);
                adsLoaderRef.current = adsLoader;

                const resumeContent = () => {
                    setAdActive(false);
                    video.play().catch(() => {});
                };

                adsLoader.addEventListener(
                    ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
                    (event) => {
                        const adsManager = event.getAdsManager(video);
                        adsManagerRef.current = adsManager;

                        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
                            setAdActive(true);
                            video.pause();
                        });
                        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, resumeContent);
                        adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => {
                            adsManager.destroy();
                            resumeContent();
                        });

                        try {
                            adsManager.init(video.clientWidth, video.clientHeight, ima.ViewMode.NORMAL);
                            adsManager.start();
                        } catch {
                            resumeContent();
                        }
                    },
                    false
                );

                adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, resumeContent, false);

                const adsRequest = new ima.AdsRequest();
                adsRequest.adTagUrl = getVmapTagUrl(video.duration);
                adsRequest.linearAdSlotWidth = video.clientWidth || 640;
                adsRequest.linearAdSlotHeight = video.clientHeight || 360;
                adsRequest.nonLinearAdSlotWidth = video.clientWidth || 640;
                adsRequest.nonLinearAdSlotHeight = Math.floor((video.clientHeight || 360) / 3);

                adsLoader.requestAds(adsRequest);
            } catch {
                // IMA SDK failed to load (network/ad-blocker) — fail silently, content just plays normally.
            }
        };

        video.addEventListener('loadedmetadata', requestAdsIfReady);
        video.addEventListener('durationchange', requestAdsIfReady);
        return () => {
            video.removeEventListener('loadedmetadata', requestAdsIfReady);
            video.removeEventListener('durationchange', requestAdsIfReady);
        };
    }, [src, hlsUrl, midRollEnabled]);

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
        <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
            <HlsPlayer
                ref={contentVideoRef}
                src={src}
                hlsUrl={hlsUrl}
                startTime={startTime}
                onTimeUpdate={onTimeUpdate}
                onPause={onPause}
                onEnded={onEnded}
                style={{ width: '100%', height: '100%' }}
                {...props}
            />
            <div
                ref={adContainerRef}
                style={{
                    position: 'absolute',
                    inset: 0,
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
