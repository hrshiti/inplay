import { useState, useEffect, useRef } from 'react';
import { Plus, Heart, MessageCircle, Music, Trash2, X, Upload, Play, Pause } from 'lucide-react';
import adminForYouService from '../../services/api/adminForYouService';

const ForYouReels = () => {
    const [reels, setReels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch Reels
    const fetchReels = async () => {
        try {
            setIsLoading(true);
            const data = await adminForYouService.getAllReels();
            setReels(data || []);
        } catch (error) {
            console.error("Failed to fetch reels", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReels();
    }, []);

    const handleDelete = async (id) => {
        if (confirm('Delete this reel?')) {
            try {
                await adminForYouService.deleteReel(id);
                setReels(prev => prev.filter(r => r._id !== id));
            } catch (err) {
                alert('Failed to delete');
            }
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>For You - Real Content</h1>
                    <p style={{ color: '#6b7280' }}>Manage reels, sounds, and user interactions</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    style={{
                        background: '#46d369', color: 'white', border: 'none', padding: '10px 20px',
                        borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                    }}
                >
                    <Plus size={20} /> Add Real Reel
                </button>
            </div>

            {/* Grid of Reels */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
                overflowY: 'auto',
                paddingBottom: '20px'
            }}>
                {reels.map(reel => (
                    <AdminReelCard key={reel._id} reel={reel} onDelete={() => handleDelete(reel._id)} />
                ))}
            </div>

            {showAddModal && (
                <AddReelModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchReels(); }} />
            )}
        </div>
    );
};

const AdminReelCard = ({ reel, onDelete }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [comments, setComments] = useState([]);
    const [showComments, setShowComments] = useState(false);

    // Simple play on hover
    const handleMouseEnter = () => {
        videoRef.current?.play().catch(() => { });
        setIsPlaying(true);
    };
    const handleMouseLeave = () => {
        videoRef.current?.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
    };

    return (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative' }}>
            {/* Video Preview */}
            <div
                style={{ height: '500px', background: '#000', position: 'relative', cursor: 'pointer' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <video
                    ref={videoRef}
                    src={reel.video?.url}
                    muted
                    loop
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {!isPlaying && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <Play size={40} fill="white" color="white" />
                    </div>
                )}

                {/* Overlay Info */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '15px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                    <h3 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '1rem' }}>{reel.title}</h3>
                    {reel.audio?.title && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ddd', fontSize: '0.8rem' }}>
                            <Music size={14} /> {reel.audio.title}
                        </div>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,0,0,0.7)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}
                >
                    <Trash2 size={16} color="white" />
                </button>
            </div>

            {/* Stats Bar */}
            <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontWeight: '600' }}>
                    <Heart size={18} fill="#ef4444" /> {reel.likes || 0}
                </div>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#3b82f6', cursor: 'pointer' }}
                    onClick={() => setShowComments(!showComments)}
                >
                    <MessageCircle size={18} /> Comments
                </div>
            </div>

            {/* Comments Section (Mini) */}
            {showComments && (
                <div style={{ padding: '12px', background: '#f9fafb', maxHeight: '200px', overflowY: 'auto' }}>
                    <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
                        Real-time comments will appear here on the user side.
                        <br />(Socket.io integration enabled)
                    </p>
                </div>
            )}
        </div>
    );
};

const AddReelModal = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);

        // Ensure status is published
        formData.append('status', 'published');
        // Default audio title if not provided/removed from UI
        formData.append('audioTitle', 'Original Sound');

        try {
            await adminForYouService.createReel(formData);
            alert('Reel uploaded successfully!');
            onSuccess();
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '550px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>Create New Reel</h2>
                    <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '8px', display: 'flex' }}><X size={20} color="#374151" /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Field 1: Title */}
                    <div>
                        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', color: '#374151', fontSize: '0.9rem' }}>Reel Title</label>
                        <input
                            name="title"
                            required
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '1rem', outline: 'none' }}
                            placeholder="Give your reel a catchy title"
                        />
                    </div>

                    {/* Field 2 & 5: Video and Poster */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', color: '#374151', fontSize: '0.9rem' }}>Reel Video</label>
                            <label style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                border: '2px dashed #d1d5db', borderRadius: '12px', padding: '20px', cursor: 'pointer',
                                background: '#f9fafb', transition: 'border-color 0.2s'
                            }}>
                                <Upload size={24} color="#6b7280" style={{ marginBottom: '8px' }} />
                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Click to upload Video</span>
                                <input type="file" name="video" accept="video/*" required style={{ display: 'none' }} />
                            </label>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', color: '#374151', fontSize: '0.9rem' }}>Reel Poster (Avatar)</label>
                            <label style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                border: '2px dashed #d1d5db', borderRadius: '12px', padding: '20px', cursor: 'pointer',
                                background: '#f9fafb', transition: 'border-color 0.2s'
                            }}>
                                <Upload size={24} color="#6b7280" style={{ marginBottom: '8px' }} />
                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Click to upload Image</span>
                                <input type="file" name="poster" accept="image/*" required style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {/* Field 3: Background Sound */}
                    <div>
                        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', color: '#374151', fontSize: '0.9rem' }}>Background Sound</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="file"
                                name="audio"
                                accept="audio/*"
                                style={{
                                    width: '100%', padding: '10px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb',
                                    fontSize: '0.85rem', background: '#f9fafb'
                                }}
                            />
                        </div>
                        <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>Optional: Choose an audio file to play with the movie.</small>
                    </div>

                    {/* Field 4: Description */}
                    <div>
                        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', color: '#374151', fontSize: '0.9rem' }}>Reel Description</label>
                        <textarea
                            name="description"
                            rows="3"
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '0.9rem', outline: 'none', resize: 'none' }}
                            placeholder="Add tags, descriptions, or credits..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: '#46d369', color: 'white', border: 'none', padding: '16px',
                            borderRadius: '14px', fontSize: '1.1rem', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '10px', boxShadow: '0 4px 14px 0 rgba(70, 211, 105, 0.39)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-1px)')}
                        onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                    >
                        {loading ? 'Uploading Content...' : 'Publish Reel Now'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForYouReels;
