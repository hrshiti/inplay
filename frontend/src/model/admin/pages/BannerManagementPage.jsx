import React, { useState, useEffect } from 'react';
import { Plus, Trash, GripVertical, Check, X, Image as ImageIcon, Film } from 'lucide-react';
import bannerService from '../../../services/api/bannerService';
import contentService from '../../../services/api/contentService';
import { getImageUrl } from '../../../utils/imageUtils';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api') ? rawApiUrl.replace(/\/$/, '') : `${rawApiUrl.replace(/\/$/, '')}/api`;

export default function BannerManagementPage() {
    const [activeTab, setActiveTab] = useState('drama'); // drama, cinema, bhojpuri
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showAddBanner, setShowAddBanner] = useState(false);
    const [newBanner, setNewBanner] = useState({ mediaType: 'image', file: null, order: 0, isActive: true, contentId: '' });
    const [uploading, setUploading] = useState(false);
    
    const [allContent, setAllContent] = useState([]);

    useEffect(() => {
        fetchBanners();
        fetchAllContent();
    }, [activeTab]);

    const fetchAllContent = async () => {
        try {
            const [data, quickBites] = await Promise.all([
                contentService.getAllContent(),
                contentService.getQuickBytes(500)
            ]);
            
            const formattedQuickBites = (quickBites || []).map(qb => ({
                ...qb,
                title: `[Quick Bite] ${qb.title}`
            }));
            
            setAllContent([...(data || []), ...formattedQuickBites]);
        } catch (error) {
            console.error("Failed to fetch content", error);
            setAllContent([]);
        }
    };

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const data = await bannerService.getAllBanners(activeTab);
            setBanners(data);
        } catch (error) {
            console.error("Failed to fetch banners:", error);
        } finally {
            setLoading(false);
        }
    };

    const uploadFile = async (file) => {
        const token = localStorage.getItem('adminToken');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'banner');
        
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.data.url;
    };

    const handleCreateBanner = async () => {
        if (!newBanner.file) {
            alert("Please select a file to upload.");
            return;
        }
        setUploading(true);
        try {
            const mediaUrl = await uploadFile(newBanner.file);
            await bannerService.createBanner({
                category: activeTab,
                mediaType: newBanner.mediaType,
                mediaUrl,
                isActive: newBanner.isActive,
                order: newBanner.order,
                contentId: newBanner.contentId || null
            });
            setShowAddBanner(false);
            setNewBanner({ mediaType: 'image', file: null, order: banners.length, isActive: true, contentId: '' });
            fetchBanners();
        } catch (error) {
            alert("Failed to create banner: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteBanner = async (id) => {
        if (!window.confirm("Are you sure you want to delete this banner?")) return;
        try {
            await bannerService.deleteBanner(id);
            fetchBanners();
        } catch (error) {
            alert("Failed to delete banner");
        }
    };

    const handleToggleActive = async (banner) => {
        try {
            await bannerService.updateBanner(banner._id, { isActive: !banner.isActive });
            fetchBanners();
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleUpdateOrder = async (id, newOrder) => {
        try {
            await bannerService.updateBanner(id, { order: newOrder });
            // Let the UI stay without refetch to prevent focus loss, 
            // or we could optimistically update local state if needed.
        } catch (error) {
            console.error("Failed to update order:", error);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Banner Management</h1>
                    <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>Manage homepage hero banners</p>
                </div>
                <button
                    onClick={() => setShowAddBanner(true)}
                    style={{ background: '#46d369', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} /> Add Banner
                </button>
            </div>

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                {[
                    { id: 'drama', label: 'InPlay Drama' },
                    { id: 'cinema', label: 'InPlay Cinema' },
                    { id: 'bhojpuri', label: 'InPlay Bhojpuri' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setShowAddBanner(false); }}
                        style={{
                            padding: '8px 16px',
                            background: activeTab === tab.id ? '#1e293b' : '#f1f5f9',
                            color: activeTab === tab.id ? 'white' : '#475569',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {showAddBanner && (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '16px', fontWeight: 'bold' }}>New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Banner</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 80px auto auto', gap: '16px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>Type</label>
                            <select 
                                value={newBanner.mediaType}
                                onChange={e => setNewBanner({...newBanner, mediaType: e.target.value})}
                                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            >
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>File</label>
                            <input
                                type="file"
                                accept={newBanner.mediaType === 'image' ? 'image/*' : 'video/mp4,video/quicktime'}
                                onChange={(e) => setNewBanner({ ...newBanner, file: e.target.files[0] })}
                                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>Link to Content (Optional)</label>
                            <select 
                                value={newBanner.contentId}
                                onChange={e => setNewBanner({...newBanner, contentId: e.target.value})}
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            >
                                <option value="">-- None --</option>
                                {(allContent || []).map(c => (
                                    <option key={c._id || c.id} value={c._id || c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>Order</label>
                            <input
                                type="number"
                                value={newBanner.order}
                                onChange={(e) => setNewBanner({ ...newBanner, order: Number(e.target.value) })}
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                            <input 
                                type="checkbox" 
                                checked={newBanner.isActive} 
                                onChange={(e) => setNewBanner({ ...newBanner, isActive: e.target.checked })}
                                style={{ width: '16px', height: '16px' }}
                            />
                            <label style={{ fontSize: '0.9rem', color: '#475569' }}>Active</label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button disabled={uploading} onClick={handleCreateBanner} style={{ background: uploading ? '#9ca3af' : '#46d369', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer' }}>
                                {uploading ? '...' : <Check size={18} />}
                            </button>
                            <button disabled={uploading} onClick={() => setShowAddBanner(false)} style={{ background: '#ef4444', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer' }}><X size={18} /></button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '20px' }}>Loading banners...</div>
            ) : banners.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    No banners found for {activeTab}. Existing content posters will be used as a fallback.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {banners.map((banner) => (
                        <div key={banner._id} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white' }}>
                            <GripVertical size={20} color="#94a3b8" />
                            
                            <div style={{ width: '160px', height: '90px', background: '#0f172a', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                {banner.mediaType === 'image' ? (
                                    <img src={getImageUrl(banner.mediaUrl)} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <>
                                        <video src={getImageUrl(banner.mediaUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '4px', color: 'white' }}>
                                            <Film size={14} />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <span style={{ 
                                        padding: '2px 8px', 
                                        borderRadius: '12px', 
                                        fontSize: '0.75rem', 
                                        background: banner.mediaType === 'image' ? '#e0e7ff' : '#fce7f3',
                                        color: banner.mediaType === 'image' ? '#4f46e5' : '#db2777',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        {banner.mediaType === 'image' ? <ImageIcon size={12}/> : <Film size={12}/>}
                                        {banner.mediaType.toUpperCase()}
                                    </span>
                                    {banner.mediaType === 'video' && banner.hlsUrl && (
                                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', background: '#dcfce7', color: '#166534' }}>HLS Ready</span>
                                    )}
                                    {banner.mediaType === 'video' && !banner.hlsUrl && (
                                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', background: '#fef3c7', color: '#b45309' }}>Processing HLS...</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', wordBreak: 'break-all' }}>
                                    {banner.mediaUrl}
                                </div>
                                {banner.contentId && (
                                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#46d369', fontWeight: '500' }}>
                                        Linked to: {banner.contentId.title}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Order</label>
                                    <input 
                                        type="number" 
                                        defaultValue={banner.order || 0} 
                                        onBlur={(e) => {
                                            const newOrder = Number(e.target.value);
                                            if (newOrder !== (banner.order || 0)) {
                                                handleUpdateOrder(banner._id, newOrder).then(() => fetchBanners());
                                            }
                                        }}
                                        style={{ width: '60px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center' }} 
                                    />
                                </div>
                                
                                <span style={{ 
                                    padding: '6px 12px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.85rem', 
                                    background: banner.isActive ? '#dcfce7' : '#f1f5f9',
                                    color: banner.isActive ? '#166534' : '#64748b',
                                    cursor: 'pointer',
                                    border: '1px solid transparent',
                                    borderColor: banner.isActive ? '#bbf7d0' : '#e2e8f0'
                                }} onClick={() => handleToggleActive(banner)}>
                                    {banner.isActive ? 'Active' : 'Inactive'}
                                </span>

                                <button onClick={() => handleDeleteBanner(banner._id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}>
                                    <Trash size={20} />
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
