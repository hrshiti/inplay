import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, Shield, Info, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import appSettingsService from './services/api/appSettingsService';

export default function LegalPage({ type }) {
    const navigate = useNavigate();
    const [appSettings, setAppSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await appSettingsService.getSettings();
                setAppSettings(data);
            } catch (err) {
                console.error("Failed to fetch app settings:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const getTitle = () => {
        switch (type) {
            case 'help': return 'Help Center';
            case 'privacy': return 'Privacy Policy';
            case 'about': return 'About InPlay';
            default: return 'Information';
        }
    };

    // Converts admin-panel markdown text into structured JSX elements
    const parseAboutContent = (text) => {
        if (!text) return null;

        // Normalize line endings and split into lines
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const elements = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) { i++; continue; }

            // Horizontal rule separators (standalone ---, ***)
            if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
                elements.push(<div key={i} style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '12px 0' }} />);
                i++; continue;
            }

            // ### H3 headings
            if (line.startsWith('### ')) {
                elements.push(
                    <h4 key={i} style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ff4d4d', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '8px', marginBottom: '4px' }}>
                        {line.replace(/^### /, '')}
                    </h4>
                );
                i++; continue;
            }

            // ## H2 headings
            if (line.startsWith('## ')) {
                elements.push(
                    <h3 key={i} style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', marginTop: '12px', marginBottom: '6px' }}>
                        {line.replace(/^## /, '')}
                    </h3>
                );
                i++; continue;
            }

            // # H1 headings
            if (line.startsWith('# ')) {
                elements.push(
                    <h2 key={i} style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fff', marginTop: '16px', marginBottom: '8px' }}>
                        {line.replace(/^# /, '')}
                    </h2>
                );
                i++; continue;
            }

            // Bullet points (* or -)
            if (/^[*-] /.test(line)) {
                const bulletItems = [];
                while (i < lines.length && /^[*-] /.test(lines[i].trim())) {
                    bulletItems.push(lines[i].trim().replace(/^[*-] /, ''));
                    i++;
                }
                elements.push(
                    <ul key={`ul-${i}`} style={{ paddingLeft: '16px', margin: '4px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {bulletItems.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.85rem', color: '#bbb', lineHeight: '1.5', listStyle: 'none', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ color: '#ff4d4d', marginTop: '2px', flexShrink: 0 }}>▸</span>
                                <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
                            </li>
                        ))}
                    </ul>
                );
                continue;
            }

            // Regular paragraph lines
            elements.push(
                <p key={i} style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: '1.7', margin: '4px 0' }}
                    dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
                />
            );
            i++;
        }

        return elements;
    };

    // Inline formatting: **bold**, *italic*, [link](url), `code`
    const inlineFormat = (text) => {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:700">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em style="color:#ddd">$1</em>')
            .replace(/`(.+?)`/g, '<code style="background:rgba(255,77,77,0.15);color:#ff6b6b;padding:1px 5px;border-radius:4px;font-size:0.8em">$1</code>')
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer" style="color:#ff4d4d;text-decoration:underline">$1</a>');
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ width: '30px', height: '30px', border: '3px solid #ff4d4d', borderTopColor: 'transparent', borderRadius: '50%' }}
                    />
                </div>
            );
        }

        switch (type) {
            case 'help':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '8px' }}>Frequently Asked Questions</h3>
                            {(appSettings?.helpCenter?.faqs || [
                                { question: 'How do I cancel my subscription?', answer: 'Go to settings to cancel.' },
                                { question: 'Can I watch offline?', answer: 'Yes, download the videos.' },
                                { question: 'How to change my password?', answer: 'Go to profile settings.' },
                                { question: 'Devices supported by InPlay', answer: 'Mobile, Tablet, and Web.' },
                                { question: 'Reporting a playback issue', answer: 'Contact support with details.' }
                            ]).map((faq, i) => (
                                <details key={i} style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <summary style={{ fontSize: '0.9rem', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                                        <span>{faq.question}</span>
                                        <ChevronRight size={16} color="#666" />
                                    </summary>
                                    <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#888', lineHeight: '1.5' }}>
                                        {faq.answer}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
                        <h3 style={{ color: 'white', marginBottom: '16px' }}>Privacy Policy</h3>
                        <p style={{ marginBottom: '16px' }}>Last updated: {appSettings?.privacyPolicy?.lastUpdated ? new Date(appSettings.privacyPolicy.lastUpdated).toLocaleDateString() : 'January 2026'}</p>
                        <div
                            style={{ whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: appSettings?.privacyPolicy?.content || 'InPlay ("we", "our", or "us") is committed to protecting your privacy...' }}
                        />
                    </div>
                );
            case 'about':
                return (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: '#ff4d4d',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            boxShadow: '0 8px 32px rgba(255, 77, 77, 0.3)'
                        }}>
                            <div style={{ color: 'white', fontSize: '2rem', fontWeight: '900 italic' }}>IP</div>
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px', color: '#fff' }}>InPlay</h3>
                        <p style={{ color: '#666', marginBottom: '32px' }}>Version {appSettings?.aboutInPlay?.version || '2.4.0 (Stable Build)'}</p>
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '16px',
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {/* Parsed & structured description from admin panel */}
                            {parseAboutContent(appSettings?.aboutInPlay?.description) || (
                                <p style={{ color: '#888', fontSize: '0.85rem' }}>
                                    InPlay is the next generation streaming platform bringing you the best in movies, shows, and originals with an unmatched user experience.
                                </p>
                            )}
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '8px 0' }}></div>
                            {appSettings?.aboutInPlay?.website && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#555', fontSize: '0.85rem' }}>Website</span>
                                    <a href={`https://${appSettings.aboutInPlay.website}`} target="_blank" rel="noreferrer" style={{ color: '#ff4d4d', textDecoration: 'none', fontSize: '0.85rem' }}>{appSettings.aboutInPlay.website}</a>
                                </div>
                            )}
                            {appSettings?.aboutInPlay?.twitter && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#555', fontSize: '0.85rem' }}>Twitter</span>
                                    <a href={`https://twitter.com/${appSettings.aboutInPlay.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ color: '#ff4d4d', textDecoration: 'none', fontSize: '0.85rem' }}>{appSettings.aboutInPlay.twitter}</a>
                                </div>
                            )}
                            {appSettings?.aboutInPlay?.instagram && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#555', fontSize: '0.85rem' }}>Instagram</span>
                                    <a href={`https://instagram.com/${appSettings.aboutInPlay.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ color: '#ff4d4d', textDecoration: 'none', fontSize: '0.85rem' }}>{appSettings.aboutInPlay.instagram}</a>
                                </div>
                            )}
                        </div>
                        <p style={{ color: '#333', fontSize: '0.75rem', marginTop: '40px' }}>&copy; {new Date().getFullYear()} InPlay Entertainment Records Inc.<br />All rights reserved.</p>
                    </div>
                );
            default:
                return <div style={{ color: 'white' }}>Page not found</div>;
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#000',
            color: 'white',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '20px',
                position: 'sticky',
                top: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 10,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        if (window.history.length > 2) {
                            navigate(-1);
                        } else {
                            navigate('/');
                        }
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', marginLeft: '-8px' }}
                >
                    <ArrowLeft size={24} />
                </motion.button>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>{getTitle()}</h2>
            </header>

            <main style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                {renderContent()}
            </main>
        </div>
    );
}
