import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX, Play, Pause, ArrowLeft, Send, X, Trash2 } from 'lucide-react';
import { getImageUrl } from './utils/imageUtils';
import { io } from 'socket.io-client';
import contentService from './services/api/contentService';
import authService from './services/api/authService';

// Initialize Socket outside component to prevent multiple connections
const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/';
const socket = io(API_URL.replace('/api', ''), {
    autoConnect: false
});

export default function ForYouPage({ onBack, likedVideos = [], onToggleLike }) {
    const [reels, setReels] = useState([]);
    const [muted, setMuted] = useState(true);
    const [activeReelId, setActiveReelId] = useState(null);

    useEffect(() => {
        const fetchReels = async () => {
            const data = await contentService.getForYouReels();
            console.log("ForYouPage Fetch Result:", data); // Debug Log
            setReels(data);
        };
        fetchReels();

        // Connect socket
        socket.connect();
        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className="reels-container" data-lenis-prevent style={{ background: 'black', height: '100vh', width: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', zIndex: 20000, position: 'relative' }}>
            {/* Top Back Navigation Overlay */}
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', padding: '20px 16px',
                zIndex: 100, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                display: 'flex', alignItems: 'center'
            }}>
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}>
                    <ArrowLeft size={28} strokeWidth={2.5} />
                </button>
                <span style={{ fontWeight: '700', fontSize: '1.2rem', marginLeft: '12px', textShadow: '0 1px 2px black', color: 'white' }}>For You</span>
            </div>

            {reels.length > 0 ? (
                reels.map((reel) => (
                    <ReelItem
                        key={reel._id}
                        reel={reel}
                        muted={muted}
                        toggleMute={() => setMuted(!muted)}
                        setActiveReelId={setActiveReelId}
                        isAlreadyLiked={likedVideos.some(v => (v._id || v.id) === reel._id)}
                        onToggleLike={onToggleLike}
                    />
                ))
            ) : (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    Loading Reels...
                </div>
            )}
        </div>
    );
}

