import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mic, Play, X, Upload, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { getImageUrl } from '../../../../utils/imageUtils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// --- API Service ---
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
const BASE_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api')
    ? rawApiUrl.replace(/\/$/, '')
    : `${rawApiUrl.replace(/\/$/, '')}/api`;
const API_URL = `${BASE_URL}/audio-series`;

const AudioSeriesPage = () => {
    const [seriesList, setSeriesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentSeries, setCurrentSeries] = useState(null);

    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    // Determine view mode based on URL
    const isAddMode = location.pathname.endsWith('/add');
    const isEditMode = !!id;
    const isFormView = isAddMode || isEditMode;

    // Fetch Series List (Only if in list view and empty)
    useEffect(() => {
        if (!isFormView) {
            fetchSeries();
            setCurrentSeries(null); // Clear selected series when returning to list
        }
    }, [isFormView]);

    // Fetch Single Series (If in edit mode)
    useEffect(() => {
        if (isEditMode && id) {
            fetchSingleSeries(id);
        } else if (isAddMode) {
            setCurrentSeries(null); // Ensure clean state for new
            setLoading(false);
        }
    }, [isEditMode, isAddMode, id]);

    const fetchSeries = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(API_URL, config);
            setSeriesList(res.data.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching audio series:", error);
            setLoading(false);
        }
    };

    const fetchSingleSeries = async (seriesId) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${API_URL}/${seriesId}`, config);
            // API usually returns { data: object } or just object
            setCurrentSeries(res.data.data || res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching single series:", error);
            alert("Failed to load series details");
            navigate('/admin/audio-series');
            setLoading(false);
        }
    };

    const handleDelete = async (deleteId) => {
        if (!window.confirm("Are you sure you want to delete this series?")) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`${API_URL}/${deleteId}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchSeries();
        } catch (error) {
            console.error("Error deleting audio series:", error);
        }
    };

    const handleEdit = (series) => {
        navigate(`/admin/audio-series/edit/${series._id}`);
    };

    const handleAddNew = () => {
        navigate('/admin/audio-series/add');
    };

    const handleFormSave = () => {
        navigate('/admin/audio-series');
    };

    const handleFormCancel = () => {
        navigate('/admin/audio-series');
    };

    if (isFormView) {
        if (loading && isEditMode && !currentSeries) {
            return <div style={{ padding: '24px' }}>Loading series details...</div>;
        }

        return (
            <AudioSeriesForm
                seriesData={currentSeries}
                onSave={handleFormSave}
                onCancel={handleFormCancel}
            />
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Audio Series Library</h1>
                <button
                    onClick={handleAddNew}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        backgroundColor: '#46d369', color: 'white',
                        padding: '10px 20px', borderRadius: '8px', border: 'none',
                        fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer'
                    }}
                >
                    <Plus size={20} />
                    Add New Series
                </button>
            </div>

            {loading ? (
                <div style={{ color: '#aaa', padding: '20px' }}>Loading...</div>
            ) : seriesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666', background: '#f9f9f9', borderRadius: '12px' }}>
                    <Mic size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <h3>No Audio Series Found</h3>
                    <p>Start by creating your first audio series.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {seriesList.map((series) => (
                        <div key={series._id} style={{
                            background: 'white', borderRadius: '12px', overflow: 'hidden',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee'
                        }}>
                            <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                                <img
                                    src={getImageUrl(series.coverImage) || 'https://placehold.co/600x400?text=Audio+Series'}
                                    alt={series.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => e.target.src = 'https://placehold.co/600x400?text=Audio+Series'}
                                />
                                <div style={{
                                    position: 'absolute', top: '10px', right: '10px',
                                    background: 'rgba(0,0,0,0.7)', color: 'white',
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'
                                }}>
                                    {series.episodes?.length || 0} Episodes
                                </div>
                            </div>
                            <div style={{ padding: '16px' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '6px' }}>{series.title}</h3>
                                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '16px', height: '40px', overflow: 'hidden' }}>
                                    {series.description}
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleEdit(series)}
                                        style={{
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            padding: '8px', border: '1px solid #ddd', borderRadius: '6px',
                                            background: 'white', color: '#333', cursor: 'pointer'
                                        }}
                                    >
                                        <Edit2 size={16} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(series._id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '8px', border: '1px solid #fee2e2', borderRadius: '6px',
                                            background: '#fef2f2', color: '#ef4444', cursor: 'pointer'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- Internal Sub-Component: Form ---
const AudioSeriesForm = ({ seriesData, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        title: seriesData?.title || '',
        description: seriesData?.description || '',
        coverImage: seriesData?.coverImage || '',
        episodes: seriesData?.episodes || []
    });

    // Reset form when seriesData changes (important for switching between add/edit or different items)
    useEffect(() => {
        setFormData({
            title: seriesData?.title || '',
            description: seriesData?.description || '',
            coverImage: seriesData?.coverImage || '',
            episodes: seriesData?.episodes || []
        });
    }, [seriesData]);

    const [saving, setSaving] = useState(false);
    const [loadingAudio, setLoadingAudio] = useState(false);

    // Episode Form State (internal to adding a new episode)
    const [newEpisode, setNewEpisode] = useState({
        title: '',
        audioUrl: '',
        duration: 0,
        episodeNumber: 1
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEpisodeChange = (e) => {
        setNewEpisode({ ...newEpisode, [e.target.name]: e.target.value });
    };

    // Real upload logic using the new /api/upload endpoint
    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        // Determine upload type based on field
        let type = 'image';
        if (field === 'audioUrl') type = 'audio';
        else if (field === 'coverImage') type = 'poster';

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('type', type);

        try {
            setLoadingAudio(true); // Re-use this loading state for simplicity or add specific ones
            const token = localStorage.getItem('adminToken');
            // Do NOT set Content-Type manually for FormData, let axios/browser handle it with boundary
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };

            // Use API_URL constant if possible, or fallback. API_URL points to /api/audio-series
            // We want /api/upload.
            const uploadUrl = API_URL.replace('/api/audio-series', '/api/upload');

            const res = await axios.post(uploadUrl, uploadData, config);

            if (res.data.success) {
                if (field === 'coverImage') {
                    setFormData({ ...formData, coverImage: res.data.data.url });
                } else if (field === 'audioUrl') {
                    // Update newEpisode state
                    setNewEpisode(prev => ({
                        ...prev,
                        audioUrl: res.data.data.url,
                        duration: Math.round(res.data.data.duration || 0) // Cloudinary provides duration in seconds
                    }));
                }
            }
        } catch (error) {
            console.error("Upload failed:", error);
            if (error.response?.status === 401) {
                alert("Session expired. Please login again.");
            } else {
                alert(`File upload failed: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoadingAudio(false);
        }
    };

    const addEpisode = () => {
        if (!newEpisode.title || !newEpisode.audioUrl) return alert("Title and Audio URL required");
        const episode = { ...newEpisode, episodeNumber: formData.episodes.length + 1 };
        setFormData({ ...formData, episodes: [...formData.episodes, episode] });
        setNewEpisode({ title: '', audioUrl: '', duration: 0, episodeNumber: formData.episodes.length + 2 });
    };

    const removeEpisode = (index) => {
        const updated = formData.episodes.filter((_, i) => i !== index);
        setFormData({ ...formData, episodes: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('adminToken');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (seriesData && seriesData._id) {
                // Update
                await axios.put(`${API_URL}/${seriesData._id}`, formData, config);
            } else {
                // Create
                await axios.post(API_URL, formData, config);
            }
            onSave();
        } catch (error) {
            console.error("Error saving series:", error);
            alert("Failed to save series");
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', marginBottom: '20px', color: '#666' }}>
                <ArrowLeft size={20} /> Back to Library
            </button>

            <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
                    {seriesData ? 'Edit Audio Series' : 'Create New Audio Series'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Cover Image */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Cover Image (Poster)</label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'coverImage')}
                                style={{ display: 'none' }}
                                id="cover-upload"
                            />
                            <label htmlFor="cover-upload" style={{
                                flex: 1, padding: '12px', border: '2px dashed #d1d5db', borderRadius: '6px',
                                cursor: 'pointer', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', background: '#f9fafb'
                            }}>
                                <Upload size={16} style={{ marginBottom: '4px', margin: '0 auto', display: 'block' }} />
                                {formData.coverImage ? 'Change Cover' : 'Upload Cover Image'}
                            </label>
                        </div>
                        {loadingAudio && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Uploading...</div>}
                        {formData.coverImage && (
                            <img src={getImageUrl(formData.coverImage)} alt="Preview" style={{ width: '100px', height: '150px', objectFit: 'cover', marginTop: '10px', borderRadius: '8px' }} />
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Series Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title || ''}
                            onChange={handleChange}
                            placeholder="e.g. Horror Stories"
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Description</label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows={4}
                            placeholder="About this series..."
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    {/* Episodes Section */}
                    <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '8px', marginTop: '10px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px' }}>Episodes</h3>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                            {formData.episodes.map((ep, index) => (
                                <div key={index} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px', background: 'white', borderRadius: '6px', marginBottom: '8px', border: '1px solid #eee'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '24px', height: '24px', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{ep.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{ep.duration}s</div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeEpisode(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add Episode Form (Mini) */}
                        <div style={{ display: 'grid', gap: '12px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px dashed #ddd' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#666' }}>Add New Episode</div>
                            <input
                                type="text"
                                name="title"
                                value={newEpisode.title || ''}
                                onChange={handleEpisodeChange}
                                placeholder="Episode Title"
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />

                            <div style={{ position: 'relative' }}>
                                {/* Manual URL Input */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        name="audioUrl"
                                        value={newEpisode.audioUrl || ''}
                                        onChange={handleEpisodeChange}
                                        placeholder="Paste audio URL or upload"
                                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                {/* File Upload */}
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => handleFileUpload(e, 'audioUrl')}
                                    style={{ display: 'none' }}
                                    id="audio-upload"
                                    disabled={loadingAudio}
                                />
                                <label htmlFor="audio-upload" style={{
                                    display: 'block', padding: '10px', border: '1px dashed #ddd', borderRadius: '4px',
                                    cursor: loadingAudio ? 'not-allowed' : 'pointer', color: '#666', background: '#f9f9f9', textAlign: 'center',
                                    opacity: loadingAudio ? 0.7 : 1
                                }}>
                                    {loadingAudio ? 'Uploading...' : 'Click to Upload Audio File (mp3)'}
                                </label>
                            </div>

                            <input
                                type="number"
                                name="duration"
                                value={newEpisode.duration || ''}
                                onChange={handleEpisodeChange}
                                placeholder="Duration in seconds"
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                            <button
                                type="button"
                                onClick={addEpisode}
                                disabled={loadingAudio}
                                style={{
                                    padding: '8px', background: loadingAudio ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px',
                                    cursor: loadingAudio ? 'not-allowed' : 'pointer', fontWeight: 'bold'
                                }}
                            >
                                {loadingAudio ? 'Please Wait...' : 'Add Episode'}
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                padding: '12px 24px', borderRadius: '8px', border: '1px solid #ddd',
                                background: 'white', fontSize: '1rem', cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '12px 24px', borderRadius: '8px', border: 'none',
                                background: '#46d369', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Series'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AudioSeriesPage;
