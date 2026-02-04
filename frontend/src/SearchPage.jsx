import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Clock, TrendingUp, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

import contentService from './services/api/contentService'; // Add import
import { getImageUrl } from './utils/imageUtils';

const SearchPage = ({ onMovieClick }) => { // Remove allContent prop as we fetch it
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [history, setHistory] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('inplay_search_history') || '[]');
        } catch {
            return [];
        }
    });
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const addToHistory = (term) => {
        if (!term) return;
        const newHistory = [term, ...history.filter(h => h !== term)].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('inplay_search_history', JSON.stringify(newHistory));
    };

    const removeFromHistory = (term, e) => {
        e?.stopPropagation();
        const newHistory = history.filter(h => h !== term);
        setHistory(newHistory);
        localStorage.setItem('inplay_search_history', JSON.stringify(newHistory));
    };

    const handleResultClick = (item) => {
        if (query.trim()) {
            addToHistory(query.trim());
        }
        onMovieClick(item);
    };

    const trendingTags = ["Action", "Romance", "Web Series", "Bhojpuri Hits", "New Movies", "Comedy"];

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
                                onClick={() => handleResultClick(item)}
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
                    <div style={{ marginTop: '20px' }}>
                        {!query && (
                            <>
                                {/* Search History */}
                                {history.length > 0 && (
                                    <div style={{ marginBottom: '32px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ color: '#eee', fontSize: '1rem', fontWeight: '600' }}>Recent Searches</h3>
                                            <button
                                                onClick={() => {
                                                    setHistory([]);
                                                    localStorage.removeItem('inplay_search_history');
                                                }}
                                                style={{ color: '#666', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {history.map((term, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => setQuery(term)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '12px 0',
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Clock size={16} color="#888" style={{ marginRight: '16px' }} />
                                                    <span style={{ color: '#ccc', flex: 1, fontSize: '0.95rem' }}>{term}</span>
                                                    <button
                                                        onClick={(e) => removeFromHistory(term, e)}
                                                        style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
                                                    >
                                                        <X size={16} color="#666" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Trending / Most Searched */}
                                <div>
                                    <h3 style={{ color: '#eee', fontSize: '1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={18} color="#ff4d4d" />
                                        Most Searched
                                    </h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                        {trendingTags.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => setQuery(tag)}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '20px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    color: '#e5e5e5',
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Empty State Text only if no history and query is present but no results (handled by logic above, 
                            but we need to show 'No results' if query is present) */}
                        {query && (
                            <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                                No results found for "{query}"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
