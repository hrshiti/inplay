import { useState, useEffect } from 'react';
import { Plus, Trash, GripVertical, Check, X, Search } from 'lucide-react';
import darmaaSectionService from '../../../services/api/darmaaSectionService';
import contentService from '../../../services/api/contentService';
import { getImageUrl } from '../../../utils/imageUtils';

export default function DarmaaSectionsPage() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddSection, setShowAddSection] = useState(false);
    const [newSection, setNewSection] = useState({ title: '', isActive: true, order: 0, videos: [] });
    const [quickBytes, setQuickBytes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // For editing an existing section's videos
    const [editingSectionId, setEditingSectionId] = useState(null);

    useEffect(() => {
        fetchSections();
        fetchQuickBytes();
    }, []);

    const fetchSections = async () => {
        setLoading(true);
        try {
            const data = await darmaaSectionService.getAllSections();
            setSections(data);
        } catch (error) {
            console.error("Failed to fetch sections:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuickBytes = async () => {
        try {
            const data = await contentService.getQuickBytes(100);
            setQuickBytes(data);
        } catch (error) {
            console.error("Failed to fetch QuickBytes:", error);
        }
    };

    const handleCreateSection = async () => {
        if (!newSection.title) return;
        try {
            await darmaaSectionService.createSection(newSection);
            setShowAddSection(false);
            setNewSection({ title: '', isActive: true, order: sections.length, videos: [] });
            fetchSections();
        } catch (error) {
            alert("Failed to create section: " + (error.message));
        }
    };

    const handleDeleteSection = async (id) => {
        if (!window.confirm("Are you sure you want to delete this section?")) return;
        try {
            await darmaaSectionService.deleteSection(id);
            fetchSections();
        } catch (error) {
            alert("Failed to delete section");
        }
    };

    const handleToggleActive = async (section) => {
        try {
            await darmaaSectionService.updateSection(section._id, { isActive: !section.isActive });
            fetchSections();
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleAddVideoToSection = async (section, video) => {
        if (section.videos.find(v => v._id === video._id)) return; // Already exists
        const updatedVideos = [...section.videos.map(v => v._id), video._id];
        try {
            await darmaaSectionService.updateSection(section._id, { videos: updatedVideos });
            fetchSections();
        } catch (error) {
            alert("Failed to add video");
        }
    };

    const handleRemoveVideoFromSection = async (section, videoId) => {
        const updatedVideos = section.videos.filter(v => v._id !== videoId).map(v => v._id);
        try {
            await darmaaSectionService.updateSection(section._id, { videos: updatedVideos });
            fetchSections();
        } catch (error) {
            alert("Failed to remove video");
        }
    };

    const handleMoveVideo = async (section, index, direction) => {
        if (direction === -1 && index === 0) return;
        if (direction === 1 && index === section.videos.length - 1) return;
        
        const updatedVideos = [...section.videos.map(v => v._id)];
        const temp = updatedVideos[index];
        updatedVideos[index] = updatedVideos[index + direction];
        updatedVideos[index + direction] = temp;

        try {
            await darmaaSectionService.updateSection(section._id, { videos: updatedVideos });
            fetchSections();
        } catch (error) {
            alert("Failed to reorder videos");
        }
    };

    const filteredQuickBytes = quickBytes.filter(qb => 
        qb.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Darmaa Sections Management</h1>
                    <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>Create and organize dynamic Darmaa/InPlay Shorts sections</p>
                </div>
                <button
                    onClick={() => setShowAddSection(true)}
                    style={{ background: '#46d369', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} /> Add Section
                </button>
            </div>

            {showAddSection && (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '16px', fontWeight: 'bold' }}>New Section</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>Title</label>
                            <input
                                type="text"
                                value={newSection.title}
                                onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                placeholder="e.g. Trending Darmaa"
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                            <input 
                                type="checkbox" 
                                checked={newSection.isActive} 
                                onChange={(e) => setNewSection({ ...newSection, isActive: e.target.checked })}
                                style={{ width: '16px', height: '16px' }}
                            />
                            <label style={{ fontSize: '0.9rem', color: '#475569' }}>Active</label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleCreateSection} style={{ background: '#46d369', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Check size={18} /></button>
                            <button onClick={() => setShowAddSection(false)} style={{ background: '#ef4444', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sections.map((section) => (
                    <div key={section._id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>
                        <div style={{ padding: '16px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <GripVertical size={18} color="#94a3b8" />
                                <h3 style={{ fontWeight: 'bold', color: '#1e293b' }}>{section.title}</h3>
                                <span style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '12px', 
                                    fontSize: '0.75rem', 
                                    background: section.isActive ? '#dcfce7' : '#f1f5f9',
                                    color: section.isActive ? '#166534' : '#64748b',
                                    cursor: 'pointer'
                                }} onClick={() => handleToggleActive(section)}>
                                    {section.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setEditingSectionId(editingSectionId === section._id ? null : section._id)}
                                    style={{ background: 'transparent', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}
                                >
                                    {editingSectionId === section._id ? 'Close' : 'Manage Videos'}
                                </button>
                                <button onClick={() => handleDeleteSection(section._id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash size={18} /></button>
                            </div>
                        </div>

                        {editingSectionId === section._id && (
                            <div style={{ padding: '20px', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                
                                {/* Selected Videos List */}
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px', color: '#334155' }}>Videos in Section</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {section.videos && section.videos.map((video, idx) => (
                                            <div key={video._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <button disabled={idx === 0} onClick={() => handleMoveVideo(section, idx, -1)} style={{ cursor: idx === 0 ? 'not-allowed' : 'pointer', background: 'none', border: 'none', padding: 0, color: '#64748b' }}>▲</button>
                                                        <button disabled={idx === section.videos.length - 1} onClick={() => handleMoveVideo(section, idx, 1)} style={{ cursor: idx === section.videos.length - 1 ? 'not-allowed' : 'pointer', background: 'none', border: 'none', padding: 0, color: '#64748b' }}>▼</button>
                                                    </div>
                                                    {video.thumbnail && <img src={getImageUrl(video.thumbnail)} alt={video.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1e293b' }}>{video.title}</span>
                                                </div>
                                                <button onClick={() => handleRemoveVideoFromSection(section, video._id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash size={16} /></button>
                                            </div>
                                        ))}
                                        {(!section.videos || section.videos.length === 0) && (
                                            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '10px' }}>No videos added yet</div>
                                        )}
                                    </div>
                                </div>

                                {/* Available Videos List (Search) */}
                                <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px', color: '#334155' }}>Add Videos</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <Search size={16} color="#64748b" />
                                        <input 
                                            type="text" 
                                            placeholder="Search darmaa videos..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                                        {filteredQuickBytes.map(video => {
                                            const isAdded = section.videos.some(v => v._id === video._id);
                                            return (
                                                <div key={video._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: isAdded ? '#f1f5f9' : '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {video.thumbnail && <img src={getImageUrl(video.thumbnail)} alt={video.title} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />}
                                                        <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{video.title}</span>
                                                    </div>
                                                    {!isAdded ? (
                                                        <button 
                                                            onClick={() => handleAddVideoToSection(section, video)}
                                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                                                        >
                                                            Add
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Added</span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
