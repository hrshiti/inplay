import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import contentService from './services/api/contentService';
import { getImageUrl } from './utils/imageUtils';

export default function DynamicTabPage({ tab, onMovieClick }) {
    const [allContent, setAllContent] = useState([]);
    const [categoriesContent, setCategoriesContent] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                // 1. Fetch ALL content for this tab (for the "All" section)
                const all = await contentService.getDynamicContent(tab.slug);
                setAllContent(all || []);

                // 2. Fetch content for each specific category
                const contentPromises = tab.categories.map(async (cat) => {
                    const content = await contentService.getDynamicContent(tab.slug, cat.slug);
                    return {
                        ...cat,
                        content: content || []
                    };
                });

                const results = await Promise.all(contentPromises);
                setCategoriesContent(results);
            } catch (error) {
                console.error("Failed to fetch dynamic content:", error);
            } finally {
                setLoading(false);
            }
        };

        if (tab) {
            fetchContent();
        }
    }, [tab]);

    if (loading) {
        return (
            <div style={{ padding: '100px 20px', textAlign: 'center', color: '#888' }}>
                Loading {tab.name}...
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ paddingBottom: '100px' }}
        >
            {/* 1. Render Specific Categories Rows */}
            {categoriesContent.map((section) => (
                <section key={section._id} className="section" style={{ marginBottom: '40px' }}>
                    <div className="section-header" style={{ padding: '0 20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '24px', background: '#ff0a16', borderRadius: '2px' }}></div>
                            <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: '800' }}>{section.name}</h2>
                        </div>
                    </div>

                    {section.content.length === 0 ? (
                        <div style={{ padding: '0 20px', color: '#666', fontSize: '14px' }}>
                            No content available in this category yet.
                        </div>
                    ) : (
                        <div className="horizontal-list hide-scrollbar" style={{ gap: '16px', padding: '0 20px 20px' }}>
                            {section.content.map((movie) => (
                                <motion.div
                                    key={movie._id}
                                    className="movie-card"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onMovieClick(movie, tab)}
                                    style={{ flex: '0 0 160px', cursor: 'pointer' }}
                                >
                                    <div className="poster-container" style={{ width: '160px', height: '230px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                                        <img
                                            src={getImageUrl(movie.poster?.url || movie.image)}
                                            alt={movie.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.src = `https://placehold.co/160x230/333/FFF?text=${movie.title}` }}
                                        />
                                        {movie.isPaid && (
                                            <div style={{
                                                position: 'absolute', top: '8px', right: '8px',
                                                background: '#eab308', color: 'black', fontSize: '10px',
                                                padding: '2px 6px', fontWeight: 'bold', borderRadius: '4px'
                                            }}>
                                                PAID
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="movie-title" style={{ fontSize: '14px', marginTop: '8px', fontWeight: '600' }}>{movie.title}</h3>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            ))}

            {/* 2. Render 'All [Tab Name]' Content Grid (for content not in specific categories or general browsing) */}
            {allContent.length > 0 && (
                <section className="section" style={{ marginBottom: '40px' }}>
                    <div className="section-header" style={{ padding: '0 20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '24px', background: '#ff0a16', borderRadius: '2px' }}></div>
                            <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: '800' }}>More in {tab.name}</h2>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '16px',
                        padding: '0 20px'
                    }}>
                        {allContent.map((movie) => (
                            <motion.div
                                key={movie._id}
                                className="movie-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onMovieClick(movie, tab)}
                                style={{ flex: '0 0 160px', cursor: 'pointer' }}
                            >
                                <div className="poster-container" style={{ width: '100%', aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                                    <img
                                        src={getImageUrl(movie.poster?.url || movie.image)}
                                        alt={movie.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.src = `https://placehold.co/160x230/333/FFF?text=${movie.title}` }}
                                    />
                                    {movie.isPaid && (
                                        <div style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            background: '#eab308', color: 'black', fontSize: '10px',
                                            padding: '2px 6px', fontWeight: 'bold', borderRadius: '4px'
                                        }}>
                                            PAID
                                        </div>
                                    )}
                                </div>
                                <h3 className="movie-title" style={{ fileName: '14px', marginTop: '8px', fontWeight: '600' }}>{movie.title}</h3>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {categoriesContent.length === 0 && allContent.length === 0 && (
                <div style={{ padding: '100px 20px', textAlign: 'center', color: '#666' }}>
                    No content found for this tab.
                </div>
            )}
        </motion.div>
    );
}
