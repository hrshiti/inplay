import { useState, useRef, useEffect } from 'react';
import { X, SkipForward, SkipBack, Pause, Play, Maximize2, Heart, MessageCircle, MoreVertical, Share2, List, Volume2, VolumeX } from 'lucide-react';
import contentService from './services/api/contentService';

export default function VideoPlayer({ movie, episode, onClose }) {
    // User logic: Playing all content as movie content (Standard Landscape Player)
    // as per user request to play quick byte as movie content.
    const isVerticalMode = false; // Forced to false to use standard player

    // STANDARD LANDSCAPE PLAYER
    const videoRef = useRef(null);
    const lastSyncTime = useRef(0);
    // Unified logic to extract video source
    let videoObj = episode?.video || movie.video;

    // If it's a series and no direct video/episode, find the first available episode
    if (!videoObj) {
        if (movie.episodes && movie.episodes.length > 0) {
            videoObj = movie.episodes[0].video;
        } else if (movie.seasons && movie.seasons.length > 0 && movie.seasons[0].episodes && movie.seasons[0].episodes.length > 0) {
            videoObj = movie.seasons[0].episodes[0].video;
        }
    }

    const videoSrc = videoObj?.url || videoObj;

    if (!videoSrc) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: 'white' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Content Unavailable</h2>
                <p style={{ color: '#aaa' }}>Video source not found for: {movie.title}</p>
                <button
                    onClick={onClose}
                    style={{ marginTop: '20px', background: 'var(--accent)', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Go Back
                </button>
            </div>
        );
    }
    // Resume Logic
    useEffect(() => {
        if (videoRef.current && movie.watchedSeconds) {
            videoRef.current.currentTime = movie.watchedSeconds;
        }
    }, [movie.watchedSeconds]);

    // Progress Sync Logic
    const syncProgress = async (isClosing = false) => {
        if (!videoRef.current) return;

        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        if (!duration) return;

        const progress = (currentTime / duration) * 100;
        const contentId = movie._id || movie.id;

        try {
            await contentService.updateWatchHistory({
                contentId,
                progress,
                watchedSeconds: currentTime,
                totalDuration: duration,
                completed: progress > 95
            });
            lastSyncTime.current = currentTime;
        } catch (e) {
            console.error("Failed to sync progress", e);
        }
    };

    // Auto-sync every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                syncProgress();
            }
        }, 10000);

        return () => {
            clearInterval(interval);
            syncProgress(true); // Final sync on unmount
        };
    }, []);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
                onClick={async () => {
                    await syncProgress();
                    onClose();
                }}
                style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: 'white' }}
            >
                <X size={24} />
            </button>

            {videoSrc ? (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    controls
                    autoPlay
                    onPause={() => syncProgress()}
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
// VERTICAL PLAYER (Reel Style)
// Supports both Series (Episodes) and Movies (Single)
function VerticalPlayer({ movie, initialEpisode, onClose }) {
    // If series, use episodes. If movie, wrap it as a single "episode".
    const episodes = movie.episodes && movie.episodes.length > 0
        ? movie.episodes
        : [{ ...movie, title: movie.title, video: movie.video }];

    // Determine start index
    const startIndex = initialEpisode
        ? episodes.findIndex(e => (e._id || e.id) === (initialEpisode._id || initialEpisode.id))
        : 0;

    const [currentEpIndex, setCurrentEpIndex] = useState(startIndex !== -1 ? startIndex : 0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const lastSyncTime = useRef(0);

    const currentEp = episodes[currentEpIndex];
    // Extract URL safely
    const currentVideoUrl = currentEp.video?.url || currentEp.video;

    // Progress Sync Logic
    const syncProgress = async () => {
        if (!videoRef.current) return;

        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        if (!duration) return;

        const progress = (currentTime / duration) * 100;
        // For vertical/reels, they might not have separate contentId if part of series,
        // but here movie is the main container.
        const contentId = movie._id || movie.id;

        try {
            await contentService.updateWatchHistory({
                contentId,
                progress,
                watchedSeconds: currentTime,
                totalDuration: duration,
                completed: progress > 95
            });
            lastSyncTime.current = currentTime;
        } catch (e) {
            console.error("Failed to sync vertical progress", e);
        }
    };

    // Auto-sync every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                syncProgress();
            }
        }, 10000);

        return () => {
            clearInterval(interval);
            syncProgress(); // Final sync on unmount
        };
    }, [currentEpIndex]); // Reset interval if episode changes

    // Reset state on episode change
    useEffect(() => {
        setProgress(0);
        setIsPlaying(true);
        if (videoRef.current) {
            // Check if this specific movie was being watched
            if (currentEpIndex === 0 && movie.watchedSeconds) {
                videoRef.current.currentTime = movie.watchedSeconds;
            } else {
                videoRef.current.currentTime = 0;
            }
            videoRef.current.play().catch(() => { });
        }
    }, [currentEpIndex, movie.watchedSeconds]);

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
            if (isPlaying) {
                videoRef.current.pause();
                syncProgress();
            }
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
                    src={currentVideoUrl}
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
                <button
                    onClick={async () => {
                        await syncProgress();
                        onClose();
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'white' }}
                >
                    <X size={28} />
                </button>
                <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
                    {movie.title} {episodes.length > 1 && <span style={{ opacity: 0.7, fontSize: '12px' }}>• Ep {currentEpIndex + 1}</span>}
                </span>
                <div style={{ width: 28 }}></div> {/* Spacer */}
            </div>

            {/* Removed Right Side Actions (Reels Style) as per user request */}

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
