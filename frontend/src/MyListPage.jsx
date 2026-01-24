import { motion } from 'framer-motion';
import { ArrowLeft, Play, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from './utils/imageUtils';

export default function MyListPage({ myList, onMovieClick }) {
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>My List</h2>
                <div style={{ flex: 1 }} />
            </header>

            {/* Content Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '16px'
            }}>
                {myList.map((movie, index) => (
                    <motion.div
                        key={movie.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onMovieClick(movie)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div style={{
                            aspectRatio: '2/3',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: '#222',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            marginBottom: '8px'
                        }}>
                            <img
                                src={getImageUrl(movie.image || movie.poster?.url)}
                                alt={movie.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${movie.title}` }}
                            />
                        </div>
                        <h4 style={{
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            color: '#eee',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {movie.title}
                        </h4>
                    </motion.div>
                ))}
            </div>

            {myList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                    <Plus size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>Your list is empty.</p>
                </div>
            )}
        </div>
    );
}
