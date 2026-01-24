import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

import contentService from './services/api/contentService'; // Add import
import { getImageUrl } from './utils/imageUtils';

const SearchPage = ({ onMovieClick }) => { // Remove allContent prop as we fetch it
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const navigate = useNavigate();
    const inputRef = useRef(null);

    useEffect(() => {
        // Auto-focus input on mount
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setSearching(true);
            try {
                const searchResults = await contentService.getAllContent({ search: query });
                setResults(searchResults);
            } catch (error) {
                console.error("Search failed", error);
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <div className="app-container" style={{ minHeight: '100vh', background: '#000', paddingBottom: '20px' }}>
            {/* Search Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: '#000',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottom: '1px solid #222'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'transparent', border: 'none', color: '#fff' }}
                >
                    <ArrowLeft size={24} />
                </button>

                <div style={{
                    flex: 1,
                    background: '#222',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    border: '1px solid #333'
                }}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search movies, shows..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            width: '100%',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            style={{ background: 'transparent', border: 'none', color: '#aaa', padding: 0, display: 'flex' }}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div style={{ width: '24px' }}>
                    {/* Placeholder for balance/layout if needed, currently empty like standard Youtube mobile header often ends with profile or search icon (which is here) */}
                    <Search size={24} color="#fff" />
                </div>
            </div>

            {/* Results */}
            <div style={{ padding: '16px' }}>
                {results.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {results.map(item => (
                            <motion.div
                                key={item._id || item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => onMovieClick(item)}
                                style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}
                            >
                                <div style={{
                                    width: '160px',
                                    height: '90px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    background: '#333'
                                }}>
                                    <img
                                        src={getImageUrl(item.backdrop?.url || item.backdrop || item.poster?.url || item.image) || 'https://placehold.co/160x90/222/FFF'}
                                        alt={item.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    {item.duration && (
                                        <div style={{
                                            position: 'absolute', bottom: '4px', right: '4px',
                                            background: 'rgba(0,0,0,0.8)', padding: '2px 4px',
                                            borderRadius: '4px', fontSize: '10px', color: 'white'
                                        }}>
                                            {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', lineHeight: '1.2' }}>
                                        {item.title}
                                    </h3>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>{item.type ? item.type.replace('_', ' ') : 'Video'}</span>
                                        <span>•</span>
                                        <span>{item.year || '2025'}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                        {item.description ? (item.description.length > 60 ? item.description.substring(0, 60) + '...' : item.description) : ''}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                        {query ? 'No results found' : 'Search for movies, shows, and more'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
