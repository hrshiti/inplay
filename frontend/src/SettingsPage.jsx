import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon, Globe, Info, Crown, Mail, Phone, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from './services/api/authService';
import appSettingsService from './services/api/appSettingsService';
import { getImageUrl } from './utils/imageUtils';
import subscriptionService from './services/api/subscriptionService';
import { trackProfileUpdated, trackSubscriptionCancelled } from './utils/analytics';

export default function SettingsPage({ onLogout, currentUser, onUpdateUser, embedded = false }) {
    const navigate = useNavigate();
    const [activeModal, setActiveModal] = useState(null); // 'profile', 'plan', 'notifications', 'language', 'appearance'
    const [avatarError, setAvatarError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [editData, setEditData] = useState({
        name: '',
        email: '',
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
    const [appSettings, setAppSettings] = useState(null);
    const [subDetails, setSubDetails] = useState(null);
    const [isLoadingSub, setIsLoadingSub] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await appSettingsService.getSettings();
                setAppSettings(data);
            } catch (err) {
                console.error("Failed to fetch app settings:", err);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeModal === 'plan') {
            fetchSubStatus();
        }
    }, [activeModal]);

    const fetchSubStatus = async () => {
        setIsLoadingSub(true);
        try {
            const data = await subscriptionService.getSubscriptionStatus();
            setSubDetails(data);
        } catch (err) {
            console.error("Failed to fetch sub status:", err);
        } finally {
            setIsLoadingSub(false);
        }
    };

    const handleCancelSub = async () => {
        if (!confirm("Are you sure? Your subscription will be cancelled IMMEDIATELY and you will lose access to all premium content. You will need to subscribe again to watch videos.")) return;

        setIsSaving(true);
        try {
            await subscriptionService.cancelSubscription();
            trackSubscriptionCancelled();
            setMessage({ text: 'Subscription cancelled! Access revoked.', type: 'success' });

            // Refresh detailed sub status for the modal
            fetchSubStatus();

            // CRITICAL: Refresh the full user profile to update the main settings list and global app state
            const updatedUser = await authService.getProfile();

            // Force local state to inactive so App.jsx redirects immediately
            if (updatedUser && updatedUser.subscription) {
                updatedUser.subscription.isActive = false;
                updatedUser.subscription.status = 'cancelled';
            }

            if (onUpdateUser) onUpdateUser(updatedUser);

            // Close modal after a short delay
            setTimeout(() => {
                setActiveModal(null);
                navigate('/plan'); // Redirect to plans since they no longer have access
            }, 2000);

        } catch (err) {
            setMessage({ text: err.message || 'Failed to cancel subscription', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to delete your account? This action is permanent and all your data will be lost from our servers. You will need to register again to use InPlay.")) {
            return;
        }

        setIsSaving(true);
        try {
            await authService.deleteAccount();
            onLogout();
            navigate('/');
        } catch (err) {
            console.error("Failed to delete account:", err);
            setMessage({ text: err.message || 'Failed to delete account', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            setEditData({
                name: currentUser.name || '',
                email: currentUser.email || '',
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

    // Use actual user data or neutral fallbacks when logged out
    const userName = currentUser?.name || 'Guest';
    const userEmail = currentUser?.email || '';
    const userAvatar = currentUser?.avatar; // No fallback to mock

    // Improved plan display logic
    const userPlan = currentUser?.subscription?.isActive
        ? (currentUser.subscription.status === 'cancelled'
            ? `${currentUser.subscription.plan?.name || 'Premium'} (Cancelled)`
            : (currentUser.subscription.plan?.name || 'Premium Plan'))
        : 'No Active Plan';

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const updatedUser = await authService.updateProfile(editData);
            trackProfileUpdated();
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
                { id: 'plan', icon: <Crown size={20} />, label: 'Subscription', value: userPlan, action: () => setActiveModal('plan') },
            ].filter(item => {
                if (item.id === 'plan') {
                    const hiddenNumbers = ['6268204871', '6268455485'];
                    return !hiddenNumbers.includes(currentUser?.phone);
                }
                return true;
            })
        },
        {
            title: 'Support & Legal',
            items: [
                { id: 'help', icon: <HelpCircle size={20} />, label: 'Help Center', action: () => navigate('/help') },
                { id: 'privacy', icon: <Shield size={20} />, label: 'Privacy Policy', action: () => navigate('/privacy') },
                { id: 'about', icon: <Info size={20} />, label: 'About InPlay', action: () => navigate('/about') },
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
            minHeight: embedded ? 'auto' : '100vh',
            background: embedded ? 'transparent' : '#000',
            color: 'white',
            paddingBottom: embedded ? '20px' : '100px',
            marginTop: embedded ? '24px' : '0'
        }}>
            {/* Header */}
            {!embedded && (
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
            )}

            {/* Profile Brief */}
            {!embedded && (
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
                        {userAvatar && !avatarError ? (
                            <img
                                src={getImageUrl(userAvatar)}
                                alt="Profile"
                                onError={() => setAvatarError(true)}
                                style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid #ff0000', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '50%',
                                border: '2px solid #ff0000',
                                background: '#ff0a16',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <User size={34} color="white" />
                            </div>
                        )}
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>{userName}</h3>
                            <span style={{ fontSize: '0.9rem', color: '#888' }}>{userEmail}</span>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ padding: embedded ? '0' : '0 20px 20px' }}>
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

                <div style={{ padding: embedded ? '20px 0 0' : '0 24px 40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={onLogout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            padding: '18px',
                            background: '#ff4d4d',
                            border: 'none',
                            borderRadius: '16px',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 8px 16px rgba(255, 77, 77, 0.2)'
                        }}
                    >
                        <LogOut size={20} />
                        Log Out
                    </button>

                    <button
                        onClick={handleDeleteAccount}
                        disabled={isSaving}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            padding: '16px',
                            background: 'rgba(255, 77, 77, 0.05)',
                            border: '1px solid rgba(255, 77, 77, 0.3)',
                            borderRadius: '16px',
                            color: '#ff4d4d',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginTop: '12px'
                        }}
                    >
                        Delete Account Permanently
                    </button>
                </div>
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
                                                {userAvatar && !avatarError ? (
                                                    <img
                                                        src={getImageUrl(userAvatar)}
                                                        alt="Profile"
                                                        onError={() => setAvatarError(true)}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            opacity: isUploading ? 0.3 : 1,
                                                            transition: 'opacity 0.3s ease'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        background: '#ff0a16',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        opacity: isUploading ? 0.3 : 1,
                                                        transition: 'opacity 0.3s ease'
                                                    }}>
                                                        <User size={60} color="white" />
                                                    </div>
                                                )}
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
                                                    value={editData.email}
                                                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
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
                                    {isLoadingSub ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                style={{ width: '30px', height: '30px', border: '3px solid #ff4d4d', borderTopColor: 'transparent', borderRadius: '50%' }}
                                            />
                                        </div>
                                    ) : (subDetails?.isActive && subDetails?.status !== 'cancelled') ? (
                                        <div style={{
                                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
                                            borderRadius: '24px',
                                            padding: '24px',
                                            border: '1px solid rgba(255,255,255,0.1)',
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
                                            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '4px' }}>{subDetails.planName}</h3>
                                            <p style={{ color: '#888', marginBottom: '20px' }}>
                                                {subDetails.isTrial ? 'Trial active' : 'Subscription active'} • ₹{subDetails.price}
                                            </p>

                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '12px',
                                                textAlign: 'left',
                                                background: 'rgba(255,255,255,0.02)',
                                                padding: '20px',
                                                borderRadius: '16px',
                                                marginBottom: '20px'
                                            }}>
                                                <div style={{ color: '#666', fontSize: '0.8rem' }}>Started on</div>
                                                <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>{new Date(subDetails.startDate).toLocaleDateString()}</div>
                                                <div style={{ color: '#666', fontSize: '0.8rem' }}>Next Billing / Expiry</div>
                                                <div style={{ fontSize: '0.9rem', textAlign: 'right', color: '#ff4d4d', fontWeight: 'bold' }}>{new Date(subDetails.endDate).toLocaleDateString()}</div>
                                            </div>

                                            <p style={{ fontSize: '0.75rem', color: '#555', marginBottom: '16px' }}>ID: {subDetails.razorpaySubscriptionId}</p>

                                            {subDetails.status === 'cancelled' ? (
                                                <div style={{
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(255, 77, 77, 0.1)',
                                                    color: '#ff4d4d',
                                                    border: '1px solid rgba(255, 77, 77, 0.2)',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    textAlign: 'center'
                                                }}>
                                                    Subscription Cancelled
                                                </div>
                                            ) : (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={handleCancelSub}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        background: 'transparent',
                                                        color: '#ff4d4d',
                                                        border: '1px solid rgba(255, 77, 77, 0.3)',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Cancel Subscription
                                                </motion.button>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{
                                            background: '#111',
                                            borderRadius: '24px',
                                            padding: '40px 24px',
                                            textAlign: 'center',
                                            border: '1px dashed #333'
                                        }}>
                                            <div style={{ color: '#444', marginBottom: '16px' }}>
                                                <Crown size={48} opacity={0.2} />
                                            </div>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>No Active Plan</h3>
                                            <p style={{ color: '#666', marginBottom: '24px', fontSize: '0.9rem' }}>Subscribe to access premium content and offline downloads.</p>

                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    setActiveModal(null);
                                                    navigate('/plan');
                                                }}
                                                style={{
                                                    padding: '12px 32px',
                                                    borderRadius: '30px',
                                                    background: '#ff4d4d',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                View Plans
                                            </motion.button>
                                        </div>
                                    )}

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
