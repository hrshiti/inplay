import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

const HlsPlayer = forwardRef(({ src, hlsUrl, isMuted = true, isLoop = true, style = {}, onTimeUpdate, onPause, onEnded, startTime, ...props }, ref) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    // Forward the video element to the parent ref
    useImperativeHandle(ref, () => videoRef.current);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Clean up previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.detachMedia();
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const effectiveSrc = hlsUrl || src;
        console.log(`[HlsPlayer] Initializing with source: ${effectiveSrc}`);

        if (effectiveSrc && (effectiveSrc.includes('.m3u8') || hlsUrl)) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    startLevel: -1,
                    abrEwmaDefaultEstimate: 10000000, // Estimate 10Mbps to force HD quality immediately
                    // Allow CORS for production CloudFront
                    xhrSetup: (xhr) => {
                        xhr.withCredentials = false;
                    }
                });

                hlsRef.current = hls;
                hls.loadSource(effectiveSrc);
                hls.attachMedia(video);
                
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log(`[HlsPlayer] Manifest parsed successfully for ${effectiveSrc}`);
                    if (startTime) {
                        video.currentTime = startTime;
                    }
                    if (props.autoPlay !== false) {
                        video.play().catch(() => {});
                    }
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.details === 'manifestLoadError') {
                        console.error('[HlsPlayer] CORS or Network Error! If you see a CORS error in console, please whitelist your domain in S3/CloudFront.');
                    }

                    if (data.fatal) {
                        console.error(`[HlsPlayer] Fatal error: ${data.type} - ${data.details}`);
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                break;
                        }
                    }
                });

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = effectiveSrc;
                video.addEventListener('loadedmetadata', () => {
                    if (startTime) video.currentTime = startTime;
                    if (props.autoPlay !== false) video.play().catch(() => {});
                }, { once: true });
            }
        } else if (src) {
            video.src = src;
            video.addEventListener('loadedmetadata', () => {
                if (startTime) video.currentTime = startTime;
                if (props.autoPlay !== false) video.play().catch(() => {});
            }, { once: true });
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.detachMedia();
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src, hlsUrl, startTime]);

    return (
        <video
            ref={videoRef}
            muted={isMuted}
            loop={isLoop}
            playsInline
            onTimeUpdate={onTimeUpdate}
            onPause={onPause}
            onEnded={onEnded}
            style={{ 
                width: '100%', 
                height: '100%', 
                backgroundColor: 'black',
                display: 'block',
                ...style 
            }}
            {...props}
        />
    );
});

HlsPlayer.displayName = 'HlsPlayer';

export default HlsPlayer;
