import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, SkipBack, SkipForward, X, Clock, ChevronLeft } from 'lucide-react';
import { getImageUrl } from '../utils/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/';
const API_Base = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;
const API_URL = API_Base + '/audio-series';

export default function AudioSeriesUserPage({ onBack }) {
    const [seriesList, setSeriesList] = useState([]);
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [loading, setLoading] = useState(true);

    // Use global audio player context
    const {
        currentEpisode,
        isPlaying,
        currentTime,
        duration,
        playEpisode: playEpisodeContext,
        togglePlay,
        seekTo,
        skipForward,
        skipBackward
    } = useAudioPlayer();

    useEffect(() => {
        fetchSeries();
    }, []);

    const fetchSeries = async () => {
        try {
            console.log("Fetching audio series from:", API_URL);
            const res = await axios.get(API_URL);
            console.log("Audio Series Data:", res.data);
            setSeriesList(res.data.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching audio series:", error);
            setLoading(false);
        }
    };

    const playEpisode = (episode, series) => {
        // Update local selected series for context
        setSelectedSeries(series);
        // Use context to play
        playEpisodeContext(episode, series);
    };

    if (loading) return <div style={{ color: 'white', padding: '20px' }}>Loading Audio Series...</div>;

    return (
        <div style={{ padding: '20px', paddingBottom: '100px', minHeight: '100vh', background: 'black', color: 'white' }}>

            {/* Navigation / Header */}
            {!selectedSeries ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Audio Series</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                        {seriesList.map(series => (
                            <div key={series._id} onClick={() => setSelectedSeries(series)} style={{ cursor: 'pointer' }}>
                                <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
                                    <img src={getImageUrl(series.coverImage)} alt={series.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '50%' }}>
                                        <Play fill="white" size={16} />
                                    </div>
                                </div>
                                <div style={{ fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{series.title}</div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{series.episodes?.length || 0} Episodes</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            ) : (
                <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                    <button onClick={() => setSelectedSeries(null)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#aaa', marginBottom: '16px', cursor: 'pointer' }}>
                        <ChevronLeft size={20} /> Back
                    </button>

                    <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <img src={getImageUrl(selectedSeries.coverImage)} alt={selectedSeries.title} style={{ width: '140px', height: '140px', borderRadius: '12px', objectFit: 'cover' }} />
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '8px' }}>{selectedSeries.title}</h1>
                            <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.4', marginBottom: '16px' }}>{selectedSeries.description}</p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => selectedSeries.episodes?.[0] && playEpisode(selectedSeries.episodes[0], selectedSeries)}
                                    style={{
                                        background: '#46d369', color: 'black', border: 'none', padding: '10px 24px', borderRadius: '24px',
                                        fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <Play fill="black" size={18} /> Play All
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '12px' }}>Episodes</h3>
                        {(!selectedSeries.episodes || selectedSeries.episodes.length === 0) ? (
                            <div style={{ color: '#aaa', fontStyle: 'italic', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
                                No episodes available for this series yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedSeries.episodes?.map((episode, index) => (
                                    <div
                                        key={index}
                                        onClick={() => playEpisode(episode, selectedSeries)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer',
                                            border: currentEpisode?._id === episode._id ? '1px solid #46d369' : '1px solid transparent'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ color: '#666', fontSize: '0.9rem', width: '20px' }}>{index + 1}</div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: currentEpisode?._id === episode._id ? '#46d369' : 'white' }}>{episode.title}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={12} /> {formatDuration(episode.duration)}
                                                </div>
                                            </div>
                                        </div>
                                        <Play size={20} fill={currentEpisode?._id === episode._id ? "#46d369" : "none"} color={currentEpisode?._id === episode._id ? "#46d369" : "white"} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Floating Player - Only show when on Audio Series page */}
            <AnimatePresence>
                {currentEpisode && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        style={{
                            position: 'fixed', bottom: '72px', left: '10px', right: '10px',
                            background: '#1a1a1a', padding: '12px', borderRadius: '12px',
                            display: 'flex', flexDirection: 'column', gap: '10px',
                            boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', zIndex: 2000, border: '1px solid #333'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={getImageUrl(currentEpisode.coverImage)} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', width: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {currentEpisode.title}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{currentEpisode.seriesTitle}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <SkipBack
                                    size={20}
                                    color="#ccc"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => skipBackward(10)}
                                />
                                <button
                                    onClick={togglePlay}
                                    style={{ width: '36px', height: '36px', background: 'white', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" />}
                                </button>
                                <SkipForward
                                    size={20}
                                    color="#ccc"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => skipForward(10)}
                                />
                            </div>
                        </div>

                        {/* Progress Bar & Time */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.7rem', color: '#aaa' }}>
                            <span style={{ minWidth: '35px', textAlign: 'right' }}>{formatDuration(currentTime)}</span>
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={(e) => seekTo(Number(e.target.value))}
                                style={{
                                    flex: 1, height: '4px', appearance: 'none', background: '#444',
                                    borderRadius: '2px', cursor: 'pointer', outline: 'none'
                                }}
                            />
                            <span style={{ minWidth: '35px' }}>{formatDuration(duration)}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper to format duration
const formatDuration = (seconds) => {
    if (!seconds) return "0 sec";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m === 0) return `${s} sec`;
    return `${m}:${s < 10 ? '0' : ''}${s} min`;
};
