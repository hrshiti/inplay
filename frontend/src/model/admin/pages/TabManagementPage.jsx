import { useState, useEffect } from 'react';
import { Plus, Trash, GripVertical, Edit2, Check, X } from 'lucide-react';
import adminTabService from '../../../services/api/adminTabService';

export default function TabManagementPage() {
    const [tabs, setTabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddTab, setShowAddTab] = useState(false);
    const [newTab, setNewTab] = useState({ name: '', slug: '', order: 0, isActive: true });

    // Category management
    const [editingTabId, setEditingTabId] = useState(null);
    const [newCategory, setNewCategory] = useState({ name: '', slug: '', order: 0 });

    useEffect(() => {
        fetchTabs();
    }, []);

    const fetchTabs = async () => {
        setLoading(true);
        try {
            const data = await adminTabService.getAllTabs();
            setTabs(data);
        } catch (error) {
            console.error("Failed to fetch tabs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTab = async () => {
        if (!newTab.name || !newTab.slug) return;
        try {
            await adminTabService.createTab(newTab);
            setShowAddTab(false);
            setNewTab({ name: '', slug: '', order: tabs.length, isActive: true });
            fetchTabs();
        } catch (error) {
            alert("Failed to create tab: " + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteTab = async (id) => {
        if (!confirm("Are you sure you want to delete this tab and all its categories?")) return;
        try {
            await adminTabService.deleteTab(id);
            fetchTabs();
        } catch (error) {
            alert("Failed to delete tab");
        }
    };

    const handleCreateCategory = async (tabId) => {
        if (!newCategory.name || !newCategory.slug) return;
        try {
            await adminTabService.createCategory(tabId, newCategory);
            setNewCategory({ name: '', slug: '', order: 0 });
            fetchTabs();
        } catch (error) {
            alert("Failed to create category");
        }
    };

    const handleDeleteCategory = async (catId) => {
        if (!confirm("Delete this category?")) return;
        try {
            await adminTabService.deleteCategory(catId);
            fetchTabs();
        } catch (error) {
            alert("Failed to delete category");
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Dynamic Tabs Management</h1>
                    <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>Create and organize dynamic navigation tabs and content categories</p>
                </div>
                <button
                    onClick={() => setShowAddTab(true)}
                    style={{ background: '#46d369', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} /> Add Tab
                </button>
            </div>

            {showAddTab && (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '16px', fontWeight: 'bold' }}>New Tab</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '16px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>Name</label>
                            <input
                                type="text"
                                value={newTab.name}
                                onChange={(e) => setNewTab({ ...newTab, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                placeholder="Movies, TV Shows, etc."
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>Slug</label>
                            <input
                                type="text"
                                value={newTab.slug}
                                onChange={(e) => setNewTab({ ...newTab, slug: e.target.value })}
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleCreateTab} style={{ background: '#46d369', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Check size={18} /></button>
                            <button onClick={() => setShowAddTab(false)} style={{ background: '#ef4444', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {tabs.map((tab) => (
                    <div key={tab._id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>
                        <div style={{ padding: '16px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <GripVertical size={18} color="#94a3b8" />
                                <h3 style={{ fontWeight: 'bold', color: '#1e293b' }}>{tab.name} <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '0.85rem' }}>/{tab.slug}</span></h3>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setEditingTabId(editingTabId === tab._id ? null : tab._id)}
                                    style={{ background: 'transparent', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}
                                >
                                    {editingTabId === tab._id ? 'Close' : 'Manage Categories'}
                                </button>
                                <button onClick={() => handleDeleteTab(tab._id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash size={18} /></button>
                            </div>
                        </div>

                        {editingTabId === tab._id && (
                            <div style={{ padding: '20px', background: '#fff' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px', color: '#334155' }}>Categories in {tab.name}</h4>
                                <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="Category Name"
                                        value={newCategory.name}
                                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                        style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Slug"
                                        value={newCategory.slug}
                                        onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                                        style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                                    />
                                    <button
                                        onClick={() => handleCreateCategory(tab._id)}
                                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        Add
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {tab.categories && tab.categories.map((cat) => (
                                        <div key={cat._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1e293b' }}>{cat.name} <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({cat.slug})</span></span>
                                            <button onClick={() => handleDeleteCategory(cat._id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash size={16} /></button>
                                        </div>
                                    ))}
                                    {(!tab.categories || tab.categories.length === 0) && (
                                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '10px' }}>No categories yet</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
