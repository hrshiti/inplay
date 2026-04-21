import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { X, SkipForward, SkipBack, Pause, Play, Maximize2, Heart, MessageCircle, MoreVertical, Share2, List, Volume2, VolumeX, ArrowLeft, ArrowRight, RotateCcw, RotateCw, ChevronLeft, ChevronRight, Plus, Check, ThumbsUp, Download, Settings, Minus, Smartphone } from 'lucide-react';
import contentService from './services/api/contentService';
import { getImageUrl } from './utils/imageUtils';
import { SpeedSheet, QualitySheet } from './PlayerSheets';
import HlsPlayer from './components/HlsPlayer';

export default function VideoPlayer({ movie, episode, onClose, onToggleMyList, onToggleLike, myList = [], likedVideos = [] }) {
    // User logic: Playing all content as movie content (Standard Landscape Player)
    // as per user request to play quick byte as movie content.
    const [videoFit, setVideoFit] = useState('contain'); // Default to 'contain' to avoid cropping logos
    const isVertical = movie.isVertical || movie.type === 'quick_byte' || movie.type === 'reel' || movie.category === 'Quick Bites';
    const isQuickBite = isVertical; // Mapping for easier reference

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
    const hlsRef = useRef(null);
    const lastSyncTime = useRef(0);

    const currentItem = playlist[currentIndex];

    // Helper to get URL dynamically
    const getVideoUrl = (item) => {
        if (!item) return '';

        // Prioritize HLS Streaming URL if available
        if (item.hls_url) return item.hls_url;
        if (item.video?.hls_url) return item.video.hls_url;

        let url = '';
        // QuickByte episode (direct url field)
        if (item.url && !item.video) url = item.url;
        // Standard video object structure
        else if (typeof item.video === 'string') url = item.video;
        else if (item.video?.url) url = item.video.url;

        return getImageUrl(url);
    };

    const videoSrc = getVideoUrl(currentItem);
    useEffect(() => {
        if (videoSrc) {
            console.log("Playing video URL:", videoSrc);
        }
    }, [videoSrc]);

    const isInMyList = myList.some(m => (m._id || m.id) === (movie._id || movie.id));
    const isLiked = likedVideos.some(m => (m._id || m.id) === (movie._id || movie.id));

    // Track Fullscreen State
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    // Define Icon Sizes based on mode
    const playIconSize = isFullScreen ? 48 : 48; // Kept scaled down to prevent oversized icons on PC fullscreen
    const skipIconSize = isFullScreen ? 32 : 32;

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

    // Video Loading & Support for HLS
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoSrc) return;

        // Clean up previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const onVideoReady = () => {
            // Reset time if switching items
            video.currentTime = 0;

            // Resume Logic (Only for first item/movie context or if episode has saved progress)
            if (currentIndex === 0 && movie.watchedSeconds) {
                video.currentTime = movie.watchedSeconds;
            }

            if (isPlaying) {
                video.play().catch(() => { });
            }
        };

        if (videoSrc.includes('.m3u8')) {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                });
                hlsRef.current = hls;
                hls.loadSource(videoSrc);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, onVideoReady);
                
                // Error handling
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
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
                // Native HLS (Safari)
                video.src = videoSrc;
                video.addEventListener('loadedmetadata', onVideoReady, { once: true });
            }
        } else {
            // Standard MP4
            video.src = videoSrc;
            video.addEventListener('loadedmetadata', onVideoReady, { once: true });
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            video.removeEventListener('loadedmetadata', onVideoReady);
        };
    }, [videoSrc, currentIndex, movie.watchedSeconds]);

    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    const togglePlay = (e) => {
        if (e) e.stopPropagation();
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    const skipTime = (seconds) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    const formatTime = (timeInSeconds) => {
        if (!timeInSeconds || isNaN(timeInSeconds)) return "00:00";
        const h = Math.floor(timeInSeconds / 3600);
        const m = Math.floor((timeInSeconds % 3600) / 60);
        const s = Math.floor(timeInSeconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            // Immediate update for responsiveness
            const percentage = (time / videoRef.current.duration) * 100;
            setProgress(percentage);
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

    // Track view count when video loads and starts playing
    useEffect(() => {
        let viewCounted = false;
        const video = videoRef.current;
        if (!video) return;

        const trackView = async () => {
            if (viewCounted) return;
            viewCounted = true;

            const contentId = movie._id || movie.id;
            const contentType = isQuickBite ? 'quickbytes' : 'content';

            try {
                await contentService.incrementContentView(contentId, contentType);
                console.log('View count incremented for:', contentId);
            } catch (error) {
                console.error('Failed to track view:', error);
            }
        };

        // Track view after user watches for 3 seconds (to avoid accidental clicks)
        const onTimeUpdate = () => {
            if (video.currentTime >= 3 && !viewCounted) {
                trackView();
                video.removeEventListener('timeupdate', onTimeUpdate);
            }
        };

        video.addEventListener('timeupdate', onTimeUpdate);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
        };
    }, [currentIndex, movie]);

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

        // Persist to LocalStorage for Quick Bites (detailed episode tracking)
        if (isQuickBite || isEpisodic) {
            try {
                const savedProgress = JSON.parse(localStorage.getItem('inplay_quickbyte_progress') || '{}');
                savedProgress[contentId] = {
                    episodeIndex: currentIndex,
                    watchedSeconds: currentTime,
                    timestamp: Date.now(),
                    totalEpisodes: playlist.length,
                    duration: duration
                };
                localStorage.setItem('inplay_quickbyte_progress', JSON.stringify(savedProgress));
            } catch (e) {
                console.error("Failed to save local progress", e);
            }
        }

        try {
            await contentService.updateWatchHistory({
                contentId,
                progress,
                watchedSeconds: currentTime,
                totalDuration: duration,
                completed: progress > 95,
                episodeIndex: currentIndex // Adding this for backend if supported
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
    const [activeSheet, setActiveSheet] = useState(null); // 'speed' | 'quality' | null
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const controlsTimeoutRef = useRef(null);

    // Touch Handling for Swipe
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchEndX = useRef(0);
    const touchEndY = useRef(0);

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchEndX.current = e.touches[0].clientX;
        touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
        touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        const deltaX = touchStartX.current - touchEndX.current;
        const deltaY = touchStartY.current - touchEndY.current;
        const threshold = 70;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
            if (deltaX > threshold) {
                // Swipe Left -> Next
                if (currentIndex < playlist.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                }
            } else if (deltaX < -threshold) {
                // Swipe Right -> Prev
                if (currentIndex > 0) {
                    setCurrentIndex(prev => prev - 1);
                }
            }
        }
    };


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

    const changeSpeed = (e) => { // Kept for reference but unused in new UI
        e.stopPropagation();
        // Legacy toggle
    };

    const openSpeedSheet = (e) => {
        e.stopPropagation();
        setActiveSheet('speed');
        setShowControls(false); // Hide main controls when sheet is open
    };

    const openQualitySheet = (e) => {
        e.stopPropagation();
        setActiveSheet('quality');
        setShowControls(false);
    };

    const handleSheetClose = () => {
        setActiveSheet(null);
        setShowControls(true);
    };

    // Actual Handlers passed to sheets
    const applySpeed = (speed) => {
        setPlaybackSpeed(speed);
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    };

    const applyQuality = (quality) => {
        setVideoQuality(quality);
        if (hlsRef.current) {
            if (quality === 'Auto') {
                hlsRef.current.currentLevel = -1;
            } else {
                // Find matching level height
                const levelIndex = hlsRef.current.levels.findIndex(l => l.height === parseInt(quality));
                if (levelIndex !== -1) {
                    hlsRef.current.currentLevel = levelIndex;
                }
            }
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: movie.title,
                    text: `Watch ${movie.title} on InPlay!`,
                    url: window.location.href,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback or explicit instruction
            console.log("Share not supported");
        }
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

    const handleRotate = async (e) => {
        e.stopPropagation();
        try {
            if (!document.fullscreenElement && mainContainerRef.current) {
                await mainContainerRef.current.requestFullscreen();
            }
            if (screen.orientation && screen.orientation.lock) {
                const type = screen.orientation.type;
                if (type.startsWith('portrait')) {
                    await screen.orientation.lock('landscape');
                } else {
                    await screen.orientation.unlock();
                }
            }
        } catch (error) {
            console.log("Rotation failed:", error);
        }
    };

    if (isQuickBite) {
        return (
            <div
                ref={mainContainerRef}
                onClick={handleScreenTap}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    backgroundColor: '#000', 
                    zIndex: 9999, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '100%',
                    height: '100dvh',
                    overflow: 'hidden',
                    userSelect: 'none',
                    touchAction: 'none'
                }}
            >
                {/* Top Controls (Title, Speed, Quality, Close) */}
                {showControls && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, 
                        padding: 'calc(env(safe-area-inset-top, 20px) + 10px) 20px 40px 20px',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 40%, transparent 100%)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100
                    }}>
                        <div style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white' }}
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                    {movie.title}
                                </h2>
                                {playlist.length > 1 && (
                                    <span style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: '600', color: 'var(--accent)' }}>
                                        EP {currentIndex + 1} OF {playlist.length}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* Fit/Fill Toggle */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setVideoFit(prev => prev === 'contain' ? 'cover' : 'contain'); }}
                                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
                            >
                                {videoFit === 'contain' ? 'FIT' : 'FILL'}
                            </button>

                            {/* Speed Control */}
                            <button
                                onClick={openSpeedSheet}
                                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
                            >
                                {playbackSpeed}x
                            </button>

                            {/* Quality Control */}
                            <button
                                onClick={openQualitySheet}
                                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
                            >
                                {videoQuality === 'Auto' ? 'Auto' : videoQuality}
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
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px',
                        zIndex: 90, background: 'rgba(0,0,0,0.2)',
                        transition: 'background 0.3s'
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
                            onClick={(e) => { e.stopPropagation(); togglePlay(e); }}
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
                        position: 'absolute', bottom: 'env(safe-area-inset-bottom, 20px)', left: 0, right: 0, padding: '20px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                    }}>
                        {/* Left Side: Episode List Button (Only if Episodic) */}
                        {isEpisodic ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowEpisodeList(true); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '12px',
                                    padding: '10px 16px', color: 'white', cursor: 'pointer', backdropFilter: 'blur(10px)',
                                    fontWeight: '700', fontSize: '0.85rem'
                                }}
                            >
                                <List size={18} />
                                <span>ALL EPISODES</span>
                            </button>
                        ) : <div></div>}

                        {/* Right Side: Full Screen Button */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                             <button
                                onClick={handleRotate}
                                style={{
                                    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', padding: '10px', color: 'white', backdropFilter: 'blur(10px)'
                                }}
                            >
                                <Smartphone size={20} style={{ transform: 'rotate(90deg)' }} />
                            </button>
                            <button
                                onClick={toggleFullScreen}
                                style={{
                                    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', padding: '10px', color: 'white', backdropFilter: 'blur(10px)'
                                }}
                            >
                                <Maximize2 size={20} />
                            </button>
                        </div>
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
                                            src={getImageUrl(ep.image || ep.poster?.url || ep.poster || movie.thumbnail?.url || movie.thumbnail?.secure_url || movie.poster?.url || movie.image)}
                                            alt={ep.title || `Episode ${index + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.src = 'https://placehold.co/120x68/333/FFF?text=Ep+' + (index + 1); }}
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
                    <HlsPlayer
                        ref={videoRef}
                        src={videoSrc}
                        hlsUrl={currentItem.hls_url || currentItem.video?.hls_url}
                        isMuted={false}
                        isLoop={false}
                        onPause={() => syncProgress()}
                        onEnded={handleVideoEnd}
                        onTimeUpdate={handleTimeUpdate}
                        style={{ 
                            position: 'absolute',
                            width: '100%', 
                            height: '100%', 
                            objectFit: videoFit,
                            backgroundColor: 'black',
                            zIndex: 1
                        }}
                    />
                ) : (
                    <div style={{ color: 'white', textAlign: 'center' }}>
                        <h2>Content Unavailable</h2>
                        <p>Video source not found.</p>
                    </div>
                )}

                {/* Background Preloader for Next Episode */}
                {currentIndex < playlist.length - 1 && (() => {
                    const nextItem = playlist[currentIndex + 1];
                    const nextUrl = getVideoUrl(nextItem);
                    if (nextUrl && !nextUrl.includes('.m3u8')) {
                        return (
                            <video
                                key={`preload-${currentIndex + 1}`}
                                src={nextUrl}
                                preload="auto"
                                muted
                                style={{ display: 'none' }}
                            />
                        );
                    }
                    return null;
                })()}

                {/* Bottom Progress Bar */}
                <div style={{ 
                    position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', 
                    background: 'rgba(255,255,255,0.1)', zIndex: 101, overflow: 'hidden' 
                }}>
                    <div style={{ 
                        width: `${progress}%`, height: '100%', 
                        background: 'var(--accent)', 
                        transition: 'width 0.2s linear',
                        boxShadow: '0 0 10px var(--accent)'
                    }}></div>
                </div>

                <style>{`
                    .nav-btn:hover { background: rgba(0,0,0,0.8) !important; transform: translateY(-50%) scale(1.1) !important; }
                `}</style>

                {/* Render Sheets */}
                {activeSheet === 'speed' && (
                    <SpeedSheet
                        currentSpeed={playbackSpeed}
                        onClose={handleSheetClose}
                        onApply={applySpeed}
                    />
                )}
                {activeSheet === 'quality' && (
                    <QualitySheet
                        currentQuality={videoQuality}
                        onClose={handleSheetClose}
                        onApply={applyQuality}
                    />
                )}
            </div>
        );
    }

    // STANDARD PLAYER (MX Player Style for Movies/Series)
    // Layout: Video at Top/Inline (if not fullscreen), Details Below.
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: '#0f0f0f',
                zIndex: 9999,
                overflowY: 'auto', // Allow scrolling for details
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Render Sheets for Standard Player */}
            {activeSheet === 'speed' && (
                <SpeedSheet
                    currentSpeed={playbackSpeed}
                    onClose={handleSheetClose}
                    onApply={applySpeed}
                />
            )}
            {activeSheet === 'quality' && (
                <QualitySheet
                    currentQuality={videoQuality}
                    onClose={handleSheetClose}
                    onApply={applyQuality}
                />
            )}

            {/* Video Container */}
            {/* When fullscreen is requested on this div, it takes up the whole screen, hiding siblings (details) */}
            <div
                ref={mainContainerRef}
                onClick={handleScreenTap}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    width: '100%',
                    // Adjust aspect ratio based on content type and screen mode
                    aspectRatio: isFullScreen ? 'unset' : (isVertical ? '9/16' : '16/9'),
                    height: isFullScreen ? '100dvh' : 'auto',
                    maxHeight: isFullScreen ? '100dvh' : '70vh', // Limit height on portrait mobile for standard-view
                    background: 'black',
                    flexShrink: 0,
                    position: isFullScreen ? 'fixed' : 'sticky',
                    inset: isFullScreen ? 0 : 'auto',
                    top: 0,
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <HlsPlayer
                    ref={videoRef}
                    src={videoSrc}
                    hlsUrl={currentItem.hls_url || currentItem.video?.hls_url}
                    isMuted={false}
                    isLoop={false}
                    onPause={() => syncProgress()}
                    onEnded={handleVideoEnd}
                    onTimeUpdate={handleTimeUpdate}
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: isVertical ? videoFit : (isFullScreen ? 'contain' : 'cover'),
                        backgroundColor: 'black'
                    }}
                />

                {/* Background Preloader for Next Episode (Standard Player) */}
                {currentIndex < playlist.length - 1 && (() => {
                    const nextItem = playlist[currentIndex + 1];
                    const nextUrl = getVideoUrl(nextItem);
                    // Standard <video> tag preloader only works for MP4. 
                    // For HLS, loading manifest as video src causes browser warnings.
                    if (nextUrl && !nextUrl.includes('.m3u8')) {
                        return (
                            <video
                                key={`preload-std-${currentIndex + 1}`}
                                src={nextUrl}
                                preload="auto"
                                muted
                                style={{ display: 'none' }}
                            />
                        );
                    }
                    return null;
                })()}


                {/* Reuse Episode List Overlay (Scoped to Video Container for Fullscreen support) */}
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
                                            src={getImageUrl(ep.image || ep.poster?.url || ep.poster || movie.thumbnail?.url || movie.thumbnail?.secure_url || movie.poster?.url || movie.image)}
                                            alt={ep.title || `Episode ${index + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.src = 'https://placehold.co/120x68/333/FFF?text=Ep+' + (index + 1); }}
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

                {showControls && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(0,0,0,0.4)', padding: '20px' }}>

                        {/* Top Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white' }}>
                            <ArrowLeft size={28} onClick={async (e) => { e.stopPropagation(); await syncProgress(); onClose(); }} style={{ cursor: 'pointer' }} />
                            <h2 style={{ flex: 1, margin: 0, fontSize: '1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h2>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button onClick={openSpeedSheet} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', padding: '6px 12px', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>{playbackSpeed}x</button>
                                <button onClick={openQualitySheet} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', padding: '6px 12px', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>{videoQuality}</button>
                            </div>
                        </div>

                        {/* Center Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isFullScreen ? '60px' : '40px' }}>
                            <div onClick={(e) => { e.stopPropagation(); skipTime(-10); resetControlsTimeout(); }} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <RotateCcw size={skipIconSize} color="white" />
                                <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>10</span>
                            </div>

                            <div onClick={(e) => { e.stopPropagation(); togglePlay(e) }} style={{ cursor: 'pointer', transform: 'scale(1)' }}>
                                {isPlaying ? <Pause size={playIconSize} fill="white" /> : <Play size={playIconSize} fill="white" />}
                            </div>

                            <div onClick={(e) => { e.stopPropagation(); skipTime(10); resetControlsTimeout(); }} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <RotateCw size={skipIconSize} color="white" />
                                <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>10</span>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Time & Slider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '40px' }}>
                                    {formatTime(videoRef.current?.currentTime || 0)}
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max={videoRef.current?.duration || 0}
                                    value={videoRef.current?.currentTime || 0}
                                    onChange={handleSeek}
                                    style={{
                                        flex: 1,
                                        height: '4px',
                                        accentColor: '#46d369',
                                        cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.3)',
                                        borderRadius: '2px'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                                <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
                                    {formatTime(videoRef.current?.duration || 0)}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', paddingRight: '8px' }}>
                                {isEpisodic && (
                                    <div onClick={(e) => { e.stopPropagation(); setShowEpisodeList(true); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'white' }}>
                                        <List size={20} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Episodes</span>
                                    </div>
                                )}
                                <div onClick={handleRotate} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'white' }}>
                                    <Smartphone size={24} style={{ transform: 'rotate(90deg)' }} />
                                </div>
                                <Maximize2 size={24} color="white" onClick={toggleFullScreen} style={{ cursor: 'pointer' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Section (Below Video) */}
            <div style={{ padding: '20px', background: '#0f0f0f', borderTop: '1px solid #222' }}>

                {/* Header: Title & Meta */}
                <div style={{ marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white', marginBottom: '8px', lineHeight: '1.2' }}>{movie.title}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#888', fontWeight: '500' }}>
                        {movie.rating && <span style={{ color: '#46d369', fontWeight: 'bold' }}>{Math.round(movie.rating * 10)}% Match</span>}
                        <span>{movie.year || '2025'}</span>
                        <span>•</span>
                        <span>{movie.genre || 'Entertainment'}</span>
                        <span>•</span>
                        <span style={{ border: '1px solid #555', borderRadius: '4px', padding: '0 4px', fontSize: '0.7rem' }}>HD</span>
                    </div>
                </div>



                {/* Secondary Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '32px', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
                    <div
                        onClick={() => onToggleMyList && onToggleMyList(movie)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: isInMyList ? '#46d369' : '#ccc' }}
                    >
                        {isInMyList ? <Check size={24} /> : <Plus size={24} />}
                        <span style={{ fontSize: '0.75rem' }}>My List</span>
                    </div>
                    <div
                        onClick={() => onToggleLike && onToggleLike(movie)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: isLiked ? '#46d369' : '#ccc' }}
                    >
                        <ThumbsUp size={24} fill={isLiked ? "#46d369" : "none"} />
                        <span style={{ fontSize: '0.75rem' }}>Like</span>
                    </div>
                    <div
                        onClick={handleShare}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#ccc' }}
                    >
                        <Share2 size={24} />
                        <span style={{ fontSize: '0.75rem' }}>Share</span>
                    </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginBottom: '8px' }}>About this {movie.isMovie ? 'Movie' : 'Show'}</h3>
                    <p style={{
                        color: '#aaa',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: isDescriptionExpanded ? 'unset' : 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {movie.description || "An engaging story waiting to be discovered. Watch the full content to experience the thrill, drama, and excitement."}
                    </p>
                    <button
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontWeight: 'bold',
                            marginTop: '8px',
                            padding: '0',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        {isDescriptionExpanded ? 'Read Less' : 'Read More'}
                    </button>
                </div>

                {/* Episode List (Inline) if Episodic */}
                {isEpisodic && (
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'white', marginBottom: '16px' }}>Episodes ({playlist.length})</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {playlist.map((ep, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        setCurrentIndex(index);
                                        // Scroll to top to watch
                                        mainContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    style={{ display: 'flex', gap: '16px', cursor: 'pointer', opacity: currentIndex === index ? 1 : 0.7 }}
                                >
                                    <div style={{ width: '130px', height: '74px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                                        <img
                                            src={getImageUrl(ep.image || ep.poster?.url || ep.poster || movie.thumbnail?.url || movie.thumbnail?.secure_url || movie.poster?.url || movie.image)}
                                            alt={ep.title || `Episode ${index + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.src = 'https://placehold.co/130x74/333/FFF?text=Ep+' + (index + 1); }}
                                        />
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Play size={20} fill="white" stroke="none" />
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>{index + 1}. {ep.title}</span>
                                        <span style={{ color: '#888', fontSize: '0.8rem', marginTop: '4px' }}>{ep.duration ? `${Math.floor(ep.duration / 60)}m` : '0m'}</span>
                                        <p style={{ color: '#666', fontSize: '0.8rem', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {ep.description || movie.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
