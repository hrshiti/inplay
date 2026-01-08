import { useState, useRef, useEffect } from 'react';
import { X, SkipForward, SkipBack, Pause, Play, Maximize2, Heart, MessageCircle, MoreVertical, Share2, List } from 'lucide-react';

export default function VideoPlayer({ movie, onClose }) {
    // User logic: Special "Vertical" section forces vertical player.
    // Otherwise, everything (Movies & Series) is Horizontal.
    const isVerticalMode = movie.isVertical;

    if (isVerticalMode) {
        return <VerticalPlayer movie={movie} onClose={onClose} />;
    }

    // STANDARD LANDSCAPE PLAYER
    // Handle Series in Landscape: Play first episode if main video is missing
    const videoSrc = movie.video || (movie.episodes && movie.episodes.length > 0 ? movie.episodes[0].video : null);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
                onClick={onClose}
                style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: 'white' }}
            >
                <X size={24} />
            </button>

            {videoSrc ? (
                <video
                    src={videoSrc}
                    controls
                    autoPlay
                    style={{ width: '100%', height: '100%', maxHeight: '100vh', objectFit: 'contain' }}
                />
            ) : (
                <div style={{ color: 'white', textAlign: 'center' }}>
                    <h2>Content Unavailable</h2>
                    <p>Video source not found.</p>
                </div>
            )}
        </div>
    );
}

// VERTICAL PLAYER (Reel Style)
// Supports both Series (Episodes) and Movies (Single)
function VerticalPlayer({ movie, onClose }) {
    // If series, use episodes. If movie, wrap it as a single "episode".
    const episodes = movie.episodes && movie.episodes.length > 0
        ? movie.episodes
        : [{ ...movie, title: movie.title, video: movie.video }];

    const [currentEpIndex, setCurrentEpIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    const currentEp = episodes[currentEpIndex];

    // Reset state on episode change
    useEffect(() => {
        setProgress(0);
        setIsPlaying(true);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { });
        }
    }, [currentEpIndex]);

    // Handle Video Progress
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const percentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(percentage);
        }
    };

    // Auto-Next on End
    const handleEnded = () => {
        if (currentEpIndex < episodes.length - 1) {
            setCurrentEpIndex(prev => prev + 1);
        }
    };

    // Play/Pause Toggle
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 9999, overflow: 'hidden' }}
            ref={containerRef}
        >
            {/* Video */}
            <div
                style={{ width: '100%', height: '100%', position: 'relative' }}
                onClick={togglePlay}
            >
                <video
                    ref={videoRef}
                    src={currentEp.video}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                />

                {/* Play/Pause Overlay Icon (if paused) */}
                {!isPlaying && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                        <Play size={64} fill="white" stroke="none" style={{ opacity: 0.8 }} />
                    </div>
                )}

            </div>

            {/* Top Controls */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '16px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white' }}>
                    <X size={28} />
                </button>
                <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
                    {movie.title} {episodes.length > 1 && <span style={{ opacity: 0.7, fontSize: '12px' }}>• Ep {currentEpIndex + 1}</span>}
                </span>
                <div style={{ width: 28 }}></div> {/* Spacer */}
            </div>

            {/* Right Side Actions (Reels Style) */}
            <div style={{ position: 'absolute', right: '12px', bottom: '100px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', zIndex: 10 }}>
                <ActionButton icon={<Heart size={24} />} label="1.2k" />
                <ActionButton icon={<MessageCircle size={24} />} label="234" />
                <ActionButton icon={<Share2 size={24} />} label="Share" />
                <ActionButton icon={<MoreVertical size={24} />} label="More" />
            </div>

            {/* Bottom Info Overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding: '20px 16px 30px' }}>
                <div style={{ marginBottom: '12px', paddingRight: '60px' }}>
                    <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{currentEp.title || movie.title}</h3>
                    {episodes.length > 1 && <p style={{ color: '#ccc', fontSize: '13px' }}>Episode {currentEpIndex + 1} of {episodes.length}</p>}
                </div>

                {/* Navigation Buttons (Only if multiple episodes) */}
                {episodes.length > 1 && (
                    <div style={{ display: 'flex', gap: 16, marginBottom: '16px', opacity: 0.8 }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); if (currentEpIndex > 0) setCurrentEpIndex(p => p - 1); }}
                            disabled={currentEpIndex === 0}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '10px', color: 'white', cursor: 'pointer', opacity: currentEpIndex === 0 ? 0.3 : 1 }}
                        >
                            <SkipBack size={20} fill="white" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); if (currentEpIndex < episodes.length - 1) setCurrentEpIndex(p => p + 1); }}
                            disabled={currentEpIndex === episodes.length - 1}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '10px', color: 'white', cursor: 'pointer', opacity: currentEpIndex === episodes.length - 1 ? 0.3 : 1 }}
                        >
                            <SkipForward size={20} fill="white" />
                        </button>
                    </div>
                )}

                {/* Bottom Progress Line */}
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#ff0000', transition: 'width 0.1s linear' }}></div>
                </div>
            </div>
        </div>
    );
}

function ActionButton({ icon, label }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', backdropFilter: 'blur(10px)', color: 'white' }}>
                {icon}
            </div>
            <span style={{ color: 'white', fontSize: '10px', fontWeight: '500', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{label}</span>
        </div>
    );
}
