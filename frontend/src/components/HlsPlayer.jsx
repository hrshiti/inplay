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

        if (effectiveSrc && (effectiveSrc.includes('.m3u8') || hlsUrl)) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                });
                hlsRef.current = hls;
                hls.loadSource(effectiveSrc);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    // Only autoplay if needed, but usually parent handles play/pause
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = effectiveSrc;
            }
        } else if (src) {
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