function ReelItem({ reel, muted, toggleMute, setActiveReelId, isAlreadyLiked, onToggleLike }) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [likes, setLikes] = useState(reel.likes || 0);
    const [isLiked, setIsLiked] = useState(isAlreadyLiked);
    const [showComments, setShowComments] = useState(false);

    // Sync isLiked with global state if it changes
    useEffect(() => {
        setIsLiked(isAlreadyLiked);
    }, [isAlreadyLiked]);

    // Watch History Tracking
    const syncProgress = async (completed = false) => {
        if (!videoRef.current) return;
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        if (!duration || duration < 1) return;

        const progress = (currentTime / duration) * 100;

        try {
            await contentService.updateWatchHistory({
                contentId: reel._id,
                progress: completed ? 100 : progress,
                watchedSeconds: currentTime,
                totalDuration: duration,
                completed: completed || progress > 90
            });
        } catch (e) {
            console.error("Failed to sync reel progress", e);
        }
    };

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.6
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsPlaying(true);
                    setActiveReelId(reel._id);
                    // Join Reel Room for Socket events
                    socket.emit('join_reel', reel._id);
                    if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
                    }
                } else {
                    if (isPlaying) {
                        syncProgress(false);
                    }
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
            if (videoRef.current) {
                observer.unobserve(videoRef.current);
                // Last sync on unmount/scroll
                if (isPlaying) syncProgress(false);
            }
        };
    }, [reel._id, setActiveReelId, isPlaying]);

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleLike = async () => {
        try {
            // Optimistic local UI update
            setLikes(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
            setIsLiked(!isLiked);

            // Trigger global like toggle (updates user profile and list)
            if (onToggleLike) {
                await onToggleLike(reel);
            } else {
                // Fallback for isolated use
                const token = localStorage.getItem('inplay_token');
                if (token) {
                    await fetch(`${import.meta.env.VITE_API_BASE_URL}/foryou/${reel._id}/like`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            }
        } catch (error) {
            console.error("Like failed", error);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: reel.title,
                    text: `Watch ${reel.title} on InPlay!`,
                    url: window.location.href
                });
            } catch (err) {
                console.log("Share skipped");
            }
        } else {
            alert('Link copied to clipboard!');
        }
    };

    const [currentEpIndex, setCurrentEpIndex] = useState(0);
    const episodes = reel.episodes && reel.episodes.length > 0 ? reel.episodes : (reel.video ? [reel.video] : []);
    const currentVideoSrc = getImageUrl(episodes[currentEpIndex]?.url) || '';

    // Reset episode index when reel changes or comes into view? 
    // Usually standard reels just play from start.
    // If we want to remember position, we need more complex state.
    // Let's stick to start from 0 for now.

    const handleVideoEnd = () => {
        syncProgress(true); // Mark current episode/part as done

        if (currentEpIndex < episodes.length - 1) {
            // Next episode
            setCurrentEpIndex(prev => prev + 1);
        } else {
            // Loop back to first episode
            setCurrentEpIndex(0);
        }
    };

    // Auto-play when episode changes if we are already playing
    useEffect(() => {
        if (isPlaying && videoRef.current) {
            // Small delay to ensure src is updated
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    // Auto-play was prevented
                    console.log("Auto-play prevented on episode change");
                });
            }
        }
    }, [currentEpIndex]);

    // ... existing hooks ...
    // Note: I will keep existing hooks but ensure they work with dynamic src.

    return (
        <div className="reel-item" style={{ height: '100vh', scrollSnapAlign: 'start', position: 'relative', width: '100%', overflow: 'hidden' }}>
            <div className="reel-video-wrapper" onClick={handlePlayPause} style={{ width: '100%', height: '100%', position: 'relative' }}>
                <video
                    ref={videoRef}
                    src={currentVideoSrc}
                    className="reel-video"
                    loop={episodes.length === 1} // Only native loop if single video. Multi-video loops via state.
                    playsInline
                    muted={muted}
                    onEnded={handleVideoEnd}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {!isPlaying && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                        <Play size={48} fill="rgba(255,255,255,0.8)" stroke="none" />
                    </div>
                )}
            </div>

            {/* Mute Toggle */}
            <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} style={{ position: 'absolute', top: '80px', right: '16px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '8px', border: 'none', color: 'white', zIndex: 20 }}>
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Right Sidebar Actions */}
            <div style={{ position: 'absolute', bottom: '100px', right: '10px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', zIndex: 20 }}>
                <div onClick={handleLike} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                    <Heart size={32} fill={isLiked ? "#ef4444" : "white"} color={isLiked ? "#ef4444" : "white"} strokeWidth={1.5} />
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{likes}</span>
                </div>
                <div onClick={() => setShowComments(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                    <MessageCircle size={32} fill="white" color="white" strokeWidth={1.5} />
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>Typing..</span>
                </div>
                <div onClick={handleShare} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                    <Share2 size={32} fill="white" color="white" strokeWidth={1.5} />
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>Share</span>
                </div>
            </div>

            {/* Bottom Info */}
            <div style={{ position: 'absolute', bottom: '20px', left: '16px', right: '80px', color: 'white', zIndex: 20, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    {/* Placeholder Avatar if none */}
                    <img src={getImageUrl(reel.thumbnail?.url) || 'https://via.placeholder.com/40'} alt="User" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px', border: '2px solid white' }} />
                    <h4 style={{ margin: 0 }}>InPlay Official <span style={{ fontWeight: 400, opacity: 0.8 }}>• Follow</span></h4>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', lineHeight: '1.4' }}>{reel.title} {reel.description}</p>
                {reel.audio && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <MusicIcon />
                        <div className="scrolling-text" style={{ width: '150px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            <span>{reel.audio.title || 'Original Audio'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Comments Sheet */}
            {showComments && (
                <CommentsSheet reelId={reel._id} onClose={() => setShowComments(false)} />
            )}
        </div>
    );
}

const MusicIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
    </svg>
);

const CommentsSheet = ({ reelId, onClose }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [replyTo, setReplyTo] = useState(null); // Track which comment is being replied to
    const commentsEndRef = useRef(null);

    useEffect(() => {
        // Get current user for deletion check
        const user = localStorage.getItem('inplay_current_user');
        if (user) setCurrentUser(JSON.parse(user));

        // Fetch existing comments
        const fetchComments = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/foryou/${reelId}/comments`);
                const data = await res.json();
                if (data.success) setComments(data.data);
            } catch (e) { console.error(e); }
        };
        fetchComments();

        // Listen for real-time comments
        socket.on('new_comment', (comment) => {
            if (comment.contentId === reelId) {
                setComments(prev => [comment, ...prev]);
            }
        });

        // Listen for deleted comments
        socket.on('comment_deleted', (commentId) => {
            setComments(prev => prev.filter(c => c._id !== commentId));
        });

        // Listen for comment like updates
        socket.on('comment_like_updated', ({ commentId, likes }) => {
            setComments(prev => prev.map(c =>
                c._id === commentId ? { ...c, likes } : c
            ));
        });

        return () => {
            socket.off('new_comment');
            socket.off('comment_deleted');
            socket.off('comment_like_updated');
        }
    }, [reelId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const token = localStorage.getItem('inplay_token');
        if (!token) return alert('Please login to comment');

        try {
            const body = { text: newComment };
            if (replyTo) {
                body.parentComment = replyTo._id;
            }

            await fetch(`${import.meta.env.VITE_API_BASE_URL}/foryou/${reelId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            setNewComment("");
            setReplyTo(null);
        } catch (err) {
            console.error("Comment failed", err);
        }
    };

    const handleDeleteComment = async (commentId) => {
        const token = localStorage.getItem('inplay_token');
        if (!token) return;

        if (confirm('Are you sure you want to delete this comment?')) {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/foryou/comments/${commentId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setComments(prev => prev.filter(c => c._id !== commentId));
                }
            } catch (err) {
                console.error("Delete failed", err);
            }
        }
    };

    const handleLikeComment = async (commentId) => {
        const token = localStorage.getItem('inplay_token');
        if (!token) return alert('Please login to like comments');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/foryou/comments/${commentId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setComments(prev => prev.map(c =>
                    c._id === commentId ? { ...c, likes: data.data } : c
                ));
            }
        } catch (err) {
            console.error("Like failed", err);
        }
    };

    // Helper to render a single comment (recursive for replies)
    const renderComment = (comment, isReply = false) => {
        const isOwner = currentUser && (currentUser._id === comment.user?._id || currentUser.id === comment.user?._id);
        const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
        const isLiked = currentUser && comment.likes?.includes(currentUser._id || currentUser.id);

        return (
            <div key={comment._id} style={{ display: 'flex', gap: '14px', marginBottom: isReply ? '16px' : '24px', marginLeft: isReply ? '44px' : '0', position: 'relative', animation: 'fadeIn 0.4s ease' }}>
                <img
                    src={getImageUrl(comment.user?.avatar) || `https://ui-avatars.com/api/?name=${comment.user?.name || 'User'}&background=random&color=fff`}
                    style={{ width: isReply ? '28px' : '40px', height: isReply ? '28px' : '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #f0f0f0' }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: isReply ? '0.8rem' : '0.9rem', color: '#1a1a1a' }}>
                            {comment.user?.name || 'InPlay User'}
                        </span>
                        <span style={{ color: '#aeaeae', fontWeight: '400', fontSize: '0.7rem' }}>
                            {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: isReply ? '0.85rem' : '0.92rem', color: '#333', lineHeight: '1.5', paddingRight: '20px' }}>
                        {comment.text}
                    </p>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                        {!isReply && (
                            <button
                                onClick={() => setReplyTo(comment)}
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.75rem', fontWeight: '600', color: '#888', cursor: 'pointer' }}
                            >
                                Reply
                            </button>
                        )}
                        {(isOwner || isAdmin) && (
                            <button
                                onClick={() => handleDeleteComment(comment._id)}
                                style={{
                                    background: 'none', border: 'none', padding: 0, fontSize: '0.75rem',
                                    fontWeight: '600', color: '#ff4d4f', cursor: 'pointer', opacity: 0.8
                                }}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
                <div
                    onClick={() => handleLikeComment(comment._id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '4px', cursor: 'pointer' }}
                >
                    <Heart
                        size={isReply ? 12 : 14}
                        fill={isLiked ? "#ef4444" : "none"}
                        color={isLiked ? "#ef4444" : "#ccc"}
                    />
                    <span style={{ fontSize: '0.7rem', color: isLiked ? '#ef4444' : '#ccc' }}>
                        {comment.likes?.length || 0}
                    </span>
                </div>
            </div>
        );
    };

    // Filter main comments and replies
    const mainComments = comments.filter(c => !c.parentComment);
    const replies = comments.filter(c => c.parentComment);

    return (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '75vh',
            background: '#ffffff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            zIndex: 100, display: 'flex', flexDirection: 'column', color: '#1a1a1a',
            animation: 'slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.3)'
        }}>
            {/* Grab Bar for visual feel */}
            <div style={{ width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '10px', margin: '12px auto 4px' }}></div>

            <div style={{ padding: '8px 20px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.3px' }}>{comments.length} Comments</span>
                <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                    <X size={18} color="#666" />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', scrollBehavior: 'smooth' }}>
                {mainComments.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                        <MessageCircle size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                        <p style={{ fontSize: '0.95rem' }}>Be the first to comment!</p>
                    </div>
                ) : (
                    mainComments.map(comment => (
                        <div key={comment._id}>
                            {renderComment(comment)}
                            {/* Render replies for this comment */}
                            <div style={{ marginTop: '-8px', marginBottom: '12px' }}>
                                {replies
                                    .filter(reply => reply.parentComment === comment._id)
                                    .map(reply => renderComment(reply, true))}
                            </div>
                        </div>
                    ))
                )}
                <div ref={commentsEndRef} />
            </div>

            {/* Reply Indicator */}
            {replyTo && (
                <div style={{ padding: '8px 20px', background: '#f9f9f9', borderTop: '1px solid #eee', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Replying to <span style={{ fontWeight: '700' }}>{replyTo.user?.name}</span></span>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Cancel</button>
                </div>
            )}

            {/* Input Section */}
            <div style={{ padding: '16px 20px 32px', borderTop: '1px solid #f5f5f5', background: '#fff' }}>
                <form onSubmit={handleSubmit} style={{
                    display: 'flex', gap: '12px', alignItems: 'center', background: '#f8f8f8',
                    padding: '8px 8px 8px 16px', borderRadius: '30px', border: '1px solid #eeeeee'
                }}>
                    <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={replyTo ? `Reply to ${replyTo.user?.name}...` : "Add a comment..."}
                        autoFocus={!!replyTo}
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            fontSize: '0.95rem', color: '#1a1a1a', height: '36px'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim()}
                        style={{
                            background: newComment.trim() ? '#46d369' : '#e0e0e0',
                            border: 'none', color: 'white', width: '36px', height: '36px',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .comment-input::placeholder {
                    color: #bbb;
                }
            `}</style>
        </div>
    );
};
