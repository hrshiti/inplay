import { useState, useRef, useEffect } from 'react';
import { X, SkipForward, SkipBack, Pause, Play, Maximize2, Heart, MessageCircle, MoreVertical, Share2, List, Volume2, VolumeX, ArrowLeft, ArrowRight, RotateCcw, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import contentService from './services/api/contentService';

export default function VideoPlayer({ movie, episode, onClose }) {
    // User logic: Playing all content as movie content (Standard Landscape Player)
    // as per user request to play quick byte as movie content.
    const isVerticalMode = false; // Forced to false to use standard player

    // PLAYLIST LOGIC
    // Determine the list of videos to play
    let playlist = [];
    if (movie.episodes && movie.episodes.length > 0) {
        playlist = movie.episodes; // Quick Byte episodes
    } else if (movie.seasons && movie.seasons.length > 0) {
        // Handle Series with Seasons - Flatten all episodes
        playlist = movie.seasons.flatMap(s => s.episodes || []);
    } else if (episode) {
        playlist = [episode]; // Single TV episode passed but no parent list found
    } else {
        playlist = [movie]; // Single Movie
    }

    // Correctly initialize currentIndex based on passed episode
    const [currentIndex, setCurrentIndex] = useState(() => {
        if (episode && playlist.length > 0) {
            const foundIndex = playlist.findIndex(p => (p._id || p.id) === (episode._id || episode.id));
            if (foundIndex !== -1) return foundIndex;
        }
        return 0;
    });

    const videoRef = useRef(null);
    const lastSyncTime = useRef(0);

    const currentItem = playlist[currentIndex];

    // Helper to get URL dynamically
    const getVideoUrl = (item) => {
        if (!item) return '';
        // QuickByte episode (direct url field)
        if (item.url && !item.video) return item.url;
        // Standard video object structure
        if (typeof item.video === 'string') return item.video;
        if (item.video?.url) return item.video.url;
        return '';
    };

    const videoSrc = getVideoUrl(currentItem);

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

    // Resume Logic (Only for first item/movie context)
    useEffect(() => {
        // Reset time if switching items
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { });
        }

        // If it's the main movie (index 0) and we have resume time
        if (currentIndex === 0 && movie.watchedSeconds && videoRef.current) {
            // Only resume if playlist is 1 item or it's checking strictly
            // Since we don't track episode index in resume yet, this is best effort
            videoRef.current.currentTime = movie.watchedSeconds;
        }
    }, [currentIndex, movie.watchedSeconds, videoSrc]);

    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    const togglePlay = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    const skipTime = (seconds) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    // Handle Video Progress
    const handleTimeUpdate = () => {
        if (videoRef.current && videoRef.current.duration) {
            const percentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(percentage);
        }
    };

    // Auto-update isPlaying state on external pause/play events
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, []);

    // Reset progress on item change
    useEffect(() => {
        setProgress(0);
    }, [currentIndex]);

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

    const handleVideoEnd = () => {
        syncProgress(true);
        if (currentIndex < playlist.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (currentIndex < playlist.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const [showControls, setShowControls] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [videoQuality, setVideoQuality] = useState('Auto');
    const controlsTimeoutRef = useRef(null);

    // Auto-hide controls
    useEffect(() => {
        if (isPlaying && showControls) {
            resetControlsTimeout();
        } else if (!isPlaying) {
            clearTimeout(controlsTimeoutRef.current);
            setShowControls(true);
        }
        return () => clearTimeout(controlsTimeoutRef.current);
    }, [isPlaying, showControls]);

    const resetControlsTimeout = () => {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    const handleScreenTap = () => {
        setShowControls(prev => !prev);
    };

    const changeSpeed = (e) => {
        e.stopPropagation();
        const speeds = [0.5, 1, 1.25, 1.5, 2];
        const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
        const newSpeed = speeds[nextIndex];
        setPlaybackSpeed(newSpeed);
        if (videoRef.current) {
            videoRef.current.playbackRate = newSpeed;
        }
    };

    const changeQuality = (e) => {
        e.stopPropagation();
        const qualities = ['Auto', '1080p', '720p', '480p'];
        const nextIndex = (qualities.indexOf(videoQuality) + 1) % qualities.length;
        setVideoQuality(qualities[nextIndex]);
    };

    // Helper check for series/episodic content
    const isEpisodic = movie.type === 'hindi_series' || movie.category === 'Hindi Series' ||
        movie.type === 'quick_byte' || movie.category === 'Quick Bites' ||
        playlist.length > 1;

    const mainContainerRef = useRef(null);
    const [showEpisodeList, setShowEpisodeList] = useState(false);

    const toggleFullScreen = (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            if (mainContainerRef.current) {
                mainContainerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            }
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div
            ref={mainContainerRef}
            onClick={handleScreenTap}
            style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            {/* Top Controls (Title, Speed, Quality, Close) */}
            {showControls && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, padding: '20px',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 100
                }}>
                    <div style={{ color: 'white' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', lineHeight: 1.2 }}>
                            {movie.title}
                        </h2>
                        {playlist.length > 1 && (
                            <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: '500' }}>
                                Episode {currentIndex + 1} / {playlist.length}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Speed Control */}
                        <button
                            onClick={changeSpeed}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                        >
                            {playbackSpeed}x
                        </button>

                        {/* Quality Control */}
                        <button
                            onClick={changeQuality}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                        >
                            {videoQuality}
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                await syncProgress();
                                onClose();
                            }}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Central Play/Pause, Skip, and Navigation Controls (Visible Only on Tap) */}
            {showControls && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px',
                    zIndex: 90, background: 'rgba(0,0,0,0.3)'
                }}>
                    {/* Previous Episode */}
                    {isEpisodic && (
                        <button
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            style={{
                                background: 'transparent', border: 'none', color: 'white', cursor: currentIndex === 0 ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: currentIndex === 0 ? 0.3 : 1,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            <ChevronLeft size={48} />
                        </button>
                    )}

                    {/* Skip Backward (All Content) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); skipTime(-5); resetControlsTimeout(); }}
                        style={{
                            background: 'transparent', border: 'none', color: 'white', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8
                        }}
                    >
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RotateCcw size={40} />
                            <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 'bold', paddingTop: '4px' }}>5</span>
                        </div>
                    </button>

                    {/* Play/Pause Button */}
                    <button
                        onClick={togglePlay}
                        style={{
                            background: 'transparent', border: 'none', color: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        {isPlaying ? (
                            <Pause size={64} fill="white" />
                        ) : (
                            <Play size={64} fill="white" />
                        )}
                    </button>

                    {/* Skip Forward (All Content) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); skipTime(5); resetControlsTimeout(); }}
                        style={{
                            background: 'transparent', border: 'none', color: 'white', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8
                        }}
                    >
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RotateCw size={40} />
                            <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 'bold', paddingTop: '4px' }}>5</span>
                        </div>
                    </button>

                    {/* Next Episode */}
                    {isEpisodic && (
                        <button
                            onClick={handleNext}
                            disabled={currentIndex >= playlist.length - 1}
                            style={{
                                background: 'transparent', border: 'none', color: 'white', cursor: currentIndex >= playlist.length - 1 ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: currentIndex >= playlist.length - 1 ? 0.3 : 1,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            <ChevronRight size={48} />
                        </button>
                    )}
                </div>
            )}

            {/* Bottom Controls Bar (Episodes & Fullscreen) */}
            {showControls && (
                <div style={{
                    position: 'absolute', bottom: '20px', left: 0, right: 0, padding: '0 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100
                }}>
                    {/* Left Side: Episode List Button (Only if Episodic) */}
                    {isEpisodic ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowEpisodeList(true); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px',
                                padding: '8px 12px', color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)'
                            }}
                        >
                            <List size={20} />
                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Episodes</span>
                        </button>
                    ) : <div></div>}

                    {/* Right Side: Full Screen Button */}
                    <button
                        onClick={toggleFullScreen}
                        style={{
                            background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px'
                        }}
                    >
                        <Maximize2 size={24} />
                    </button>
                </div>
            )}

            {/* Episode List Overlay */}
            {showEpisodeList && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000,
                        display: 'flex', flexDirection: 'column'
                    }}
                >
                    <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: 'white', margin: 0 }}>Episodes</h3>
                        <button onClick={() => setShowEpisodeList(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                        {playlist.map((ep, index) => (
                            <div
                                key={ep._id || index}
                                onClick={() => {
                                    setCurrentIndex(index);
                                    setShowEpisodeList(false);
                                }}
                                style={{
                                    display: 'flex', gap: '16px', padding: '12px', marginBottom: '8px', borderRadius: '8px',
                                    background: currentIndex === index ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    cursor: 'pointer', border: currentIndex === index ? '1px solid var(--accent)' : '1px solid transparent'
                                }}
                            >
                                <div style={{ width: '120px', height: '68px', background: '#333', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                    <img
                                        src={ep.image || ep.poster?.url || ep.poster || movie.poster?.url || movie.image}
                                        alt={ep.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                    {currentIndex === index && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent)' }}></div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>Episode {index + 1}</span>
                                    <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{ep.title}</span>
                                    {ep.duration && <span style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px' }}>{Math.floor(ep.duration / 60)}m</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {videoSrc ? (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    autoPlay
                    playsInline
                    onPause={() => syncProgress()}
                    onEnded={handleVideoEnd}
                    onTimeUpdate={handleTimeUpdate}
                    style={{ width: '100%', height: '100%', maxHeight: '100vh', objectFit: 'contain' }}
                />
            ) : (
                <div style={{ color: 'white', textAlign: 'center' }}>
                    <h2>Content Unavailable</h2>
                    <p>Video source not found.</p>
                </div>
            )}

            {/* Bottom Progress Bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.3)', zIndex: 101 }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#ff0000', transition: 'width 0.1s linear' }}></div>
            </div>

            <style>{`
                .nav-btn:hover { background: rgba(0,0,0,0.8) !important; transform: translateY(-50%) scale(1.1) !important; }
            `}</style>
        </div>
    );
}

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

            {/* Remove Right Side Actions */}

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
