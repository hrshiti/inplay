import { motion } from 'framer-motion';
import { ArrowLeft, Download, Trash2, Play, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MY_SPACE_DATA } from './data';
import { getImageUrl } from './utils/imageUtils';

export default function DownloadsPage({ onMovieClick }) {
    const navigate = useNavigate();

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
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Downloads</h2>
                <div style={{ flex: 1 }} />
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => alert("Settings coming soon!")}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#aaa', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                >
                    <Download size={18} />
                </motion.button>
            </header>

            {/* Downloads List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {MY_SPACE_DATA.downloads.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => onMovieClick(item)}
                        style={{
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '12px',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        {/* Thumbnail */}
                        <div style={{ width: '100px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                            <img
                                src={getImageUrl(item.backdrop || item.image)}
                                alt={item.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '4px' }}>{item.title}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#888' }}>
                                <span>{item.size}</span>
                                <span style={{ opacity: 0.3 }}>|</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <Star size={10} fill="#FFD700" stroke="none" />
                                    <span>{item.rating}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action icon */}
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Play size={16} fill="white" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {MY_SPACE_DATA.downloads.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                    <Download size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>No downloads yet.</p>
                </div>
            )}
        </div>
    );
}
