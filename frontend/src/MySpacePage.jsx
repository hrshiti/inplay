import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Download, ChevronRight, Settings, User } from 'lucide-react';
import { MY_SPACE_DATA } from './data';

export default function MySpacePage({ onMovieClick }) {
    const containerRef = useRef(null);

    return (
        <div ref={containerRef} className="my-space-container" style={{ padding: '24px', paddingBottom: '100px', color: 'white' }}>

            {/* User Profile Header */}
            <motion.div
                className="profile-header"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '16px' }}
            >
                <motion.div
                    whileTap={{ scale: 0.95 }}
                    onClick={() => alert("Profile Settings Coming Soon!")}
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, cursor: 'pointer' }}
                >
                    <div style={{ position: 'relative' }}>
                        <img
                            src={MY_SPACE_DATA.user.avatar}
                            alt="Profile"
                            style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--accent)' }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            background: 'var(--accent)', borderRadius: '50%', width: '20px', height: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid black'
                        }}>
                            <User size={12} fill="white" />
                        </div>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{MY_SPACE_DATA.user.name}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)',
                                padding: '2px 8px', borderRadius: '4px', color: '#ffd700'
                            }}>
                                {MY_SPACE_DATA.user.plan} Member
                            </span>
                        </div>
                    </div>
                </motion.div>

                <motion.button
                    whileTap={{ scale: 0.9, rotate: 90 }}
                    onClick={() => alert("App Settings Coming Soon!")}
                    style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', padding: '8px' }}
                >
                    <Settings size={24} />
                </motion.button>
            </motion.div>

            {/* Watch Later Section */}
            <Section title="Watch Later" icon={<Clock size={16} />}>
                <div className="horizontal-list hide-scrollbar" style={{ padding: 0 }}>
                    {MY_SPACE_DATA.watch_later.map((movie) => (
                        <SpaceCard key={movie.id} item={movie} type="poster" onClick={() => onMovieClick(movie)} />
                    ))}
                </div>
            </Section>

            {/* Downloads Section */}
            <Section title="Downloads" icon={<Download size={16} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {MY_SPACE_DATA.downloads.map((item) => (
                        <DownloadRow key={item.id} item={item} onClick={() => onMovieClick(item)} />
                    ))}
                </div>
            </Section>

            {/* Watch History */}
            <Section title="History" icon={<Clock size={16} />}>
                <div className="horizontal-list hide-scrollbar" style={{ padding: 0 }}>
                    {MY_SPACE_DATA.history.map((show) => (
                        <SpaceCard key={show.id} item={show} type="backdrop" onClick={() => onMovieClick(show)} />
                    ))}
                </div>
            </Section>

        </div>
    );
}

function Section({ title, icon, children }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: '32px' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#eee' }}>
                    {icon} {title}
                </h3>
                <ChevronRight size={16} color="#666" />
            </div>
            {children}
        </motion.section>
    )
}

function SpaceCard({ item, type, onClick }) {
    const isPoster = type === 'poster';
    return (
        <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            style={{
                flex: isPoster ? '0 0 110px' : '0 0 200px',
                position: 'relative',
                cursor: 'pointer'
            }}
        >
            <div style={{
                height: isPoster ? '160px' : '110px',
                borderRadius: '12px', overflow: 'hidden', marginBottom: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                background: '#222'
            }}>
                <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {item.progress && (
                    <div style={{ position: 'absolute', bottom: '34px', left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.2)' }}>
                        <div style={{ width: `${item.progress}%`, height: '100%', background: 'var(--accent)' }} />
                    </div>
                )}
            </div>
            <h4 style={{
                fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: '#ddd'
            }}>
                {item.title}
            </h4>
            {item.watched_date && <span style={{ fontSize: '0.75rem', color: '#777' }}>Watched {item.watched_date}</span>}
        </motion.div>
    )
}

function DownloadRow({ item, onClick }) {
    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{
                display: 'flex', gap: '16px', alignItems: 'center',
                background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer'
            }}
        >
            <div style={{ width: '80px', height: '50px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={item.backdrop || item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{item.title}</h4>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{item.size} • {item.rating} Rating</span>
            </div>
            <div style={{ background: '#333', padding: '8px', borderRadius: '50%' }}>
                <Download size={16} color="var(--accent)" />
            </div>
        </motion.div>
    )
}
