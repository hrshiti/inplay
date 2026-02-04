import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Crown } from 'lucide-react';
import contentService from '../services/api/contentService';
import { getImageUrl } from '../utils/imageUtils';

// Helper to format slug to title
const formatTitle = (slug) => {
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const slugToApiParams = (slug) => {
    switch (slug) {
        case 'hindi-series': return { type: 'hindi_series' };
        case 'bhojpuri-world': return { type: 'bhojpuri' };
        case 'trending-songs': return { type: 'trending_song' };
        case 'action-blockbusters': return { type: 'action' };
        case 'trending-now': return { type: 'trending_now' };
        // For originals and others, we might need to filter client side or use a generic fetch if backend supports.
        // Assuming backend maps these correctly or we use a fallback strategies.
        case 'originals': return { type: 'originals' };
        case 'broadcast': return { type: 'broadcast' };
        default: return { category: slug };
    }
};

export default function CategoryPage({ setSelectedMovie, purchasedContent, slug: propSlug }) {
    const params = useParams();
    const slug = propSlug || params.slug;
    const navigate = useNavigate();
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');

    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            const displayTitle = formatTitle(slug);
            setTitle(displayTitle);

            try {
                let data = [];
                // 1. Determine API params
                const apiParams = slugToApiParams(slug);

                // 2. Fetch from API
                // If it's a known type that might need special client-side filtering (like 'originals' if API doesn't support type=originals)
                // We could fetch all and filter. But first try direct type.
                const fetchedData = await contentService.getAllContent(apiParams);

                if (fetchedData && fetchedData.length > 0) {
                    data = fetchedData;
                } else if (slug === 'originals') {
                    // Fallback for Originals if type=originals returns empty (assuming it's a boolean flag isOriginal)
                    // Fetch all and filter
                    const all = await contentService.getAllContent();
                    data = all.filter(item => item.isOriginal);
                } else if (slug === 'trending-now') {
                    // Fallback for Trending Now if type=trending_now returns empty
                    const all = await contentService.getAllContent();
                    data = all.filter(item => item.type === 'trending_now' || item.isPopular || item.isNewAndHot || item.isRanking || item.isMovie || item.isTV);
                }

                setContent(data || []);
            } catch (error) {
                console.error("Failed to load category content:", error);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            loadContent();
        }
    }, [slug]);

    if (loading) {
        return (
            <div style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                background: '#0a0a0a'
            }}>
                Loading...
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                minHeight: '100vh',
                background: '#0a0a0a',
                color: 'white',
                padding: '20px',
                paddingBottom: '100px'
            }}
        >
            <div className="category-header" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
                paddingTop: '10px'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white'
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{title}</h1>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '16px'
            }}>
                {content.map((item) => (
                    <motion.div
                        key={item.id || item._id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedMovie(item)}
                        style={{
                            cursor: 'pointer',
                            position: 'relative'
                        }}
                    >
                        <div style={{
                            width: '100%',
                            aspectRatio: slug === 'trending-songs' ? '1/1' : '2/3',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative',
                            marginBottom: '8px',
                            backgroundColor: '#1a1a1a'
                        }}>
                            <img
                                src={getImageUrl(item.image || item.poster?.url)}
                                alt={item.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = `https://placehold.co/300x450/111/FFF?text=${item.title}` }}
                            />

                            {item.isPaid && (
                                <div style={{
                                    position: 'absolute', top: '8px', right: '8px',
                                    background: '#eab308', color: 'black', fontSize: '10px',
                                    padding: '2px 6px', fontWeight: 'bold', borderRadius: '4px'
                                }}>
                                    PAID
                                </div>
                            )}

                            {/* If it's a song, show play icon overlay */}
                            {slug === 'trending-songs' && (
                                <div style={{
                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '50%' }}>
                                        <Play fill="white" size={16} stroke="none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <h3 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            margin: '0 0 4px 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {item.title}
                        </h3>

                        {item.artist && (
                            <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>{item.artist}</p>
                        )}

                        {item.genre && !item.artist && (
                            <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>{item.genre}</p>
                        )}

                    </motion.div>
                ))}

                {content.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#666' }}>
                        No content found in {title}.
                    </div>
                )}
            </div>
        </motion.div>
    );
}
