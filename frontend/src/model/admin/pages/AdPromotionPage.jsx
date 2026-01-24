import { useState, useEffect } from 'react';
import { Upload, X, Trash2, Edit, Plus, Save, Loader } from 'lucide-react';
import promotionService from '../../../services/api/promotionService';
import uploadService from '../../../services/api/uploadService';
import { getImageUrl } from '../../../utils/imageUtils';

const AdPromotionPage = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list', 'add', 'edit'
    const [selectedPromotion, setSelectedPromotion] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        posterImageUrl: '',
        promoVideoUrl: '',
        displayLocation: 'both',
        isActive: true
    });
    const [saving, setSaving] = useState(false);
    const [uploadingPoster, setUploadingPoster] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const data = await promotionService.getAllPromotions();
            setPromotions(data);
        } catch (error) {
            console.error('Failed to fetch promotions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            if (type === 'poster') setUploadingPoster(true);
            else setUploadingVideo(true);

            // Use 'poster' type for image, 'video' isn't explicitly in backend but 'audio' is. 
            // Backend maps types. user expects video. Backend upload logic supports 'image' default.
            // Let's pass 'poster' for image. For video, let's try passing 'video' if supported or just default?
            // Backend `uploadRoutes.js`: 
            // const type = req.body.type || 'image'; 
            // presetType maps: 'poster' -> 'poster'. 
            // If I send 'video', it might default to 'poster' preset if not mapped? 
            // Wait, backend `uploadRoutes.js` lines 26-30:
            // let presetType = 'poster'; // default
            // if (type === 'audio') presetType = 'audio';
            // ...
            // So if I send 'video', it uses 'poster' preset. Cloudinary handles video if allowed in preset.
            // Ideally should have 'video' preset. Assuming 'poster' preset allows video or 'auto'.

            const uploadType = type === 'poster' ? 'poster' : 'video'; // Pass distinct type just in case backend gets updated

            // Actually, frontend `uploadService` sends `type`.

            const result = await uploadService.uploadFile(file, uploadType);

            if (type === 'poster') {
                setFormData(prev => ({ ...prev, posterImageUrl: result.data.url }));
            } else {
                setFormData(prev => ({ ...prev, promoVideoUrl: result.data.url }));
            }

        } catch (error) {
            console.error(`Failed to upload ${type}`, error);
            alert(`Failed to upload ${type}`);
        } finally {
            if (type === 'poster') setUploadingPoster(false);
            else setUploadingVideo(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.posterImageUrl) {
            alert('Please upload a poster image');
            return;
        }

        setSaving(true);
        try {
            if (viewMode === 'edit' && selectedPromotion) {
                await promotionService.updatePromotion(selectedPromotion._id, formData);
                alert('Promotion updated successfully');
            } else {
                await promotionService.createPromotion(formData);
                alert('Promotion created successfully');
            }
            setViewMode('list');
            fetchPromotions();
        } catch (error) {
            console.error('Failed to save promotion', error);
            alert('Failed to save promotion');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (promo) => {
        setSelectedPromotion(promo);
        setFormData({
            title: promo.title,
            posterImageUrl: promo.posterImageUrl,
            promoVideoUrl: promo.promoVideoUrl,
            displayLocation: promo.displayLocation,
            isActive: promo.isActive
        });
        setViewMode('edit');
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this promotion?')) {
            try {
                await promotionService.deletePromotion(id);
                fetchPromotions();
            } catch (error) {
                console.error('Failed to delete promotion', error);
                alert('Failed to delete promotion');
            }
        }
    };

    const handleAddNew = () => {
        setFormData({
            title: '',
            posterImageUrl: '',
            promoVideoUrl: '',
            displayLocation: 'both',
            isActive: true
        });
        setSelectedPromotion(null);
        setViewMode('add');
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Ad and Promotion</h1>
                    <p style={{ color: '#6b7280', marginTop: '4px' }}>Manage advertisements and promotional content</p>
                </div>
                {viewMode === 'list' && (
                    <button
                        onClick={handleAddNew}
                        style={{
                            background: '#46d369',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Plus size={18} /> Add New Promotion
                    </button>
                )}
            </div>

            {viewMode === 'list' ? (
                loading ? (
                    <div>Loading...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                        {promotions.map(promo => (
                            <div key={promo._id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', position: 'relative' }}>
                                <div style={{ height: '160px', overflow: 'hidden', position: 'relative', background: '#000' }}>
                                    {promo.posterImageUrl && (
                                        <img src={getImageUrl(promo.posterImageUrl)} alt={promo.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: promo.promoVideoUrl ? 0.7 : 1 }} />
                                    )}
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: promo.isActive ? '#059669' : '#dc2626', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', zIndex: 10 }}>
                                        {promo.isActive ? 'Active' : 'Inactive'}
                                    </div>
                                    {promo.promoVideoUrl && (
                                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}> Video Ad </div>
                                    )}
                                </div>
                                <div style={{ padding: '16px' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>{promo.title}</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '4px' }}>Location: <span style={{ fontWeight: '600' }}>{promo.displayLocation}</span></p>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                        <button onClick={() => handleEdit(promo)} style={{ background: 'transparent', border: 'none', color: '#4b5563', cursor: 'pointer' }}><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(promo._id)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto', color: '#000' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{viewMode === 'add' ? 'Add Promotion' : 'Edit Promotion'}</h2>
                        <button onClick={() => setViewMode('list')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Upload Poster Image</label>
                            <div style={{ border: '2px dashed #d1d5db', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                                {formData.posterImageUrl ? (
                                    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                                        <img src={getImageUrl(formData.posterImageUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFormData({ ...formData, posterImageUrl: '' });
                                            }}
                                            style={{ position: 'absolute', top: 5, right: 5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {uploadingPoster ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#666' }}>
                                                <Loader className="animate-spin" size={24} />
                                                <span style={{ marginTop: '8px' }}>Uploading...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={24} style={{ color: '#9ca3af', marginBottom: '8px' }} />
                                                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Click to upload poster</p>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'poster')} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Upload Promo Video (Optional)</label>
                            <div style={{ border: '2px dashed #d1d5db', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                                {formData.promoVideoUrl ? (
                                    <div style={{ position: 'relative', width: '100%', padding: '20px', background: '#f9fafb' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: '600' }}>Video Uploaded</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFormData({ ...formData, promoVideoUrl: '' });
                                                }}
                                                style={{ background: 'red', color: 'white', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px', wordBreak: 'break-all' }}>{formData.promoVideoUrl}</p>
                                    </div>
                                ) : (
                                    <>
                                        {uploadingVideo ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#666' }}>
                                                <Loader className="animate-spin" size={24} />
                                                <span style={{ marginTop: '8px' }}>Uploading...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={24} style={{ color: '#9ca3af', marginBottom: '8px' }} />
                                                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Click to upload video</p>
                                                <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Display Location</label>
                            <select
                                name="displayLocation"
                                value={formData.displayLocation}
                                onChange={handleInputChange}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                            >
                                <option value="home">Home Page</option>
                                <option value="popular">Popular Page</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                Active
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || uploadingPoster || uploadingVideo}
                                style={{ flex: 1, padding: '12px', background: '#46d369', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: (saving || uploadingPoster || uploadingVideo) ? 'not-allowed' : 'pointer' }}
                            >
                                {saving ? 'Saving...' : 'Save Promotion'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdPromotionPage;
