import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Plus, Download, Share2, ThumbsUp, ChevronDown, Check } from 'lucide-react';
import { MOVIES } from './data';
import { getImageUrl } from './utils/imageUtils';
import contentService from './services/api/contentService';

export default function MovieDetailsPage({
    movie,
    onClose,
    onPlay,
    myList,
    likedVideos,
    onToggleMyList,
    onToggleLike,
    isPurchased,
    onPurchase,
    recommendedContent = [],
    onSelectMovie,
    sourceTab // Receive the source tab context
}) {
    if (!movie) return null;

    const isSeries = movie.type === 'hindi_series'; // ONLY show episodes/seasons for Hindi Series
    const [activeTab, setActiveTab] = useState(isSeries ? 'Episodes' : 'More Like This');
    const [selectedSeason, setSelectedSeason] = useState(isSeries && movie.seasons && movie.seasons.length > 0 ? movie.seasons[0] : null);
    const [isSeasonOpen, setIsSeasonOpen] = useState(false);
    const [fullMovie, setFullMovie] = useState(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const [similarContent, setSimilarContent] = useState([]);

    // Fetch full details (Cast, Producer, etc might be missing in list view)
    useEffect(() => {
        if (movie && (movie._id || movie.id)) {
            // Only fetch full details if not already available
            if (!fullMovie) {
                contentService.getContentById(movie._id || movie.id)
                    .then(data => {
                        if (data) setFullMovie(data);
                    })
                    .catch(err => console.error("Failed to fetch full movie details", err));
            }

            // Fetch Similar Content
            const fetchSimilar = async () => {
                try {
                    const targetMovie = fullMovie || movie;
                    let filters = { limit: 12, status: 'published' };
                    let isDynamicContext = false;

                    // 1. Prioritize Contextual Source Tab (from Navigation)
                    if (sourceTab) {
                        isDynamicContext = true;
                        if (sourceTab._id) filters.dynamicTabId = sourceTab._id;
                        else if (sourceTab.name) filters.dynamicTabs = sourceTab.name;
                    }
                    // 2. Fallback to Content's own Dynamic Tab ID (Strong Link)
                    else if (targetMovie.dynamicTabId) {
                        isDynamicContext = true;
                        // Handle if it's an object (populated) or string
                        const tabId = typeof targetMovie.dynamicTabId === 'object' ? targetMovie.dynamicTabId._id : targetMovie.dynamicTabId;
                        filters.dynamicTabId = tabId;
                    }
                    // 3. Fallback to Dynamic Tabs Tags (Weak Link)
                    else if (targetMovie.dynamicTabs && targetMovie.dynamicTabs.length > 0) {
                        isDynamicContext = true;
                        filters.dynamicTabs = targetMovie.dynamicTabs[0];
                    }

                    // 4. Default to Type/Genre ONLY if NOT in a dynamic context
                    if (!isDynamicContext) {
                        filters.type = targetMovie.type;
                        if (targetMovie.genre && typeof targetMovie.genre === 'string') {
                            filters.genre = targetMovie.genre.split(',')[0];
                        } else if (Array.isArray(targetMovie.genre) && targetMovie.genre.length > 0) {
                            filters.genre = targetMovie.genre[0];
                        }
                    }

                    const results = await contentService.getAllContent(filters);
                    // Filter out current movie
                    const filtered = results.filter(m => (m._id || m.id) !== (movie._id || movie.id));
                    setSimilarContent(filtered);
                } catch (error) {
                    console.error("Failed to fetch similar content", error);
                }
            };
            fetchSimilar();
        }
    }, [movie, fullMovie, sourceTab]);

    const displayMovie = fullMovie || movie;
    const displayRecommendations = similarContent.length > 0 ? similarContent : recommendedContent;

    return (
        <motion.div
            className="movie-details-page"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100vh',
                background: '#000',
                zIndex: 2000,
                overflowY: 'auto',
                color: 'white'
            }}
        >
            {/* Transparent Header Bar */}
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100,
                display: 'flex', alignItems: 'center', padding: '16px 20px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                >
                    <ArrowLeft size={24} strokeWidth={2.5} />
                </button>
            </div>

            {/* Hero Backdrop */}
            <div style={{ position: 'relative', height: '35vh', width: '100%' }}>
                <img
                    src={getImageUrl(displayMovie.backdrop?.url || displayMovie.backdrop || displayMovie.poster?.url || displayMovie.image)}
                    alt={displayMovie.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.src = `https://placehold.co/1200x675/111/FFF?text=${displayMovie.title}` }}
                />
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(to bottom, transparent 0%, #000 100%)'
                }} />
            </div>

            {/* Content */}
            <div style={{ padding: '0 20px 20px', position: 'relative', top: '-20px' }}>
                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: '800',
                    lineHeight: '1.1',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-display)'
                }}>
                    {displayMovie.title}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#aaa', fontSize: '0.85rem', marginBottom: '16px' }}>
                    <span style={{ color: '#46d369', fontWeight: 'bold' }}>{displayMovie.rating ? Math.round(displayMovie.rating * 10) : 95}% Match</span>
                    <span>{displayMovie.year || '2022'}</span>
                    <span>{displayMovie.genre}</span>
                    <span style={{ border: '1px solid #666', padding: '0 4px', fontSize: '0.7rem' }}>HD</span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            if (displayMovie.isPaid && !isPurchased) {
                                // Trigger purchase flow
                                if (onPurchase) onPurchase(movie);
                            } else {
                                console.log("Play clicked for:", displayMovie.title);
                                if (onPlay) {
                                    // Special handling for Series (Hindi Series) which might not have a direct video URL
                                    // but have episodes/seasons.
                                    if ((displayMovie.type === 'hindi_series' || displayMovie.category === 'Hindi Series') && (!displayMovie.video || displayMovie.video === '')) {
                                        // Find first episode
                                        let firstEpisode = null;
                                        if (displayMovie.episodes && displayMovie.episodes.length > 0) {
                                            firstEpisode = displayMovie.episodes[0];
                                        } else if (displayMovie.seasons && displayMovie.seasons.length > 0 && displayMovie.seasons[0].episodes && displayMovie.seasons[0].episodes.length > 0) {
                                            firstEpisode = displayMovie.seasons[0].episodes[0];
                                        }

                                        if (firstEpisode) {
                                            onPlay(movie, firstEpisode);
                                        } else {
                                            // Fallback if no episodes found
                                            onPlay(movie);
                                        }
                                    } else {
                                        onPlay(movie);
                                    }
                                }
                            }
                        }}
                        style={{
                            flex: 1, // Keep flex 1 to fill the space, or set a specific width
                            maxWidth: '400px', // Add a max width for better centering on wide screens
                            background: displayMovie.isPaid && !isPurchased ? '#eab308' : 'white',
                            color: 'black',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {displayMovie.isPaid && !isPurchased ? (
                            <>
                                <span style={{ fontSize: '1.2em' }}>₹</span> Buy for ₹{displayMovie.price}
                            </>
                        ) : (
                            <>
                                <Play size={20} fill="black" /> Play
                            </>
                        )}
                    </motion.button>
                </div>

                <p style={{
                    fontSize: '0.82rem',
                    lineHeight: '1.5',
                    color: '#bbb',
                    marginBottom: '8px',
                    display: '-webkit-box',
                    WebkitLineClamp: isDescriptionExpanded ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {displayMovie.description || "Experience the thrill and excitement of this blockbuster hit. A story that will keep you on the edge of your seat from start to finish."}
                </p>
                <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        padding: '0',
                        cursor: 'pointer',
                        fontSize: '0.82rem'
                    }}
                >
                    {isDescriptionExpanded ? 'Read Less' : 'Read More'}
                </button>

                {/* Additional Movie Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '0.85rem' }}>
                    {displayMovie.cast && (
                        <div>
                            <span style={{ color: '#888', display: 'block', marginBottom: '2px' }}>Cast</span>
                            <span style={{ color: 'white' }}>{displayMovie.cast}</span>
                        </div>
                    )}
                    {displayMovie.producer && (
                        <div>
                            <span style={{ color: '#888', display: 'block', marginBottom: '2px' }}>Producer</span>
                            <span style={{ color: 'white' }}>{displayMovie.producer}</span>
                        </div>
                    )}
                    {displayMovie.production && (
                        <div>
                            <span style={{ color: '#888', display: 'block', marginBottom: '2px' }}>Production</span>
                            <span style={{ color: 'white' }}>{displayMovie.production}</span>
                        </div>
                    )}
                    {displayMovie.releaseDate && (
                        <div>
                            <span style={{ color: '#888', display: 'block', marginBottom: '2px' }}>Release Date</span>
                            <span style={{ color: 'white' }}>{new Date(displayMovie.releaseDate).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>

                {/* Menu Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '24px' }}>
                    <ActionButton
                        icon={myList && myList.find(m => (m._id || m.id) == (displayMovie._id || displayMovie.id)) ? <Check size={24} color="#46d369" /> : <Plus size={24} />}
                        label={myList && myList.find(m => (m._id || m.id) == (displayMovie._id || displayMovie.id)) ? "Saved" : "My List"}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleMyList) onToggleMyList(movie);
                        }}
                    />
                    <ActionButton
                        icon={<ThumbsUp size={24} fill={likedVideos && likedVideos.find(m => (m._id || m.id) == (displayMovie._id || displayMovie.id)) ? "white" : "none"} color={likedVideos && likedVideos.find(m => (m._id || m.id) == (displayMovie._id || displayMovie.id)) ? "#46d369" : "currentColor"} />}
                        label={likedVideos && likedVideos.find(m => (m._id || m.id) == (displayMovie._id || displayMovie.id)) ? "Liked" : "Like"}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleLike) onToggleLike(movie);
                        }}
                    />
                    <ActionButton icon={<Share2 size={24} />} label="Share" onClick={async (e) => {
                        e.stopPropagation();
                        if (navigator.share) {
                            try {
                                await navigator.share({
                                    title: displayMovie.title,
                                    text: `Check out ${displayMovie.title} on InPlay!`,
                                    url: window.location.href
                                });
                            } catch (error) {
                                console.log('Error sharing:', error);
                            }
                        } else {
                            // Fallback
                            navigator.clipboard.writeText(`Check out ${displayMovie.title}: ${window.location.href}`);
                            alert('Link copied to clipboard!');
                        }
                    }} />
                </div>

                {/* Tabs */}
                <div style={{ borderTop: '1px solid #333', paddingTop: '0px' }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #333' }}>
                        {isSeries && (
                            <TabButton
                                label="Episodes"
                                active={activeTab === 'Episodes'}
                                onClick={() => setActiveTab('Episodes')}
                            />
                        )}
                        <TabButton
                            label="More Like This"
                            active={activeTab === 'More Like This'}
                            onClick={() => setActiveTab('More Like This')}
                        />

                    </div>

                    <AnimatePresence mode='wait'>
                        {/* Episodes Tab Content */}
                        {activeTab === 'Episodes' && isSeries && (
                            <motion.div
                                key="episodes"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Season Dropdown */}
                                <div style={{ position: 'relative', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setIsSeasonOpen(!isSeasonOpen)}
                                        style={{ background: '#333', padding: '12px 16px', borderRadius: '4px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                                    >
                                        {selectedSeason ? selectedSeason.name : (displayMovie.seasons && displayMovie.seasons.length > 0 ? displayMovie.seasons[0].name : 'Season 1')} <ChevronDown size={16} />
                                    </button>

                                    {isSeasonOpen && displayMovie.seasons && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, width: '200px', background: '#222', borderRadius: '4px', zIndex: 10, marginTop: '8px', overflow: 'hidden' }}>
                                            {displayMovie.seasons.map(season => (
                                                <div
                                                    key={season.id || season.seasonNumber}
                                                    onClick={() => { setSelectedSeason(season); setIsSeasonOpen(false); }}
                                                    style={{ padding: '12px 16px', borderBottom: '1px solid #444', cursor: 'pointer', background: selectedSeason && selectedSeason.seasonNumber === season.seasonNumber ? '#444' : 'transparent', display: 'flex', justifyContent: 'space-between' }}
                                                >
                                                    {season.name || `Season ${season.seasonNumber}`}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Episodes List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {(selectedSeason ? selectedSeason.episodes : (displayMovie.episodes || [])).map((ep, index) => (
                                        <div
                                            key={ep.id || index}
                                            onClick={() => {
                                                if (onPlay) {
                                                    // Pass both movie and the specific episode
                                                    onPlay(movie, ep);
                                                }
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                                        >
                                            <div style={{ position: 'relative', width: '120px', height: '68px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                                <img
                                                    src={getImageUrl(ep.image || displayMovie.backdrop?.url || displayMovie.backdrop || displayMovie.poster?.url || displayMovie.image)}
                                                    alt={ep.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => { e.target.src = `https://placehold.co/300x170/333/FFF?text=Ep` }}
                                                />
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Play size={20} fill="white" style={{ opacity: 0.8 }} />
                                                </div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{ep.title}</h4>
                                                <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{ep.duration ? `${Math.floor(ep.duration / 60)}m` : '24m'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* More Like This Tab Content */}
                        {activeTab === 'More Like This' && (
                            <motion.div
                                key="more-like-this"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}
                            >
                                {displayRecommendations.length > 0 ? (
                                    displayRecommendations.slice(0, 9).map(item => (
                                        <motion.div
                                            key={item._id || item.id}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                if (onSelectMovie) {
                                                    onSelectMovie(item);
                                                }
                                            }}
                                            style={{ aspectRatio: '2/3', background: '#222', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}
                                        >
                                            <img
                                                src={getImageUrl(item.poster?.url || item.image)}
                                                alt={item.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.src = `https://placehold.co/300x450/222/FFF?text=${item.title}` }}
                                            />
                                        </motion.div>
                                    ))
                                ) : (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#888' }}>
                                        No similar content found.
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Trailers Tab Content (Placeholder) */}

                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

function ActionButton({ icon, label, onClick }) {
    return (
        <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#ccc', cursor: 'pointer' }}
        >
            {icon}
            <span style={{ fontSize: '0.8rem' }}>{label}</span>
        </motion.div>
    );
}

function TabButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: 'transparent',
                border: 'none',
                padding: '16px 0',
                color: active ? 'white' : '#aaa',
                fontWeight: active ? 'bold' : 'normal',
                fontSize: '0.95rem',
                cursor: 'pointer',
                borderTop: active ? '4px solid var(--accent)' : '4px solid transparent',
                transition: 'all 0.3s ease'
            }}
        >
            {label}
        </button>
    );
}
