import { useState, useEffect } from 'react';
import { Upload, X, Save, ArrowLeft, Play, Plus, Trash2 } from 'lucide-react';

export default function QuickBitesForm({ content = null, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        title: content?.title || '',
        description: content?.description || '',
        genre: content?.genre || 'Entertainment',
        year: content?.year || new Date().getFullYear(),
        rating: content?.rating || 0,
        isPaid: content?.isPaid || false,
        price: content?.price || 0,
        isNewAndHot: content?.isNewAndHot || false,
        isOriginal: content?.isOriginal || false,
        isRanking: content?.isRanking || false,
        isMovie: content?.isMovie || false,
        isTV: content?.isTV || false,
        isPopular: content?.isPopular || false,
        status: content?.status || 'published',
        type: 'reel'
    });

    const [files, setFiles] = useState({
        videos: [],
        thumbnail: null
    });

    const [previews, setPreviews] = useState({
        videos: content?.episodes?.length
            ? content.episodes.map(e => ({ url: e.url, type: 'url' }))
            : (content?.video?.url ? [{ url: content.video.url, type: 'url' }] : []),
        thumbnail: content?.thumbnail?.url || content?.poster?.url || ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            if (previews.videos) {
                previews.videos.forEach(v => {
                    if (v.type === 'blob') URL.revokeObjectURL(v.url);
                });
            }
            if (previews.thumbnail && typeof previews.thumbnail === 'string' && previews.thumbnail.startsWith('blob:')) {
                URL.revokeObjectURL(previews.thumbnail);
            }
        };
    }, [previews]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (previews.videos.length === 0) newErrors.video = 'At least one video part is required';
        if (!files.thumbnail && !previews.thumbnail) newErrors.thumbnail = 'Thumbnail is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                const submissionData = new FormData();
                submissionData.append('title', formData.title);
                submissionData.append('description', formData.description);
                submissionData.append('genre', formData.genre);
                submissionData.append('year', formData.year);
                submissionData.append('rating', formData.rating);
                submissionData.append('isPaid', formData.isPaid);
                submissionData.append('price', formData.price);
                submissionData.append('isNewAndHot', formData.isNewAndHot);
                submissionData.append('isOriginal', formData.isOriginal);
                submissionData.append('isRanking', formData.isRanking);
                submissionData.append('isMovie', formData.isMovie);
                submissionData.append('isTV', formData.isTV);
                submissionData.append('isPopular', formData.isPopular);
                submissionData.append('type', 'reel');
                submissionData.append('status', formData.status);

                if (files.videos && files.videos.length > 0) {
                    files.videos.forEach(file => {
                        submissionData.append('videos', file);
                    });
                }
                if (files.thumbnail) {
                    submissionData.append('poster', files.thumbnail);
                }

                await onSave(submissionData);
            } catch (error) {
                console.error('Submission error:', error);
                setErrors(prev => ({ ...prev, submit: error.message || 'Failed to save' }));
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleVideoAdd = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            setFiles(prev => ({
                ...prev,
                videos: [...prev.videos, ...selectedFiles]
            }));

            const newPreviews = selectedFiles.map(file => ({
                url: URL.createObjectURL(file),
                type: 'blob',
                name: file.name
            }));

            setPreviews(prev => ({
                ...prev,
                videos: [...prev.videos, ...newPreviews]
            }));

            if (errors.video) setErrors(prev => ({ ...prev, video: '' }));
        }
    };

    const handleRemoveVideo = (index) => {
        setPreviews(prev => {
            const newVs = [...prev.videos];
            const item = newVs[index];

            if (item.type === 'blob') {
                URL.revokeObjectURL(item.url);
                setFiles(f => ({
                    ...f,
                    videos: f.videos.filter(v => v.name !== item.name) // Remove by name
                }));
            }

            newVs.splice(index, 1);
            return { ...prev, videos: newVs };
        });
    };

    const handleThumbnailUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({ ...prev, thumbnail: file }));
            const previewUrl = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, thumbnail: previewUrl }));
            if (errors.thumbnail) setErrors(prev => ({ ...prev, thumbnail: '' }));
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <button
                    onClick={onCancel}
                    style={{
                        background: 'transparent',
                        border: '1px solid #d1d5db',
                        padding: '8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#6b7280'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '4px', color: '#111827' }}>
                        {content ? 'Edit Quick Bite' : 'Add New Quick Bite'}
                    </h1>
                    <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>
                        Add short, vertical video content for the Quick Bites section.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '24px', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Title */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Title *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="e.g., Funny Moment from Movie"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: `1px solid ${errors.title ? '#ef4444' : '#d1d5db'}`,
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        {errors.title && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.title}</p>}
                    </div>

                    {/* Status */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Status
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                outline: 'none',
                                background: 'white',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="draft">Draft (Hidden)</option>
                            <option value="published">Published (Visible)</option>
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                        Description *
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Enter content description"
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${errors.description ? '#ef4444' : '#d1d5db'}`,
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            resize: 'vertical',
                            boxSizing: 'border-box'
                        }}
                    />
                    {errors.description && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.description}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Genre
                        </label>
                        <input
                            type="text"
                            name="genre"
                            value={formData.genre}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Year
                        </label>
                        <input
                            type="number"
                            name="year"
                            value={formData.year}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Rating
                        </label>
                        <input
                            type="number"
                            name="rating"
                            step="0.1"
                            value={formData.rating}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {/* Removed Monetization and Display Categories sections as per user request */}

                {/* Video Upload */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                        Video Episodes (Order matters) *
                    </label>
                    <div style={{
                        border: `2px dashed ${errors.video ? '#ef4444' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: '#f9fafb'
                    }}>
                        {/* List of Videos */}
                        {previews.videos.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                {previews.videos.map((vid, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '24px', height: '24px', background: '#e0f2fe', color: '#0284c7',
                                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <span style={{ fontSize: '0.9rem', color: '#374151', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {vid.name || `Episode ${idx + 1}`}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button type="button" onClick={() => handleRemoveVideo(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Button */}
                        <div style={{ textAlign: 'center' }}>
                            <input
                                type="file"
                                accept="video/*"
                                multiple
                                onChange={handleVideoAdd}
                                style={{ display: 'none' }}
                                id="video-upload"
                            />
                            <label htmlFor="video-upload" style={{
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px',
                                fontSize: '0.9rem', fontWeight: '500', color: '#374151'
                            }}>
                                <Plus size={18} />
                                Add Video Parts
                            </label>
                            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
                                Upload multiple clips. They will play in sequence.
                            </p>
                        </div>
                    </div>
                    {errors.video && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.video}</p>}
                </div>

                {/* Thumbnail Upload */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                        Thumbnail (Vertical Poster) *
                    </label>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                        <div style={{
                            flex: 1,
                            border: `2px dashed ${errors.thumbnail ? '#ef4444' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            padding: '24px',
                            textAlign: 'center',
                            backgroundColor: '#f9fafb',
                            height: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailUpload}
                                style={{ display: 'none' }}
                                id="thumbnail-upload"
                            />
                            <label htmlFor="thumbnail-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Upload size={18} color="#6b7280" />
                                <span style={{ fontSize: '0.9rem', color: '#374151' }}>Upload Image</span>
                            </label>
                        </div>

                        {/* Preview */}
                        <div style={{
                            width: '80px',
                            height: '120px',
                            background: '#f3f4f6',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {previews.thumbnail ? (
                                <img src={previews.thumbnail} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: '#9ca3af', textAlign: 'center' }}>Preview</span>
                            )}
                        </div>
                    </div>
                    {errors.thumbnail && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.thumbnail}</p>}
                </div>

                {/* Error Message */}
                {errors.submit && (
                    <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '6px', color: '#b91c1c', fontSize: '0.9rem' }}>
                        {errors.submit}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        style={{
                            padding: '10px 20px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            background: 'white',
                            color: '#6b7280',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '6px',
                            background: isSubmitting ? '#9ca3af' : '#46d369',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Save size={16} />
                        {content ? 'Update Quick Bite' : (isSubmitting ? 'Uploading...' : 'Save & Publish')}
                    </button>
                </div>
            </form>
        </div>
    );
}
