import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

const AdCarousel = ({ promotions }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef(null);

    useEffect(() => {
        if (!promotions || promotions.length === 0) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % promotions.length);
        }, 10000); // 10 seconds interval

        return () => clearInterval(interval);
    }, [promotions]);

    if (!promotions || promotions.length === 0) return null;

    const currentPromo = promotions[currentIndex];
    const isVideo = !!currentPromo.promoVideoUrl;

    return (
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '140px' }}>
            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentPromo._id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5 }}
                    style={{ width: '100%', height: '100%', position: 'relative' }}
                >
                    {isVideo ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <video
                                ref={videoRef}
                                src={getImageUrl(currentPromo.promoVideoUrl)}
                                poster={getImageUrl(currentPromo.posterImageUrl)}
                                autoPlay
                                muted={isMuted}
                                loop
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                            />
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    right: '10px',
                                    background: 'rgba(0,0,0,0.5)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    padding: '6px',
                                    cursor: 'pointer',
                                    color: 'white',
                                    zIndex: 10
                                }}
                            >
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                        </div>
                    ) : (
                        <img
                            src={getImageUrl(currentPromo.posterImageUrl)}
                            alt={currentPromo.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                            onError={(e) => { e.target.src = `https://placehold.co/800x450/111/FFF?text=${currentPromo.title}` }}
                        />
                    )}

                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        padding: '16px',
                        color: 'white'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{currentPromo.title}</h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Sponsored</p>
                    </div>
                </motion.div>
            </AnimatePresence>

            {promotions.length > 1 && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '10px'
                }}>
                    {currentIndex + 1} / {promotions.length}
                </div>
            )}
        </div>
    );
};

export default AdCarousel;
