import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX, Play, Pause, ArrowLeft } from 'lucide-react';
import { MOVIES } from './data';

export default function ForYouPage({ onBack }) {
    const [muted, setMuted] = useState(true);

    // Duplicate movies to have more scrollable content
    const reels = [...MOVIES, ...MOVIES, ...MOVIES].map((movie, index) => ({
        ...movie,
        uniqueId: `${movie.id}-${index}`
    }));

    return (
        <div className="reels-container">
            {/* Top Back Navigation Overlay */}
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', padding: '20px 16px',
                zIndex: 100, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                display: 'flex', alignItems: 'center'
            }}>
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}>
                    <ArrowLeft size={28} strokeWidth={2.5} />
                </button>
                <span style={{ fontWeight: '700', fontSize: '1.2rem', marginLeft: '12px', textShadow: '0 1px 2px black' }}>For You</span>
            </div>

            {reels.map((reel, index) => (
                <ReelItem key={reel.uniqueId} reel={reel} isActive={true} muted={muted} toggleMute={() => setMuted(!muted)} />
            ))}
        </div>
    );
}

function ReelItem({ reel, isActive, muted, toggleMute }) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.6 // Trigger when 60% visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsPlaying(true);
                    if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
                    }
                } else {
                    setIsPlaying(false);
                    if (videoRef.current) {
                        videoRef.current.pause();
                    }
                }
            });
        }, options);

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => {
            if (videoRef.current) observer.unobserve(videoRef.current);
        };
    }, []);

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="reel-item">
            {/* Video Layer */}
            <div className="reel-video-wrapper" onClick={handlePlayPause}>
                <video
                    ref={videoRef}
                    src={reel.video}
                    className="reel-video"
                    loop
                    playsInline
                    muted={muted}
                    style={{ objectFit: 'cover' }} // 'cover' simulates full screen vertical video
                />

                {/* Play/Pause Overlay Icon */}
                {!isPlaying && (
                    <div className="play-pause-icon">
                        <Play size={48} fill="rgba(255,255,255,0.8)" stroke="none" />
                    </div>
                )}
            </div>

            {/* Mute Toggle */}
            <button className="reel-mute-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Right Sidebar Actions */}
            <div className="reel-actions">
                <div className="action-btn" onClick={() => setIsLiked(!isLiked)}>
                    <Heart size={28} fill={isLiked ? "red" : "rgba(0,0,0,0.3)"} color={isLiked ? "red" : "white"} strokeWidth={1.5} />
                    <span>{isLiked ? (reel.rating * 1000 + 1) : (reel.rating * 1000)}</span>
                </div>
                <div className="action-btn">
                    <MessageCircle size={28} fill="rgba(0,0,0,0.3)" color="white" strokeWidth={1.5} />
                    <span>{Math.floor(Math.random() * 500)}</span>
                </div>
                <div className="action-btn">
                    <Share2 size={28} fill="rgba(0,0,0,0.3)" color="white" strokeWidth={1.5} />
                    <span>Share</span>
                </div>
                <div className="action-btn" style={{ marginTop: '10px' }}>
                    <MoreVertical size={24} color="white" />
                </div>
            </div>

            {/* Bottom Info Gradient */}
            <div className="reel-info">
                <div className="reel-user">
                    <img src={reel.image} alt="User" />
                    <h4>InPlay Official <span style={{ color: '#aaa', fontWeight: 400 }}>• Follow</span></h4>
                </div>
                <p className="reel-description">{reel.description.substring(0, 100)}... <span style={{ fontWeight: '700' }}>more</span></p>
                <div className="reel-audio-tag">
                    <div className="scrolling-text">
                        <span>♫ Original Audio - {reel.title} Sound track • {reel.title} Theme</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
