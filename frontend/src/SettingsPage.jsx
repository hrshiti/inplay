import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon, Globe, Info, Crown, Mail, Phone, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MY_SPACE_DATA } from './data';
import authService from './services/api/authService';

export default function SettingsPage({ onLogout, currentUser, onUpdateUser }) {
    const navigate = useNavigate();
    const [activeModal, setActiveModal] = useState(null); // 'profile', 'plan', 'notifications', 'language', 'appearance'
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [editData, setEditData] = useState({
        name: '',
        phone: ''
    });

    // Preferences states
    const [notificationSettings, setNotificationSettings] = useState({
        newReleases: true,
        promotions: false,
        updates: true
    });
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [currentTheme, setCurrentTheme] = useState('Dark Mode');

    useEffect(() => {
        if (currentUser) {
            setEditData({
                name: currentUser.name || '',
                phone: currentUser.phone || ''
            });

            // Sync preferences
            if (currentUser.preferences) {
                if (currentUser.preferences.language) {
                    const langMap = { 'en': 'English', 'hi': 'Hindi', 'bh': 'Bhojpuri' };
                    setSelectedLanguage(langMap[currentUser.preferences.language] || 'English');
                }
                if (currentUser.preferences.notifications) {
                    setNotificationSettings(currentUser.preferences.notifications);
                }
            }
        }
    }, [currentUser]);

    const handlePreferenceUpdate = async (newPrefs) => {
        try {
            const updatedUser = await authService.updatePreferences(newPrefs);
            onUpdateUser(updatedUser);
        } catch (err) {
            setMessage({ text: 'Failed to sync preferences', type: 'error' });
        }
    };

    const handleLanguageSelect = (langLabel) => {
        const langCodeMap = { 'English': 'en', 'Hindi': 'hi', 'Bhojpuri': 'bh' };
        const code = langCodeMap[langLabel] || 'en';
        setSelectedLanguage(langLabel);
        handlePreferenceUpdate({ language: code });
    };

    const handleNotificationToggle = (key) => {
        const newSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
        setNotificationSettings(newSettings);
        handlePreferenceUpdate({ notifications: newSettings });
    };

    // Use actual user data or fallback to mock data
    const userName = currentUser?.name || MY_SPACE_DATA.user.name;
    const userEmail = currentUser?.email || 'john.doe@example.com';
    const userAvatar = currentUser?.avatar || MY_SPACE_DATA.user.avatar;
    const userPlan = currentUser?.subscription?.plan?.name || MY_SPACE_DATA.user.plan;

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const updatedUser = await authService.updateProfile(editData);
            onUpdateUser(updatedUser);
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            setTimeout(() => {
                setActiveModal(null);
                setMessage({ text: '', type: '' });
            }, 1500);
        } catch (err) {
            setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Size check (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ text: 'File too large (max 5MB)', type: 'error' });
            return;
        }

        setIsUploading(true);
        setMessage({ text: '', type: '' });

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const updatedUser = await authService.updateAvatar(formData);
            onUpdateUser(updatedUser);
            setMessage({ text: 'Photo updated successfully!', type: 'success' });
        } catch (err) {
            setMessage({ text: err.message || 'Failed to upload photo', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const sections = [
        {
            title: 'Account',
            items: [
                { id: 'profile', icon: <User size={20} />, label: 'Profile Settings', value: userName, action: () => setActiveModal('profile') },
                { id: 'subscription', icon: <Crown size={20} color="#ffd700" />, label: 'Plan Details', value: userPlan, action: () => setActiveModal('plan') },
            ]
        },
        {
            title: 'Preferences',
            items: [
                { id: 'notifications', icon: <Bell size={20} />, label: 'Notifications', value: 'Customized', action: () => setActiveModal('notifications') },
                { id: 'language', icon: <Globe size={20} />, label: 'App Language', value: selectedLanguage, action: () => setActiveModal('language') },
                { id: 'appearance', icon: <Moon size={20} />, label: 'Appearance', value: currentTheme, action: () => setActiveModal('appearance') },
            ]
        },
        {
            title: 'Support & Legal',
            items: [
                { id: 'help', icon: <HelpCircle size={20} />, label: 'Help Center', action: () => setActiveModal('help') },
                { id: 'privacy', icon: <Shield size={20} />, label: 'Privacy Policy', action: () => setActiveModal('privacy') },
                { id: 'about', icon: <Info size={20} />, label: 'About InPlay', action: () => setActiveModal('about') },
            ]
        }
    ];

    const Toggle = ({ active, onToggle }) => (
        <div
            onClick={onToggle}
            style={{
                width: '48px',
                height: '24px',
                background: active ? '#ff4d4d' : '#333',
                borderRadius: '12px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.3s ease'
            }}
        >
            <motion.div
                animate={{ x: active ? 26 : 2 }}
                style={{
                    position: 'absolute',
                    top: '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
            />
        </div>
    );

    return (
        <div className="settings-page" style={{
            minHeight: '100vh',
            background: '#000',
            color: 'white',
            paddingBottom: '100px'
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '20px',
                position: 'sticky',
                top: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 10
            }}>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} />
                </motion.button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Settings</h2>
            </header>

            {/* Profile Brief */}
            <div style={{ padding: '0 20px 20px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
                    borderRadius: '24px',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '32px'
                }}>
                    <img
                        src={userAvatar}
                        alt="Profile"
                        style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid #ff0000', objectFit: 'cover' }}
                    />
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>{userName}</h3>
                        <span style={{ fontSize: '0.9rem', color: '#888' }}>{userEmail}</span>
                    </div>
                </div>

                {/* Settings Sections */}
                {sections.map((section, idx) => (
                    <div key={idx} style={{ marginBottom: '32px' }}>
                        <h4 style={{
                            fontSize: '0.85rem',
                            color: '#666',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '16px',
                            paddingLeft: '4px'
                        }}>
                            {section.title}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {section.items.map((item) => (
                                <motion.div
                                    key={item.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => item.action ? item.action() : alert(`${item.label} coming soon!`)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        border: '1px solid rgba(255,255,255,0.02)'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#aaa'
                                    }}>
                                        {item.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.95rem', fontWeight: '500' }}>{item.label}</p>
                                        {item.value && <p style={{ fontSize: '0.8rem', color: '#666' }}>{item.value}</p>}
                                    </div>
                                    <ChevronRight size={18} color="#444" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Logout Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        if (confirm("Are you sure you want to logout?")) {
                            onLogout();
                            navigate('/');
                        }
                    }}
                    style={{
                        width: '100%',
                        padding: '18px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,77,77,0.2)',
                        background: 'rgba(255,77,77,0.05)',
                        color: '#ff4d4d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '16px'
                    }}
                >
                    <LogOut size={20} />
                    Log Out
                </motion.button>
            </div>

            {/* Modal Components */}
            <AnimatePresence>
                {activeModal && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: '#0a0a0a',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <header style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px',
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(10px)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setActiveModal(null)}
                                    style={{ background: 'transparent', border: 'none', color: 'white' }}
                                >
                                    <ArrowLeft size={24} />
                                </motion.button>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                                    {activeModal === 'profile' && 'Edit Profile'}
                                    {activeModal === 'plan' && 'Plan Details'}
                                    {activeModal === 'notifications' && 'Notifications'}
                                    {activeModal === 'language' && 'App Language'}
                                    {activeModal === 'appearance' && 'Appearance'}
                                    {activeModal === 'help' && 'Help Center'}
                                    {activeModal === 'privacy' && 'Privacy Policy'}
                                    {activeModal === 'about' && 'About InPlay'}
                                </h2>
                            </div>
                            {activeModal === 'profile' && (
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ff4d4d',
                                        fontWeight: '700',
                                        fontSize: '1rem',
                                        opacity: isSaving ? 0.5 : 1
                                    }}
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </motion.button>
                            )}
                        </header>

                        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>

                            {/* PROFILE CONTENT */}
                            {activeModal === 'profile' && (
                                <>
                                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <div style={{
                                                position: 'relative',
                                                width: '120px',
                                                height: '120px',
                                                borderRadius: '50%',
                                                overflow: 'hidden',
                                                border: '4px solid #1a1a1a'
                                            }}>
                                                <img
                                                    src={userAvatar}
                                                    alt="Profile"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        opacity: isUploading ? 0.3 : 1,
                                                        transition: 'opacity 0.3s ease'
                                                    }}
                                                />
                                                {isUploading && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}>
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                            style={{ width: '24px', height: '24px', border: '3px solid #ff4d4d', borderTopColor: 'transparent', borderRadius: '50%' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <label
                                                htmlFor="avatar-upload"
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '4px',
                                                    right: '4px',
                                                    background: '#ff4d4d',
                                                    padding: '8px',
                                                    borderRadius: '50%',
                                                    border: '4px solid #0a0a0a',
                                                    cursor: isUploading ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 4px 12px rgba(255, 77, 77, 0.4)'
                                                }}
                                            >
                                                <User size={18} color="white" />
                                                <input
                                                    id="avatar-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleAvatarChange}
                                                    disabled={isUploading}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>Full Name</label>
                                            <div style={{ position: 'relative' }}>
                                                <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                                                <input
                                                    type="text"
                                                    value={editData.name}
                                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                    style={{
                                                        width: '100%',
                                                        background: '#1a1a1a',
                                                        border: '1px solid #2a2a2a',
                                                        borderRadius: '16px',
                                                        padding: '16px 16px 16px 48px',
                                                        color: 'white',
                                                        fontSize: '1rem'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                                                <input
                                                    type="email"
                                                    value={userEmail}
                                                    disabled
                                                    style={{
                                                        width: '100%',
                                                        background: '#0d0d0d',
                                                        border: '1px solid #1a1a1a',
                                                        borderRadius: '16px',
                                                        padding: '16px 16px 16px 48px',
                                                        color: '#555',
                                                        fontSize: '1rem',
                                                        cursor: 'not-allowed'
                                                    }}
                                                />
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: '#444', marginTop: '8px', marginLeft: '4px' }}>Email cannot be changed contact support.</p>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>Phone Number</label>
                                            <div style={{ position: 'relative' }}>
                                                <Phone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                                                <input
                                                    type="tel"
                                                    value={editData.phone}
                                                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                                    style={{
                                                        width: '100%',
                                                        background: '#1a1a1a',
                                                        border: '1px solid #2a2a2a',
                                                        borderRadius: '16px',
                                                        padding: '16px 16px 16px 48px',
                                                        color: 'white',
                                                        fontSize: '1rem'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* PLAN CONTENT */}
                            {activeModal === 'plan' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
                                        borderRadius: '24px',
                                        padding: '24px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '50%',
                                            background: 'rgba(255, 215, 0, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 16px',
                                            color: '#ffd700'
                                        }}>
                                            <Crown size={30} />
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '4px' }}>{userPlan} Plan</h3>
                                        <p style={{ color: '#888', marginBottom: '20px' }}>Your subscription is active until Dec 2026</p>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: '12px',
                                            textAlign: 'left',
                                            background: 'rgba(255,255,255,0.02)',
                                            padding: '20px',
                                            borderRadius: '16px'
                                        }}>
                                            <div style={{ color: '#666', fontSize: '0.8rem' }}>Devices</div>
                                            <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>4 Devices</div>
                                            <div style={{ color: '#666', fontSize: '0.8rem' }}>Resolution</div>
                                            <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>4K + HDR</div>
                                            <div style={{ color: '#666', fontSize: '0.8rem' }}>Ad Support</div>
                                            <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>Ad Free</div>
                                        </div>
                                    </div>

                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        style={{
                                            width: '100%',
                                            padding: '18px',
                                            borderRadius: '16px',
                                            background: '#ff4d4d',
                                            color: 'white',
                                            border: 'none',
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            boxShadow: '0 8px 24px rgba(255, 77, 77, 0.3)'
                                        }}
                                        onClick={() => alert('Plan management coming soon!')}
                                    >
                                        Manage Subscription
                                    </motion.button>
                                </div>
                            )}

                            {/* NOTIFICATIONS CONTENT */}
                            {activeModal === 'notifications' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { key: 'newReleases', label: 'New Releases', sub: 'Get notified when new movies or shows are added.' },
                                        { key: 'promotions', label: 'Promotions', sub: 'Offers, discounts, and personalized recommendations.' },
                                        { key: 'updates', label: 'App Updates', sub: 'Important news about feature updates and maintenance.' }
                                    ].map(item => (
                                        <div key={item.key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '20px',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '16px',
                                            border: '1px solid rgba(255,255,255,0.02)'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px' }}>{item.label}</p>
                                                <p style={{ fontSize: '0.8rem', color: '#666' }}>{item.sub}</p>
                                            </div>
                                            <Toggle
                                                active={notificationSettings[item.key]}
                                                onToggle={() => handleNotificationToggle(item.key)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* LANGUAGE CONTENT */}
                            {activeModal === 'language' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {['English', 'Hindi (हिन्दी)', 'Bhojpuri (भोजपुरी)', 'Tamil (தமிழ்)', 'Telugu (తెలుగు)'].map(lang => (
                                        <div
                                            key={lang}
                                            onClick={() => handleLanguageSelect(lang.split(' ')[0])}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '20px',
                                                background: selectedLanguage === lang.split(' ')[0] ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255,255,255,0.03)',
                                                borderRadius: '16px',
                                                border: `1px solid ${selectedLanguage === lang.split(' ')[0] ? 'rgba(255, 77, 77, 0.2)' : 'rgba(255,255,255,0.02)'}`,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '1rem',
                                                fontWeight: selectedLanguage === lang.split(' ')[0] ? '700' : '500',
                                                color: selectedLanguage === lang.split(' ')[0] ? '#ff4d4d' : 'white'
                                            }}>
                                                {lang}
                                            </span>
                                            {selectedLanguage === lang.split(' ')[0] && <div style={{ width: '12px', height: '12px', background: '#ff4d4d', borderRadius: '50%' }} />}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* APPEARANCE CONTENT */}
                            {activeModal === 'appearance' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[
                                        { id: 'Dark Mode', icon: <Moon size={20} /> },
                                        { id: 'Light Mode', icon: <Save size={20} /> }, // Placeholder icon for light
                                        { id: 'System Settings', icon: <HelpCircle size={20} /> }
                                    ].map(theme => (
                                        <div
                                            key={theme.id}
                                            onClick={() => setCurrentTheme(theme.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px',
                                                padding: '20px',
                                                background: currentTheme === theme.id ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255,255,255,0.03)',
                                                borderRadius: '16px',
                                                border: `1px solid ${currentTheme === theme.id ? 'rgba(255, 77, 77, 0.2)' : 'rgba(255,255,255,0.02)'}`,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ color: currentTheme === theme.id ? '#ff4d4d' : '#888' }}>{theme.icon}</div>
                                            <span style={{
                                                fontSize: '1rem',
                                                fontWeight: currentTheme === theme.id ? '700' : '500',
                                                color: currentTheme === theme.id ? '#ff4d4d' : 'white'
                                            }}>{theme.id}</span>
                                        </div>
                                    ))}
                                    <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', marginTop: '12px' }}>
                                        Appearance settings will take effect immediately.
                                    </p>
                                </div>
                            )}

                            {/* HELP CENTER CONTENT */}
                            {activeModal === 'help' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{
                                        background: 'rgba(255, 77, 77, 0.05)',
                                        border: '1px solid rgba(255, 77, 77, 0.1)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '16px' }}>Need assistance? Our support team is here to help you 24/7.</p>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            style={{
                                                background: '#ff4d4d',
                                                color: 'white',
                                                border: 'none',
                                                padding: '12px 24px',
                                                borderRadius: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Chat Support
                                        </motion.button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '8px' }}>Frequently Asked Questions</h3>
                                        {[
                                            'How do I cancel my subscription?',
                                            'Can I watch offline?',
                                            'How to change my password?',
                                            'Devices supported by InPlay',
                                            'Reporting a playback issue'
                                        ].map((faq, i) => (
                                            <div key={i} style={{
                                                padding: '16px',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer'
                                            }}>
                                                <span style={{ fontSize: '0.9rem' }}>{faq}</span>
                                                <ChevronRight size={16} color="#444" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PRIVACY POLICY CONTENT */}
                            {activeModal === 'privacy' && (
                                <div style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    <h3 style={{ color: 'white', marginBottom: '16px' }}>Privacy Policy</h3>
                                    <p style={{ marginBottom: '16px' }}>Last updated: January 2026</p>
                                    <p style={{ marginBottom: '16px' }}>InPlay ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by InPlay.</p>
                                    <h4 style={{ color: 'white', marginBottom: '8px' }}>1. Information We Collect</h4>
                                    <p style={{ marginBottom: '16px' }}>We collect information you provide directly to us, such as when you create an account, subscribe to our service, or communicate with us.</p>
                                    <h4 style={{ color: 'white', marginBottom: '8px' }}>2. How We Use Information</h4>
                                    <p style={{ marginBottom: '16px' }}>We use the information we collect to provide, maintain, and improve our services, develop new ones, and protect InPlay and our users.</p>
                                    <h4 style={{ color: 'white', marginBottom: '8px' }}>3. Data Security</h4>
                                    <p style={{ marginBottom: '16px' }}>We use reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
                                    <p>By using InPlay, you agree to the collection and use of information in accordance with this policy.</p>
                                </div>
                            )}

                            {/* ABOUT CONTENT */}
                            {activeModal === 'about' && (
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
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>InPlay</h3>
                                    <p style={{ color: '#666', marginBottom: '32px' }}>Version 2.4.0 (Stable Build)</p>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '16px',
                                        padding: '24px',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '16px'
                                    }}>
                                        <p style={{ color: '#888', fontSize: '0.9rem' }}>InPlay is the next generation streaming platform bringing you the best in movies, shows, and originals with an unmatched user experience.</p>
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#555' }}>Website</span>
                                            <span style={{ color: '#ff4d4d' }}>www.inplay.com</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#555' }}>Twitter</span>
                                            <span style={{ color: '#ff4d4d' }}>@InPlayHQ</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#555' }}>Instagram</span>
                                            <span style={{ color: '#ff4d4d' }}>@inplay_official</span>
                                        </div>
                                    </div>
                                    <p style={{ color: '#333', fontSize: '0.75rem', marginTop: '40px' }}>&copy; 2026 InPlay Entertainment Records Inc.<br />All rights reserved.</p>
                                </div>
                            )}

                            {/* Message Toast */}
                            {message.text && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        marginTop: '32px',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        fontSize: '0.9rem',
                                        background: message.type === 'success' ? 'rgba(70, 211, 105, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                                        color: message.type === 'success' ? '#46d369' : '#ff4d4d',
                                        border: `1px solid ${message.type === 'success' ? 'rgba(70, 211, 105, 0.2)' : 'rgba(255, 77, 77, 0.2)'}`
                                    }}
                                >
                                    {message.text}
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ textAlign: 'center', padding: '24px', color: '#333', fontSize: '0.8rem' }}>
                InPlay Version 2.4.0
            </div>
        </div>
    );
}
