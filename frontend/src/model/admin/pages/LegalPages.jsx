import { useState, useEffect } from 'react';
import appSettingsService from '../../../services/api/appSettingsService';
import { Save, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function LegalPages() {
    const [settings, setSettings] = useState({
        helpCenter: {
            chatSupportText: '',
            faqs: []
        },
        privacyPolicy: {
            content: '',
            lastUpdated: new Date()
        },
        aboutInPlay: {
            description: '',
            version: '',
            website: '',
            twitter: '',
            instagram: ''
        }
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState('help');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const data = await appSettingsService.getSettings();
            if (data) {
                setSettings(data);
            }
        } catch (err) {
            console.error("Failed to fetch settings", err);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setMessage({ type: '', text: '' });
            await appSettingsService.updateSettings(settings);
            setMessage({ type: 'success', text: 'Settings updated successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error("Failed to update settings", err);
            setMessage({ type: 'error', text: err.message || 'Failed to update settings' });
        } finally {
            setIsSaving(false);
        }
    };

    const addFaq = () => {
        setSettings({
            ...settings,
            helpCenter: {
                ...settings.helpCenter,
                faqs: [...settings.helpCenter.faqs, { question: '', answer: '' }]
            }
        });
    };

    const removeFaq = (index) => {
        const newFaqs = [...settings.helpCenter.faqs];
        newFaqs.splice(index, 1);
        setSettings({
            ...settings,
            helpCenter: {
                ...settings.helpCenter,
                faqs: newFaqs
            }
        });
    };

    const updateFaq = (index, field, value) => {
        const newFaqs = [...settings.helpCenter.faqs];
        newFaqs[index][field] = value;
        setSettings({
            ...settings,
            helpCenter: {
                ...settings.helpCenter,
                faqs: newFaqs
            }
        });
    };

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Legal Content...</div>;
    }

    const tabs = [
        { id: 'help', label: 'Help Center' },
        { id: 'privacy', label: 'Privacy Policy' },
        { id: 'about', label: 'About InPlay' }
    ];

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Legal & Help Content</h1>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Manage help center, privacy policy and about information</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#46d369',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        opacity: isSaving ? 0.7 : 1
                    }}
                >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message.text && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: message.type === 'success' ? '#def7ec' : '#fde8e8',
                    color: message.type === 'success' ? '#03543f' : '#9b1c1c',
                    border: `1px solid ${message.type === 'success' ? '#31c48d' : '#f8b4b4'}`
                }}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '12px 24px',
                            border: 'none',
                            background: 'none',
                            fontSize: '1rem',
                            fontWeight: activeTab === tab.id ? '700' : '500',
                            color: activeTab === tab.id ? '#46d369' : '#6b7280',
                            borderBottom: activeTab === tab.id ? '2px solid #46d369' : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>

                {/* HELP CENTER */}
                {activeTab === 'help' && (
                    <div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Chat Support Description</label>
                            <input
                                type="text"
                                value={settings.helpCenter.chatSupportText}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    helpCenter: { ...settings.helpCenter, chatSupportText: e.target.value }
                                })}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                placeholder="e.g. Need assistance? Our support team is here to help you 24/7."
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontWeight: '700' }}>Frequently Asked Questions</h3>
                            <button
                                onClick={addFaq}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#46d369', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                            >
                                <Plus size={18} /> Add FAQ
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {settings.helpCenter.faqs.map((faq, index) => (
                                <div key={index} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', position: 'relative' }}>
                                    <button
                                        onClick={() => removeFaq(index)}
                                        style={{ position: 'absolute', top: '12px', right: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>Question</label>
                                        <input
                                            type="text"
                                            value={faq.question}
                                            onChange={(e) => updateFaq(index, 'question', e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>Answer</label>
                                        <textarea
                                            value={faq.answer}
                                            onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', minHeight: '80px', resize: 'vertical' }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {settings.helpCenter.faqs.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
                                    No FAQs added yet. Click "Add FAQ" to start.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PRIVACY POLICY */}
                {activeTab === 'privacy' && (
                    <div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Last Updated Date</label>
                            <input
                                type="date"
                                value={settings.privacyPolicy.lastUpdated ? new Date(settings.privacyPolicy.lastUpdated).toISOString().split('T')[0] : ''}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    privacyPolicy: { ...settings.privacyPolicy, lastUpdated: new Date(e.target.value) }
                                })}
                                style={{ width: '200px', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Policy Content (Plain Text or HTML)</label>
                            <textarea
                                value={settings.privacyPolicy.content}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    privacyPolicy: { ...settings.privacyPolicy, content: e.target.value }
                                })}
                                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '400px', fontSize: '0.95rem', lineHeight: '1.6', resize: 'vertical' }}
                                placeholder="Enter policy content here..."
                            />
                        </div>
                    </div>
                )}

                {/* ABOUT INPLAY */}
                {activeTab === 'about' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Description</label>
                            <textarea
                                value={settings.aboutInPlay.description}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    aboutInPlay: { ...settings.aboutInPlay, description: e.target.value }
                                })}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '100px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>App Version</label>
                                <input
                                    type="text"
                                    value={settings.aboutInPlay.version}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        aboutInPlay: { ...settings.aboutInPlay, version: e.target.value }
                                    })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Website URL</label>
                                <input
                                    type="text"
                                    value={settings.aboutInPlay.website}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        aboutInPlay: { ...settings.aboutInPlay, website: e.target.value }
                                    })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Twitter Handle</label>
                                <input
                                    type="text"
                                    value={settings.aboutInPlay.twitter}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        aboutInPlay: { ...settings.aboutInPlay, twitter: e.target.value }
                                    })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Instagram Handle</label>
                                <input
                                    type="text"
                                    value={settings.aboutInPlay.instagram}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        aboutInPlay: { ...settings.aboutInPlay, instagram: e.target.value }
                                    })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
