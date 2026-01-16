import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Play, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HistoryPage({ onMovieClick, watchHistory = [] }) {
    const navigate = useNavigate();

    const getRelativeTime = (date) => {
        const now = new Date();
        const watched = new Date(date);
        const diffInMs = now - watched;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Watched Today';
        if (diffInDays === 1) return 'Watched Yesterday';
        if (diffInDays < 7) return `Watched ${diffInDays} days ago`;
        return `Watched on ${watched.toLocaleDateString()}`;
    }

    return (
        <div className="history-page" style={{
            minHeight: '100vh',
            background: '#000',
            color: 'white',
            padding: '20px',
            paddingBottom: '100px'
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
                position: 'sticky',
                top: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                padding: '10px 0',
                zIndex: 10
            }}>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} />
                </motion.button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Watch History</h2>
                <div style={{ flex: 1 }} />
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => alert("Clear history feature coming soon!")}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ff4d4d', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                >
                    <Trash2 size={18} />
                </motion.button>
            </header>

            {/* History List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {watchHistory.map((item, index) => (
                    <motion.div
                        key={item._id || item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onMovieClick(item)}
                        style={{
                            display: 'flex',
                            gap: '16px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        {/* Thumbnail */}
                        <div style={{ width: '140px', height: '80px', position: 'relative', flexShrink: 0 }}>
                            <img
                                src={item.poster?.url || item.thumbnail?.url || item.backdrop || item.image}
                                alt={item.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = "https://placehold.co/140x80/222/FFF?text=InPlay" }}
                            />
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.2)'
                            }}>
                                <Play size={20} fill="white" />
                            </div>
                            {item.progress && (
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.2)' }}>
                                    <div style={{ width: `${item.progress}%`, height: '100%', background: '#ff0000' }} />
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, padding: '12px 12px 12px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px', color: '#fff' }}>{item.title}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#aaa' }}>
                                <Clock size={12} />
                                <span>{getRelativeTime(item.watchedAt)}</span>
                                <span style={{ opacity: 0.3 }}>|</span>
                                <span>{item.type === 'reel' ? 'Quick Bite' : (item.episodes ? 'Series' : 'Movie')}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {watchHistory.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <Clock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>No watch history yet.</p>
                </div>
            )}
        </div>
    );
}
