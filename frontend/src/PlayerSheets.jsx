// --- New UI Components (YouTube-style Sheets) ---
import React from 'react';
import { Minus, Plus, X, Check } from 'lucide-react';

const LoadingIndicator = () => (
    <div style={{ width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '10px', margin: '0 auto 12px' }}></div>
);

export const SpeedSheet = ({ currentSpeed, onClose, onApply }) => {
    // Presets
    const presets = [0.25, 0.5, 1, 1.25, 1.5, 2];

    return (
        <div
            style={{
                position: 'absolute', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: '24px',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '92%', maxWidth: '380px',
                    background: 'white',
                    borderRadius: '24px',
                    padding: '24px 16px',
                    display: 'flex', flexDirection: 'column', gap: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    animation: 'scaleIn 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. Header & Value */}
                <div style={{ position: 'relative', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '10px', margin: '-10px auto 16px' }}></div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#000' }}>
                        {currentSpeed.toFixed(2)}x
                    </h3>
                    <button onClick={onClose} style={{ position: 'absolute', top: '-10px', right: '0', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <X size={20} color="#666" />
                    </button>
                </div>

                {/* 2. Slider Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '0 8px' }}>
                    <button
                        onClick={() => onApply(Math.max(0.25, currentSpeed - 0.05))}
                        style={{
                            width: '40px', height: '40px', borderRadius: '50%', background: '#f0f0f0',
                            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0
                        }}
                    >
                        <Minus size={20} color="#333" />
                    </button>

                    <div style={{ flex: 1, position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: '4px', background: '#e0e0e0', borderRadius: '2px', position: 'relative' }}>
                            <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${Math.min(100, (currentSpeed / 2) * 100)}%`,
                                background: 'black', borderRadius: '2px'
                            }}></div>
                        </div>
                        <input
                            type="range"
                            min="0.25" max="2" step="0.05"
                            value={currentSpeed}
                            onChange={(e) => onApply(parseFloat(e.target.value))}
                            style={{
                                position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            left: `${Math.min(100, (currentSpeed / 2) * 100)}%`,
                            top: '50%', transform: 'translate(-50%, -50%)',
                            width: '20px', height: '20px', background: 'black', borderRadius: '50%',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)', pointerEvents: 'none'
                        }}></div>
                    </div>

                    <button
                        onClick={() => onApply(Math.min(2, currentSpeed + 0.05))}
                        style={{
                            width: '40px', height: '40px', borderRadius: '50%', background: '#f0f0f0',
                            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0
                        }}
                    >
                        <Plus size={20} color="#333" />
                    </button>
                </div>

                {/* 3. Horizontal Chips */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    gap: '8px', overflowX: 'auto', paddingBottom: '4px',
                    scrollbarWidth: 'none', msOverflowStyle: 'none'
                }}>
                    {presets.map(speed => (
                        <div key={speed} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button
                                onClick={() => onApply(speed)}
                                style={{
                                    width: '48px', height: '48px', border: 'none', borderRadius: '50%',
                                    background: currentSpeed === speed ? 'black' : '#f5f5f5',
                                    color: currentSpeed === speed ? 'white' : '#333',
                                    fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {speed === 1 ? '1x' : `${speed}x`}
                            </button>
                            {speed === 1 && (
                                <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: '500' }}>Normal</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export const QualitySheet = ({ currentQuality, onClose, onApply }) => {
    const qualities = ['1080p', '720p', '480p', '360p', '240p', '144p', 'Auto'];

    return (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%',
            background: 'white', borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
            padding: '12px 0 20px', zIndex: 1000,
            animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            color: 'black', maxHeight: '70vh', overflowY: 'auto'
        }} onClick={(e) => e.stopPropagation()}>
            <LoadingIndicator />
            <h3 style={{ padding: '0 20px 10px', margin: 0, fontSize: '1rem', borderBottom: '1px solid #f0f0f0' }}>Quality for current video</h3>

            <div style={{ padding: '8px 0' }}>
                {qualities.map(q => {
                    const isAuto = q === 'Auto';
                    const isSelected = currentQuality === q;
                    const label = isAuto ? `Auto ${currentQuality === 'Auto' ? '(360p)' : ''}` : q;

                    return (
                        <div
                            key={q}
                            onClick={() => { onApply(q); onClose(); }}
                            style={{
                                padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px',
                                cursor: 'pointer',
                                background: isSelected ? '#f5f5f5' : 'transparent'
                            }}
                        >
                            <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                                {isSelected && <Check size={18} color="black" />}
                            </div>
                            <span style={{ fontSize: '0.95rem', fontWeight: isSelected ? '600' : '400' }}>{label}</span>
                        </div>
                    );
                })}
            </div>
            <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#666" />
            </button>
        </div>
    );
};
