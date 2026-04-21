import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

const HlsPlayer = forwardRef(({ src, hlsUrl, isMuted = true, isLoop = true, style = {}, onTimeUpdate, onPause, onEnded, ...props }, ref) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    // Forward the video element to the parent ref
    useImperativeHandle(ref, () => videoRef.current);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Clean up previous HLS instance
        if (hlsRef.current) {
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
                    startLevel: -1, // Auto quality start
                    abrEwmaDefaultEstimate: 5000000, // Estimate 5Mbps to start with higher quality
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
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        console.error(`[HlsPlayer] Fatal error: ${data.type} - ${data.details}`);
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log('[HlsPlayer] Network error, trying to recover...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('[HlsPlayer] Media error, trying to recover...');
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error('[HlsPlayer] Unrecoverable error, destroying instance');
                                hls.destroy();
                                break;
                        }
                    } else {
                        // Non-fatal errors like buffer stalls or segment load failures
                        console.warn(`[HlsPlayer] Non-fatal error: ${data.details}`);
                    }
                });

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                console.log('[HlsPlayer] Using native HLS support (Safari/iOS/Mac)');
                video.src = effectiveSrc;
            }
        } else if (src) {
            console.log(`[HlsPlayer] Using standard MP4 source: ${src}`);
            video.src = src;
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src, hlsUrl]);

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
                objectFit: 'contain', // Default to contain to avoid distortion
                backgroundColor: 'black',
                ...style 
            }}
            {...props}
        />
    );
});

HlsPlayer.displayName = 'HlsPlayer';

export default HlsPlayer;
