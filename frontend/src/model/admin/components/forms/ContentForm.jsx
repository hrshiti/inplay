import { useState, useEffect } from 'react';
import { Upload, X, Save, ArrowLeft, Plus, Trash, ChevronDown, ChevronUp } from 'lucide-react';

export default function ContentForm({ content = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: content?.title || '',
    description: content?.description || '',
    genre: content?.genre ? (Array.isArray(content.genre) ? content.genre.join(', ') : content.genre) : '',
    year: content?.year || new Date().getFullYear(),
    rating: content?.rating || '',
    isPaid: content?.isPaid || false,
    price: content?.price || '',
    status: content?.status || 'draft',
    type: content?.type || 'bhojpuri',
    image: content?.image || '',
    backdrop: content?.backdrop || '',
    video: content?.video || '',
    seasons: content?.seasons || [], // Initialize seasons
    isNewAndHot: content?.isNewAndHot || false,
    isOriginal: content?.isOriginal || false,
    isRanking: content?.isRanking || false,
    isMovie: content?.isMovie || false,
    isTV: content?.isTV || false,

    isPopular: content?.isPopular || false,
    isBroadcast: content?.isBroadcast || false,
    isMms: content?.isMms || false,
    isShortFilm: content?.isShortFilm || false,
    cast: content?.cast || '',
    producer: content?.producer || '',
    production: content?.production || '',
    releaseDate: content?.releaseDate || ''
  });

  // Sync state with content prop changes
  useEffect(() => {
    // Helper to safely get url from possible object structure
    const getUrl = (field) => {
      if (!content) return '';
      const val = content[field];
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val.url) return val.url;
      return '';
    };

    if (content) {
      setFormData(prev => ({
        ...prev,
        title: content.title || '',
        description: content.description || '',
        genre: Array.isArray(content.genre) ? content.genre.join(', ') : (content.genre || ''),
        year: content.year || new Date().getFullYear(),
        rating: content.rating || '',
        isPaid: content.isPaid || false,
        price: content.price || '',
        status: content.status || 'draft',
        type: content.type || 'bhojpuri',
        image: getUrl('image') || getUrl('poster') || '',
        backdrop: getUrl('backdrop') || '',
        video: getUrl('video') || '',
        seasons: content.seasons || [],
        isNewAndHot: content.isNewAndHot || false,
        isOriginal: content.isOriginal || false,
        isRanking: content.isRanking || false,
        isMovie: content.isMovie || false,
        isTV: content.isTV || false,
        isPopular: content.isPopular || false,
        isBroadcast: content.isBroadcast || false,
        isMms: content.isMms || false,
        isShortFilm: content.isShortFilm || false,
        cast: content.cast || '',
        producer: content.producer || '',
        production: content.production || '',
        releaseDate: content.releaseDate || ''
      }));
    }
  }, [content]);

  const [errors, setErrors] = useState({});
  const [expandedSeason, setExpandedSeason] = useState(0); // Index of expanded season

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
    if (!String(formData.genre).trim()) newErrors.genre = 'Genre is required';
    if (!formData.rating || formData.rating < 0 || formData.rating > 10) {
      newErrors.rating = 'Rating must be between 0 and 10';
    }
    if (formData.isPaid && (!formData.price || formData.price <= 0)) {
      newErrors.price = 'Price is required for paid content';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getFileDisplay = (fileInfo) => {
    if (!fileInfo) return '';
    if (typeof fileInfo === 'string') return fileInfo.split('/').pop();
    if (fileInfo instanceof File) return fileInfo.name;
    if (typeof fileInfo === 'object' && fileInfo.url && typeof fileInfo.url === 'string') return fileInfo.url.split('/').pop();
    return 'File selected';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const fd = new FormData();
      const submissionData = { ...formData };

      // Append standard files
      if (formData.imageFile) fd.append('poster', formData.imageFile);
      if (formData.backdropFile) fd.append('backdrop', formData.backdropFile);
      if (formData.videoFile) fd.append('video', formData.videoFile);
      if (formData.trailerFile) fd.append('trailer', formData.trailerFile);

      // Append episode videos
      if (formData.seasons && formData.seasons.length > 0) {
        formData.seasons.forEach((season, sIndex) => {
          if (season.episodes) {
            season.episodes.forEach((episode, eIndex) => {
              if (episode.videoFile) {
                fd.append(`season_${sIndex}_episode_${eIndex}_video`, episode.videoFile);
              }
            });
          }
        });
      }

      // Map legacy structure for URLs (if no new file)
      if (!formData.imageFile && formData.image && (!submissionData.poster || !submissionData.poster.url)) {
        submissionData.poster = { url: formData.image };
      }
      if (!formData.backdropFile && formData.backdrop && (!submissionData.backdrop || !submissionData.backdrop.url)) {
        submissionData.backdrop = { url: formData.backdrop };
      }
      // Clean up files and huge Base64 strings from JSON to avoid payload issues
      if (formData.imageFile) { delete submissionData.image; delete submissionData.poster; }
      if (formData.backdropFile) { delete submissionData.backdrop; }
      if (formData.videoFile) { delete submissionData.video; }
      delete submissionData.imageFile;
      delete submissionData.backdropFile;
      delete submissionData.videoFile;
      delete submissionData.trailerFile;

      // Clean up episode files from JSON
      if (submissionData.seasons) {
        submissionData.seasons.forEach(season => {
          if (season.episodes) {
            season.episodes.forEach(ep => {
              delete ep.videoFile;
              // Don't delete ep.video object here as it might contain necessary metadata or old URL
              // But if we are uploading a new file, the backend will overwrite 'video' anyway.
            });
          }
        });
      }

      if (formData.type === 'hindi_series') {
        submissionData.totalSeasons = formData.seasons.length;
        submissionData.totalEpisodes = formData.seasons.reduce((acc, s) => acc + s.episodes.length, 0);
      }

      fd.append('data', JSON.stringify(submissionData));

      onSave(fd);
    }
  };

  const handleFileUpload = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [field]: reader.result,
          [field + 'File']: file // Store file for FormData upload
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ...

  const handleEpisodeFile = (seasonIndex, episodeIndex, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => {
          const newSeasons = [...prev.seasons];
          newSeasons[seasonIndex].episodes[episodeIndex].video = {
            url: reader.result,
            public_id: 'local_upload_' + Date.now()
          };
          newSeasons[seasonIndex].episodes[episodeIndex].videoFile = file; // Store file
          return { ...prev, seasons: newSeasons };
        });
      };
      reader.readAsDataURL(file);
    }
  };
  const handleAddSeason = () => {
    setFormData(prev => ({
      ...prev,
      seasons: [
        ...prev.seasons,
        {
          seasonNumber: prev.seasons.length + 1,
          title: `Season ${prev.seasons.length + 1}`,
          episodes: []
        }
      ]
    }));
    setExpandedSeason(formData.seasons.length); // Expand the new season
  };

  const handleRemoveSeason = (index) => {
    setFormData(prev => ({
      ...prev,
      seasons: prev.seasons.filter((_, i) => i !== index).map((s, i) => ({ ...s, seasonNumber: i + 1 })) // Re-number
    }));
  };

  const handleAddEpisode = (seasonIndex) => {
    setFormData(prev => {
      const newSeasons = [...prev.seasons];
      const season = newSeasons[seasonIndex];
      season.episodes.push({
        episodeNumber: season.episodes.length + 1,
        title: '',
        description: '',
        video: { url: '' }, // Structure to match backend video object
        duration: 0
      });
      return { ...prev, seasons: newSeasons };
    });
  };

  const handleRemoveEpisode = (seasonIndex, episodeIndex) => {
    setFormData(prev => {
      const newSeasons = [...prev.seasons];
      newSeasons[seasonIndex].episodes = newSeasons[seasonIndex].episodes
        .filter((_, i) => i !== episodeIndex)
        .map((ep, i) => ({ ...ep, episodeNumber: i + 1 }));
      return { ...prev, seasons: newSeasons };
    });
  };

  const handleEpisodeChange = (seasonIndex, episodeIndex, field, value) => {
    setFormData(prev => {
      const newSeasons = [...prev.seasons];
      newSeasons[seasonIndex].episodes[episodeIndex][field] = value;
      return { ...prev, seasons: newSeasons };
    });
  };




  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
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
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '4px' }}>
            {content ? 'Edit Content' : 'Add New Content'}
          </h1>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>
            {content ? 'Update content details' : 'Add a new movie, series, or other content'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter content title"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.title ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            {errors.title && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.title}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none',
                background: 'white'
              }}
            >
              <option value="bhojpuri">Bhojpuri World</option>
              <option value="trending_song">Trending Song</option>
              <option value="trending_now">Trending Now</option>
              <option value="action">Action Blockbuster</option>
              <option value="hindi_series">Hindi Series</option>
              <option value="new_release">New Release</option>
              <option value="reel">Short Reel</option>
              <option value="for_tab">For Tab</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter content description"
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${errors.description ? '#ef4444' : '#d1d5db'}`,
              borderRadius: '6px',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'vertical'
            }}
          />
          {errors.description && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.description}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Genre *
            </label>
            <input
              type="text"
              name="genre"
              value={formData.genre}
              onChange={handleInputChange}
              placeholder="Action, Drama, etc."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.genre ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            {errors.genre && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.genre}</p>}
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
              min="1900"
              max={new Date().getFullYear() + 1}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Rating *
            </label>
            <input
              type="number"
              name="rating"
              value={formData.rating}
              onChange={handleInputChange}
              min="0"
              max="10"
              step="0.1"
              placeholder="0.0"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.rating ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            {errors.rating && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>{errors.rating}</p>}
          </div>

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
                background: 'white'
              }}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* New Fields: Cast, Producer, Production, Release Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Cast
            </label>
            <input
              type="text"
              name="cast"
              value={formData.cast}
              onChange={handleInputChange}
              placeholder="Star Cast names"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Producer
            </label>
            <input
              type="text"
              name="producer"
              value={formData.producer}
              onChange={handleInputChange}
              placeholder="Producer name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Production
            </label>
            <input
              type="text"
              name="production"
              value={formData.production}
              onChange={handleInputChange}
              placeholder="Production House"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Release Date
            </label>
            <input
              type="date"
              name="releaseDate"
              value={formData.releaseDate}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Improved Monetization Section */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Monetization Strategy</h3>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '32px', marginBottom: formData.isPaid ? '24px' : '0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', cursor: 'pointer', color: 'black' }}>
                <input
                  type="radio"
                  name="monetization"
                  checked={!formData.isPaid}
                  onChange={() => setFormData(prev => ({ ...prev, isPaid: false }))}
                  style={{ accentColor: '#46d369', width: '18px', height: '18px' }}
                />
                <span>No Purchase Plan (Free)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', cursor: 'pointer', color: 'black' }}>
                <input
                  type="radio"
                  name="monetization"
                  checked={formData.isPaid}
                  onChange={() => setFormData(prev => ({ ...prev, isPaid: true }))}
                  style={{ accentColor: '#46d369', width: '18px', height: '18px' }}
                />
                <span>Add Purchase Plan (Paid)</span>
              </label>
            </div>

            {formData.isPaid && (
              <div style={{
                marginTop: '16px', padding: '16px', background: '#fffbeb',
                border: '1px solid #fcd34d', borderRadius: '6px',
                display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 199"
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #fcd34d',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ flex: 2, fontSize: '0.85rem', color: '#b45309' }}>
                  Users will need to purchase this content specifically to watch it. Set a competitive price.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Display Categories */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', background: '#f9fafb' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Display Categories</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
            {['isNewAndHot', 'isOriginal', 'isRanking', 'isMovie', 'isTV', 'isPopular', 'isBroadcast', 'isMms', 'isShortFilm'].map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name={key}
                  checked={formData[key]}
                  onChange={handleInputChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#46d369' }}
                />
                {key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}
              </label>
            ))}
          </div>
        </div>

        {/* Media Files */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Media Assets</h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Poster */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Poster Image (Vertical)</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload('image', e)} style={{ display: 'none' }} id="poster-upload" />
                  <label htmlFor="poster-upload" style={{
                    flex: 1, padding: '12px', border: '2px dashed #d1d5db', borderRadius: '6px',
                    cursor: 'pointer', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', background: '#f9fafb'
                  }}>
                    <Upload size={16} style={{ marginBottom: '4px', margin: '0 auto', display: 'block' }} />
                    {formData.image ? 'Change Poster' : 'Upload Poster'}
                  </label>
                </div>
                {formData.image && <p style={{ fontSize: '0.8rem', color: '#46d369', marginTop: '4px' }}>✓ {getFileDisplay(formData.image)}</p>}
              </div>

              {/* Backdrop */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Backdrop (Horizontal)</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload('backdrop', e)} style={{ display: 'none' }} id="backdrop-upload" />
                  <label htmlFor="backdrop-upload" style={{
                    flex: 1, padding: '12px', border: '2px dashed #d1d5db', borderRadius: '6px',
                    cursor: 'pointer', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', background: '#f9fafb'
                  }}>
                    <Upload size={16} style={{ marginBottom: '4px', margin: '0 auto', display: 'block' }} />
                    {formData.backdrop ? 'Change Backdrop' : 'Upload Backdrop'}
                  </label>
                </div>
                {formData.backdrop && <p style={{ fontSize: '0.8rem', color: '#46d369', marginTop: '4px' }}>✓ {getFileDisplay(formData.backdrop)}</p>}
              </div>
            </div>

            {/* Conditional Video Upload vs Episodes */}
            {formData.type === 'hindi_series' ? (
              <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>Seasons & Episodes</h3>
                  <button type="button" onClick={handleAddSeason} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', background: '#eff6ff', color: '#2563eb',
                    border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer'
                  }}>
                    <Plus size={16} /> Add Season
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {formData.seasons.map((season, sIndex) => (
                    <div key={sIndex} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', overflow: 'hidden' }}>
                      {/* Season Header */}
                      <div
                        onClick={() => setExpandedSeason(expandedSeason === sIndex ? -1 : sIndex)}
                        style={{
                          padding: '12px 16px', background: '#f8fafc', display: 'flex',
                          justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                          borderBottom: expandedSeason === sIndex ? '1px solid #e5e7eb' : 'none'
                        }}
                      >
                        <h4 style={{ fontWeight: '600', color: '#334155' }}>Season {season.seasonNumber} <span style={{ fontWeight: '400', fontSize: '0.85rem', color: '#64748b' }}>({season.episodes.length} episodes)</span></h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveSeason(sIndex); }}
                            style={{ padding: '4px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash size={16} />
                          </button>
                          {expandedSeason === sIndex ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                        </div>
                      </div>

                      {/* Episodes List */}
                      {expandedSeason === sIndex && (
                        <div style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {season.episodes.map((episode, eIndex) => (
                              <div key={eIndex} style={{
                                display: 'grid', gridTemplateColumns: 'auto 2fr 3fr 1fr auto', gap: '12px',
                                alignItems: 'start', padding: '12px', background: '#f8fafc', borderRadius: '6px',
                                border: '1px solid #f1f5f9'
                              }}>
                                <div style={{ paddingTop: '10px', fontWeight: '600', color: '#94a3b8' }}>#{episode.episodeNumber}</div>

                                {/* Title & Desc */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <input
                                    type="text"
                                    placeholder="Episode Title"
                                    value={episode.title}
                                    onChange={(e) => handleEpisodeChange(sIndex, eIndex, 'title', e.target.value)}
                                    style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.9rem' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <textarea
                                    placeholder="Description"
                                    rows={2}
                                    value={episode.description}
                                    onChange={(e) => handleEpisodeChange(sIndex, eIndex, 'description', e.target.value)}
                                    style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.85rem' }}
                                  />
                                </div>

                                {/* File Upload */}
                                <div>
                                  <input
                                    type="file"
                                    id={`ep-${sIndex}-${eIndex}`}
                                    accept="video/*"
                                    onChange={(e) => handleEpisodeFile(sIndex, eIndex, e)}
                                    style={{ display: 'none' }}
                                  />
                                  <label htmlFor={`ep-${sIndex}-${eIndex}`} style={{
                                    display: 'block', padding: '6px 8px', border: '1px dashed #cbd5e1',
                                    borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b', background: 'white'
                                  }}>
                                    {getFileDisplay(episode.video) ? 'Change Video' : 'Upload Video'}
                                  </label>
                                  {getFileDisplay(episode.video) && <div style={{ fontSize: '0.7rem', color: '#46d369', marginTop: '2px', textAlign: 'center' }}>✓ Uploaded</div>}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveEpisode(sIndex, eIndex)}
                                  style={{ padding: '6px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '4px' }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddEpisode(sIndex)}
                            style={{
                              marginTop: '16px', width: '100%', padding: '8px',
                              border: '1px dashed #cbd5e1', borderRadius: '6px',
                              color: '#64748b', cursor: 'pointer', fontSize: '0.9rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                          >
                            <Plus size={16} /> Add Episode
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {formData.seasons.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', border: '2px dashed #e5e7eb', borderRadius: '8px', color: '#9ca3af' }}>
                      <p>No seasons added yet.</p>
                      <button type="button" onClick={handleAddSeason} style={{
                        marginTop: '8px', color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '500'
                      }}>
                        Start by adding Season 1
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Single Video Upload for Non-Series */
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Video File
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload('video', e)}
                    style={{ display: 'none' }}
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px dashed #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: '#f9fafb',
                      textAlign: 'center',
                      color: '#6b7280'
                    }}
                  >
                    <Upload size={16} style={{ marginBottom: '4px', margin: '0 auto', display: 'block' }} />
                    {formData.video ? 'Change Video' : 'Upload Video'}
                  </label>
                </div>
                {formData.video && (
                  <p style={{ fontSize: '0.8rem', color: '#46d369', marginTop: '4px' }}>✓ Video uploaded: {getFileDisplay(formData.video)}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              color: '#6b7280',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#46d369',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            {content ? 'Update Content' : 'Save Content'}
          </button>
        </div>
      </form >
    </div >
  );
};
