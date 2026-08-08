import { useState, useEffect, useRef } from 'react';
import { Upload, X, Save, ArrowLeft, Play, Plus, Trash2 } from 'lucide-react';

// Keep these in sync with ALLOWED_EXTENSIONS in backend/config/multerStorage.js,
// so a bad file is rejected here instead of after a long upload.
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', '3gp', 'ts', 'mpeg', 'mpg'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_VIDEO_PARTS = 20;

const getExtension = (name = '') => name.split('.').pop().toLowerCase();

export default function QuickBitesForm({ content = null, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        title: content?.title || '',
        description: content?.description || '',
        genre: content?.genre || 'Entertainment',
        year: content?.year || new Date().getFullYear(),
        rating: content?.rating || 0,
        isNewAndHot: content?.isNewAndHot || false,
        isOriginal: content?.isOriginal || false,
        isRanking: content?.isRanking || false,
        isMovie: content?.isMovie || false,
        isTV: content?.isTV || false,
        isPopular: content?.isPopular || false,
        isDarmaaHero: content?.isDarmaaHero || false,
        isBhojpuriHero: content?.isBhojpuriHero || false,
        targetCategory: content?.targetCategory || 'Darmaa',
        status: content?.status || 'published',
        views: content?.views || 0,
        fakeViews: content?.fakeViews || 0,
        publishAt: content?.publishAt ? new Date(content.publishAt).toISOString().slice(0, 16) : '',
        type: 'reel'
    });

    const [files, setFiles] = useState({
        thumbnail: null
    });

    // Each new video part carries its own File object, so removing one by index
    // can never drop a different part that happens to share the same filename.
    const [previews, setPreviews] = useState({
        videos: content?.episodes?.length
            ? content.episodes.map((e, idx) => ({ url: e.url, type: 'url', name: e.title || `Episode ${idx + 1}` }))
            : (content?.video?.url ? [{ url: content.video.url, type: 'url', name: 'Episode 1' }] : []),
        thumbnail: content?.thumbnail?.url || content?.poster?.url || ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cleanup object URLs on unmount only. Revoking on every `previews` change
    // would kill blob URLs that are still rendered (e.g. the thumbnail preview).
    const previewsRef = useRef(previews);
    previewsRef.current = previews;

    useEffect(() => {
        return () => {
            const current = previewsRef.current;
            current.videos?.forEach(v => {
                if (v.type === 'blob') URL.revokeObjectURL(v.url);
            });
            if (typeof current.thumbnail === 'string' && current.thumbnail.startsWith('blob:')) {
                URL.revokeObjectURL(current.thumbnail);
            }
        };
    }, []);

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
        const newVideoCount = previews.videos.filter(v => v.type === 'blob').length;

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        } else if (formData.title.trim().length > 100) {
            newErrors.title = `Title is too long (${formData.title.trim().length}/100 characters)`;
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        } else if (formData.description.trim().length > 1000) {
            newErrors.description = `Description is too long (${formData.description.trim().length}/1000 characters)`;
        }

        if (previews.videos.length === 0) {
            newErrors.video = 'At least one video part is required';
        } else if (newVideoCount > MAX_VIDEO_PARTS) {
            newErrors.video = `You can upload at most ${MAX_VIDEO_PARTS} video parts at a time (selected ${newVideoCount})`;
        }

        if (!files.thumbnail && !previews.thumbnail) newErrors.thumbnail = 'Thumbnail is required';

        const rating = Number(formData.rating);
        if (formData.rating === '' || Number.isNaN(rating)) {
            newErrors.rating = 'Rating must be a number';
        } else if (rating < 0 || rating > 10) {
            newErrors.rating = 'Rating must be between 0 and 10';
        }

        const year = Number(formData.year);
        if (formData.year === '' || Number.isNaN(year)) {
            newErrors.year = 'Year must be a number';
        } else if (year < 1900 || year > new Date().getFullYear() + 5) {
            newErrors.year = `Year must be between 1900 and ${new Date().getFullYear() + 5}`;
        }

        const fakeViews = Number(formData.fakeViews);
        if (formData.fakeViews === '' || Number.isNaN(fakeViews) || fakeViews < 0) {
            newErrors.fakeViews = 'Fake views must be 0 or more';
        }

        if (formData.status === 'scheduled' && !formData.publishAt) {
            newErrors.publishAt = 'Pick a publish date & time for scheduled content';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            setErrors(prev => ({ ...prev, submit: 'Please fix the highlighted fields before saving.' }));
            return;
        }

        setIsSubmitting(true);
        setErrors(prev => ({ ...prev, submit: '' }));

        try {
            const submissionData = new FormData();
            submissionData.append('title', formData.title.trim());
            submissionData.append('description', formData.description.trim());
            submissionData.append('genre', formData.genre);
            submissionData.append('year', formData.year);
            submissionData.append('rating', formData.rating);
            submissionData.append('isNewAndHot', formData.isNewAndHot);
            submissionData.append('isOriginal', formData.isOriginal);
            submissionData.append('isRanking', formData.isRanking);
            submissionData.append('isMovie', formData.isMovie);
            submissionData.append('isTV', formData.isTV);
            submissionData.append('isPopular', formData.isPopular);
            submissionData.append('isDarmaaHero', formData.isDarmaaHero);
            submissionData.append('isBhojpuriHero', formData.isBhojpuriHero);
            submissionData.append('targetCategory', formData.targetCategory);
            submissionData.append('type', 'reel');
            submissionData.append('status', formData.status);
            submissionData.append('views', formData.views);
            submissionData.append('fakeViews', formData.fakeViews);
            if (formData.status === 'scheduled') {
                submissionData.append('publishAt', new Date(formData.publishAt).toISOString());
            }

            previews.videos
                .filter(v => v.type === 'blob' && v.file)
                .forEach(v => submissionData.append('videos', v.file));

            if (files.thumbnail) {
                submissionData.append('poster', files.thumbnail);
            }

            await onSave(submissionData);
        } catch (error) {
            console.error('Submission error:', error);
            setErrors(prev => ({ ...prev, submit: error.message || 'Failed to save. Please try again.' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVideoAdd = (e) => {
        const selectedFiles = Array.from(e.target.files);
        e.target.value = ''; // allow re-picking the same file after a removal
        if (selectedFiles.length === 0) return;

        const rejected = selectedFiles.filter(file => !ALLOWED_VIDEO_EXTENSIONS.includes(getExtension(file.name)));
        const accepted = selectedFiles.filter(file => ALLOWED_VIDEO_EXTENSIONS.includes(getExtension(file.name)));

        if (accepted.length > 0) {
            const newPreviews = accepted.map(file => ({
                url: URL.createObjectURL(file),
                type: 'blob',
                name: file.name,
                file
            }));

            setPreviews(prev => ({
                ...prev,
                videos: [...prev.videos, ...newPreviews]
            }));
        }

        setErrors(prev => ({
            ...prev,
            video: rejected.length > 0
                ? `Unsupported video format: ${rejected.map(f => f.name).join(', ')}. Allowed: ${ALLOWED_VIDEO_EXTENSIONS.join(', ').toUpperCase()}`
                : ''
        }));
    };

    const handleRemoveVideo = (index) => {
        setPreviews(prev => {
            const newVs = [...prev.videos];
            const [removed] = newVs.splice(index, 1);
            if (removed?.type === 'blob') URL.revokeObjectURL(removed.url);
            return { ...prev, videos: newVs };
        });
    };

    const handleThumbnailUpload = (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        if (!ALLOWED_IMAGE_EXTENSIONS.includes(getExtension(file.name))) {
            setErrors(prev => ({
                ...prev,
                thumbnail: `Unsupported image format: ${file.name}. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ').toUpperCase()}`
            }));
            return;
        }

        setPreviews(prev => {
            if (typeof prev.thumbnail === 'string' && prev.thumbnail.startsWith('blob:')) {
                URL.revokeObjectURL(prev.thumbnail);
            }
            return { ...prev, thumbnail: URL.createObjectURL(file) };
        });
        setFiles(prev => ({ ...prev, thumbnail: file }));
        setErrors(prev => ({ ...prev, thumbnail: '' }));
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
                        maxLength={100}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Target Category
                        </label>
                        <select
                            name="targetCategory"
                            value={formData.targetCategory}
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
                            <option value="Darmaa">Darmaa Only</option>
                            <option value="Bhojpuri">Bhojpuri Only</option>
                            <option value="Both">Both Darmaa & Bhojpuri</option>
                        </select>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            name="isDarmaaHero"
                            checked={formData.isDarmaaHero}
                            onChange={handleInputChange}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                            Show in Darmaa Banner
                        </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            name="isBhojpuriHero"
                            checked={formData.isBhojpuriHero}
                            onChange={handleInputChange}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                            Show in Bhojpuri Banner
                        </span>
                    </label>
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
                        maxLength={1000}
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
                            min="1900"
                            max={new Date().getFullYear() + 5}
                            value={formData.year}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${errors.year ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                        />
                        {errors.year && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.year}</p>}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Rating (0 - 10)
                        </label>
                        <input
                            type="number"
                            name="rating"
                            step="0.1"
                            min="0"
                            max="10"
                            value={formData.rating}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${errors.rating ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                        />
                        {errors.rating && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.rating}</p>}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Fake Views
                        </label>
                        <input
                            type="number"
                            name="fakeViews"
                            min="0"
                            value={formData.fakeViews}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${errors.fakeViews ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box' }}
                        />
                        {errors.fakeViews && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.fakeViews}</p>}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                            Status
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', background: 'white' }}
                        >
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                        </select>
                    </div>

                    {formData.status === 'scheduled' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                                Publish At (Date & Time) *
                            </label>
                            <input
                                type="datetime-local"
                                name="publishAt"
                                value={formData.publishAt}
                                onChange={handleInputChange}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${errors.publishAt ? '#ef4444' : '#d1d5db'}`, boxSizing: 'border-box', background: 'white' }}
                            />
                            {errors.publishAt && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.publishAt}</p>}
                        </div>
                    )}
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
                                <br />
                                Allowed: {ALLOWED_VIDEO_EXTENSIONS.join(', ').toUpperCase()} &middot; max {MAX_VIDEO_PARTS} parts per upload.
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
                    <div style={{
                        padding: '12px 14px', background: '#fee2e2', border: '1px solid #fecaca',
                        borderRadius: '6px', color: '#b91c1c', fontSize: '0.9rem', lineHeight: '1.5'
                    }}>
                        <strong style={{ display: 'block', marginBottom: '2px' }}>
                            {content ? 'Could not update this Quick Bite' : 'Could not save this Quick Bite'}
                        </strong>
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
