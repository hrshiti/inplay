import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { getImageUrl } from '../utils/imageUtils';
import contentService from '../services/api/contentService';

const AudioPlayerContext = createContext();

export const useAudioPlayer = () => {
    const context = useContext(AudioPlayerContext);
    if (!context) {
        throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
    }
    return context;
};

export const AudioPlayerProvider = ({ children }) => {
    const [currentEpisode, setCurrentEpisode] = useState(null);
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);
    const isInitialized = useRef(false);
    const viewCounted = useRef(false);
    const lastPlayedSeriesId = useRef(null);

    // Initialize audio element only once
    useEffect(() => {
        if (!isInitialized.current) {
            console.log('Initializing audio player...');
            audioRef.current = new Audio();
            audioRef.current.volume = 1.0;
            audioRef.current.preload = 'metadata';
            audioRef.current.crossOrigin = 'anonymous';

            // Event listeners for audio element
            audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current) {
                    setCurrentTime(audioRef.current.currentTime);

                    // Track view for Audio Series
                    if (audioRef.current.currentTime >= 3 && !viewCounted.current && lastPlayedSeriesId.current) {
                        viewCounted.current = true;
                        contentService.incrementContentView(lastPlayedSeriesId.current, 'audio-series')
                            .then(() => console.log('Audio series view counted:', lastPlayedSeriesId.current))
                            .catch(err => console.error('Failed to count audio view:', err));
                    }
                }
            });

            audioRef.current.addEventListener('loadedmetadata', () => {
                if (audioRef.current) {
                    console.log('Audio metadata loaded, duration:', audioRef.current.duration);
                    setDuration(audioRef.current.duration || 0);
                }
            });

            audioRef.current.addEventListener('ended', () => {
                console.log('Audio ended');
                setIsPlaying(false);
            });

            audioRef.current.addEventListener('error', (e) => {
                const error = audioRef.current?.error;
                let errorMessage = 'Unknown audio error';
                if (error) {
                    switch (error.code) {
                        case 1: errorMessage = 'MEDIA_ERR_ABORTED - Fetching process aborted'; break;
                        case 2: errorMessage = 'MEDIA_ERR_NETWORK - Network error'; break;
                        case 3: errorMessage = 'MEDIA_ERR_DECODE - Decoding error'; break;
                        case 4: errorMessage = 'MEDIA_ERR_SRC_NOT_SUPPORTED - Source not supported or 404'; break;
                    }
                }
                console.error('Audio playback error:', errorMessage, e);
                console.error('Audio error details:', {
                    code: error?.code,
                    message: error?.message,
                    src: audioRef.current?.src,
                    networkState: audioRef.current?.networkState,
                    readyState: audioRef.current?.readyState
                });
                setIsPlaying(false);
            });

            audioRef.current.addEventListener('canplay', () => {
                console.log('Audio can play');
            });

            audioRef.current.addEventListener('loadstart', () => {
                console.log('Audio load started');
            });

            isInitialized.current = true;
        }

        return () => {
            if (audioRef.current && isInitialized.current) {
                console.log('Cleaning up audio player...');
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
                isInitialized.current = false;
            }
        };
    }, []);

    // Handle auto-play next episode
    useEffect(() => {
        if (!audioRef.current) return;

        const handleEnded = () => {
            console.log('Episode ended, checking for next...');
            if (selectedSeries?.episodes && currentEpisode) {
                const currentIndex = selectedSeries.episodes.findIndex(
                    e => e._id === currentEpisode._id
                );
                if (currentIndex !== -1 && currentIndex < selectedSeries.episodes.length - 1) {
                    const nextEpisode = selectedSeries.episodes[currentIndex + 1];
                    console.log('Playing next episode:', nextEpisode.title);
                    playEpisode(nextEpisode, selectedSeries);
                }
            }
        };

        audioRef.current.addEventListener('ended', handleEnded);

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('ended', handleEnded);
            }
        };
    }, [selectedSeries, currentEpisode]);

    const playEpisode = async (episode, series) => {
        if (!audioRef.current) {
            console.error('Audio element not initialized');
            return;
        }

        try {
            console.log('Playing episode:', episode.title);
            console.log('Audio URL:', episode.audioUrl);

            const episodeWithImage = {
                ...episode,
                coverImage: series.coverImage,
                seriesTitle: series.title
            };

            // First pause current playback
            audioRef.current.pause();

            // Set new source
            const audioUrl = getImageUrl(episode.audioUrl);
            console.log('Resolved audio URL:', audioUrl);

            audioRef.current.src = audioUrl;

            // Update state
            setCurrentEpisode(episodeWithImage);
            setSelectedSeries(series);
            setCurrentTime(0);
            setDuration(0);
            viewCounted.current = false;
            lastPlayedSeriesId.current = series._id;

            // Load and play
            audioRef.current.load();

            // Wait a bit for the load to start
            await new Promise(resolve => setTimeout(resolve, 100));

            const playPromise = audioRef.current.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Playback started successfully');
                        setIsPlaying(true);
                    })
                    .catch(error => {
                        console.error('Playback failed:', error);
                        setIsPlaying(false);
                    });
            }
        } catch (error) {
            console.error('Error in playEpisode:', error);
            setIsPlaying(false);
        }
    };

    const togglePlay = async () => {
        if (!audioRef.current || !currentEpisode) {
            console.warn('Cannot toggle play: no audio or episode');
            return;
        }

        try {
            if (isPlaying) {
                console.log('Pausing audio');
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                console.log('Resuming audio');
                const playPromise = audioRef.current.play();

                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('Playback resumed');
                            setIsPlaying(true);
                        })
                        .catch(error => {
                            console.error('Resume playback failed:', error);
                            setIsPlaying(false);
                        });
                }
            }
        } catch (error) {
            console.error('Error in togglePlay:', error);
            setIsPlaying(false);
        }
    };

    const seekTo = (time) => {
        if (audioRef.current && !isNaN(time)) {
            console.log('Seeking to:', time);
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const skipForward = (seconds = 10) => {
        if (audioRef.current) {
            const newTime = Math.min(duration, currentTime + seconds);
            seekTo(newTime);
        }
    };

    const skipBackward = (seconds = 10) => {
        if (audioRef.current) {
            const newTime = Math.max(0, currentTime - seconds);
            seekTo(newTime);
        }
    };

    const playNext = () => {
        if (!selectedSeries?.episodes || !currentEpisode) return;

        const currentIndex = selectedSeries.episodes.findIndex(
            e => e._id === currentEpisode._id
        );

        if (currentIndex !== -1 && currentIndex < selectedSeries.episodes.length - 1) {
            const nextEpisode = selectedSeries.episodes[currentIndex + 1];
            playEpisode(nextEpisode, selectedSeries);
        }
    };

    const playPrevious = () => {
        if (!selectedSeries?.episodes || !currentEpisode) return;

        const currentIndex = selectedSeries.episodes.findIndex(
            e => e._id === currentEpisode._id
        );

        if (currentIndex > 0) {
            const prevEpisode = selectedSeries.episodes[currentIndex - 1];
            playEpisode(prevEpisode, selectedSeries);
        }
    };

    const stopAudio = () => {
        console.log('Stopping audio');
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setCurrentEpisode(null);
        setSelectedSeries(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    };

    const value = {
        currentEpisode,
        selectedSeries,
        isPlaying,
        currentTime,
        duration,
        playEpisode,
        togglePlay,
        seekTo,
        skipForward,
        skipBackward,
        playNext,
        playPrevious,
        stopAudio
    };

    return (
        <AudioPlayerContext.Provider value={value}>
            {children}
        </AudioPlayerContext.Provider>
    );
};
