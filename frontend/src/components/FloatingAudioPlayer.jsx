import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, X, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { getImageUrl } from '../utils/imageUtils';
import { useNavigate, useLocation } from 'react-router-dom';

export default function FloatingAudioPlayer() {
    const {
        currentEpisode,
        isPlaying,
        currentTime,
        duration,
        togglePlay,
        seekTo,
        playNext,
        playPrevious,
        stopAudio
    } = useAudioPlayer();

    const [isExpanded, setIsExpanded] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Only show if there's a current episode AND we're not on the audio series page
    const isOnAudioSeriesPage = location.pathname === '/audio-series';
    const shouldShow = currentEpisode && !isOnAudioSeriesPage;

    if (!shouldShow) return null;

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                style={{
                    position: 'fixed',
                    bottom: isExpanded ? '60px' : '72px',
                    left: '10px',
                    right: '10px',
                    background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
                    zIndex: 9999,
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    overflow: 'hidden'
                }}
            >
                {/* Compact View */}
                {!isExpanded && (
                    <div
                        onClick={() => setIsExpanded(true)}
                        style={{
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        <img
                            src={getImageUrl(currentEpisode.coverImage)}
                            alt={currentEpisode.title}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: '0.95rem',
                                    fontWeight: '700',
                                    color: 'white',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginBottom: '2px'
                                }}
                            >
                                {currentEpisode.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                {currentEpisode.seriesTitle}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    togglePlay();
                                }}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                }}
                            >
                                {isPlaying ? (
                                    <Pause size={18} fill="black" />
                                ) : (
                                    <Play size={18} fill="black" />
                                )}
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    stopAudio();
                                }}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '50%',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#bbb'
                                }}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>
                    </div>
                )}

                {/* Expanded View */}
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        style={{ padding: '16px' }}
                    >
                        {/* Header with close button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setIsExpanded(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#bbb'
                                }}
                            >
                                <ChevronUp size={18} />
                            </motion.button>

                            <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>
                                NOW PLAYING
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={stopAudio}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#bbb'
                                }}
                            >
                                <X size={18} />
                            </motion.button>
                        </div>

                        {/* Album Art */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <img
                                src={getImageUrl(currentEpisode.coverImage)}
                                alt={currentEpisode.title}
                                style={{
                                    width: '160px',
                                    height: '160px',
                                    borderRadius: '12px',
                                    objectFit: 'cover',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                    margin: '0 auto'
                                }}
                            />
                        </div>

                        {/* Track Info */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    color: 'white',
                                    marginBottom: '4px'
                                }}
                            >
                                {currentEpisode.title}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                {currentEpisode.seriesTitle}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: '12px' }}>
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={(e) => seekTo(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    height: '4px',
                                    appearance: 'none',
                                    background: `linear-gradient(to right, #46d369 ${(currentTime / duration) * 100}%, #444 ${(currentTime / duration) * 100}%)`,
                                    borderRadius: '2px',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.7rem',
                                    color: '#aaa',
                                    marginTop: '4px'
                                }}
                            >
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Playback Controls */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '24px',
                                marginTop: '16px'
                            }}
                        >
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={playPrevious}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#ccc'
                                }}
                            >
                                <SkipBack size={28} fill="#ccc" />
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={togglePlay}
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                                }}
                            >
                                {isPlaying ? (
                                    <Pause size={24} fill="black" />
                                ) : (
                                    <Play size={24} fill="black" style={{ marginLeft: '2px' }} />
                                )}
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={playNext}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#ccc'
                                }}
                            >
                                <SkipForward size={28} fill="#ccc" />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
