import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { X, Save, User as UserIcon, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import AdminLayout from './components/AdminLayout';
import DataTable from './components/tables/DataTable';
import ContentForm from './components/forms/ContentForm';
import QuickBitesForm from './components/forms/QuickBitesForm';
import { ADMIN_ANALYTICS, ADMIN_ACTIVITY_LOGS, ADMIN_MOVIES, ADMIN_SERIES, ADMIN_USERS, ADMIN_SUBSCRIPTIONS, ADMIN_REELS } from './services/mockData';
import adminUserService from '../../services/api/adminUserService';
import adminSubscriptionService from '../../services/api/adminSubscriptionService';
import adminDashboardService from '../../services/api/adminDashboardService';
import adminQuickByteService from '../../services/api/adminQuickByteService';
import metadataService from '../../services/api/metadataService';
import adminContentService from '../../services/api/adminContentService';
import adminMonetizationService from '../../services/api/adminMonetizationService';
import ForYouReels from './ForYouReels';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const dashboardData = await adminDashboardService.getDashboardAnalytics();
      setData(dashboardData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      setError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading dashboard analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#dc2626' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { users, content, revenue, subscriptions, recentActivity } = data;
  const movieCount = content.byType.find(t => t._id === 'movie')?.count || 0;
  const seriesCount = content.byType.find(t => t._id === 'series')?.count || 0;

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '6px' }}>Dashboard Overview</h1>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>Welcome back! Here's what's happening with your platform.</p>
        <div style={{ background: '#e7f5e7', border: '1px solid #46d369', padding: '8px 12px', borderRadius: '8px', marginTop: '10px' }}>
          <p style={{ color: '#064e3b', fontSize: '0.8rem', margin: 0, fontWeight: '600' }}>
            <strong>Real-time Data Active:</strong> {users.totalUsers} users, {content.overview.totalContent} content items, {recentActivity.length} recent activities
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Total Users</h3>
            <div style={{ width: '10px', height: '10px', background: '#46d369', borderRadius: '50%' }}></div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '2px' }}>{users.totalUsers.toLocaleString()}</p>
          <p style={{ fontSize: '0.8rem', color: '#4b5563' }}>{users.activeUsers} active users</p>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Total Content</h3>
            <div style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%' }}></div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '2px' }}>{content.overview.totalContent}</p>
          <p style={{ fontSize: '0.8rem', color: '#4b5563' }}>{movieCount} movies, {seriesCount} series</p>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Total Views</h3>
            <div style={{ width: '10px', height: '10px', background: '#8b5cf6', borderRadius: '50%' }}></div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '2px' }}>{(content.overview.totalViews / 1000).toFixed(0)}K</p>
          <p style={{ fontSize: '0.8rem', color: '#4b5563' }}>Content views this month</p>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Revenue</h3>
            <div style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%' }}></div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '2px' }}>₹{(revenue.overview.totalRevenue / 100000).toFixed(1)}L</p>
          <p style={{ fontSize: '0.8rem', color: '#4b5563' }}>Monthly recurring revenue</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', background: '#f3f4f6' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: activity.type === 'user_registration' ? '#059669' :
                      activity.type === 'content_upload' ? '#2563eb' :
                        activity.type === 'payment' ? '#d97706' : '#4b5563',
                    marginTop: '6px',
                    flexShrink: 0
                  }}></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '2px', color: '#1f2937' }}>{activity.message}</p>
                    <p style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                      {new Date(activity.timestamp).toLocaleDateString()} • {activity.user}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No recent activity found.</p>
            )}
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>Subscription Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {subscriptions.plans.length > 0 ? (
              subscriptions.plans.map((plan) => (
                <div key={plan._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151' }}>{plan.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{plan.subscriberCount} users</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1f2937' }}>₹{(plan.revenue / 100000).toFixed(1)}L</p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{users.totalUsers > 0 ? ((plan.subscriberCount / users.totalUsers) * 100).toFixed(0) : 0}% of users</p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No subscription plans data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ContentLibrary = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'edit', 'view'
  const [selectedContent, setSelectedContent] = useState(null);

  // Metadata Modal State
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaModalType, setMetaModalType] = useState(''); // 'tab' or 'category'
  const [newMetaValue, setNewMetaValue] = useState('');


  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const data = await adminContentService.getAllContent();
      setContentList(data);
    } catch (error) {
      console.error("Failed to fetch content", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = ['All', 'Popular', 'New & Hot', 'Original', 'Ranking', 'Movies', 'TV'];

  const filteredContent = contentList.filter(item => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Popular') return item.isPopular;
    if (activeTab === 'New & Hot') return item.isNewAndHot;
    if (activeTab === 'Original') return item.isOriginal;
    if (activeTab === 'Ranking') return item.isRanking;
    if (activeTab === 'Movies') return item.isMovie || item.type === 'movie' || item.type === 'action' || item.type === 'bhojpuri' || item.type === 'new_release';
    if (activeTab === 'TV') return item.isTV || item.type === 'series' || item.type === 'hindi_series';
    return true;
  });

  const columns = [
    { key: 'image', label: 'Poster', sortable: false, render: (value, row) => <img src={row.poster?.url || row.image} alt="poster" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} /> },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'genre', label: 'Genre', sortable: true },
    { key: 'rating', label: 'Rating', sortable: true },
    { key: 'year', label: 'Year', sortable: true },
    { key: 'views', label: 'Views', sortable: true, render: (v) => v?.toLocaleString() || 0 },
    {
      key: 'status', label: 'Status', sortable: true, render: (s) => (
        <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', background: s === 'published' ? '#dcfce7' : '#f3f4f6', color: s === 'published' ? '#166534' : '#374151' }}>
          {s}
        </span>
      )
    },
    { key: 'isPaid', label: 'Monetization', sortable: false, render: (value) => value ? 'Paid' : 'Free' },
    { key: 'price', label: 'Price', sortable: true, render: (v) => v ? `₹${v}` : '-' },
    { key: 'createdAt', label: 'Added Date', sortable: true, render: (d) => new Date(d).toLocaleDateString() }
  ];

  const handleEdit = (item) => {
    setSelectedContent(item);
    setViewMode('edit');
  };

  const handleDelete = async (item) => {
    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
      try {
        await adminContentService.deleteContent(item._id);
        fetchContent(); // Refresh
      } catch (error) {
        alert('Failed to delete content');
      }
    }
  };

  const handleView = (item) => {
    setSelectedContent(item);
    setViewMode('view');
  };

  const handleUpdateContent = async (formData) => {
    try {
      await adminContentService.updateContent(selectedContent._id, formData);
      alert('Content updated successfully!');
      setViewMode('list');
      setSelectedContent(null);
      fetchContent();
    } catch (err) {
      console.error("Failed to update content", err);
      alert('Failed to update content: ' + (err.message || 'Unknown error'));
    }
  };

  const handeAddMeta = async () => {
    if (!newMetaValue.trim()) return;
    try {
      if (metaModalType === 'tab') {
        await metadataService.addTab(newMetaValue.trim());
        alert('New Tab added! It will appear in Content Forms.');
      } else {
        await metadataService.addCategory(newMetaValue.trim());
        alert('New Category added! It will appear in Content Forms.');
      }
      setShowMetaModal(false);
      setNewMetaValue('');
    } catch (e) {
      alert('Failed to add ' + metaModalType);
    }
  };

  if (viewMode === 'edit' && selectedContent) {
    return (
      <ContentForm
        content={selectedContent}
        onSave={handleUpdateContent}
        onCancel={() => {
          setViewMode('list');
          setSelectedContent(null);
        }}
      />
    );
  }

  // Meta Modal
  if (showMetaModal) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', minWidth: '350px' }}>
          <h2 style={{ marginBottom: '16px' }}>Add New {metaModalType === 'tab' ? 'Tab' : 'Category'}</h2>
          <input
            type="text"
            value={newMetaValue}
            onChange={(e) => setNewMetaValue(e.target.value)}
            placeholder={`Enter ${metaModalType} name...`}
            style={{ width: '100%', padding: '10px', marginBottom: '16px', border: '1px solid #ccc', borderRadius: '6px' }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowMetaModal(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', background: 'transparent' }}>Cancel</button>
            <button onClick={handeAddMeta} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', background: '#46d369', color: 'white' }}>Add</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px', marginTop: 0, color: '#111827' }}>Content Library</h1>
          <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Manage your movies, series, and other content</p>
          <div style={{ background: '#e7f5e7', border: '1px solid #46d369', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', fontSize: '0.85rem' }}>
            <strong>Real Data:</strong> {contentList.length} items
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/content/add')}
          style={{
            background: '#46d369',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#3ea055'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#46d369'}
        >
          Add New Content
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => { setMetaModalType('tab'); setShowMetaModal(true); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>+ Add New Tab</button>
        <button onClick={() => { setMetaModalType('category'); setShowMetaModal(true); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>+ Add New Category</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: activeTab === tab ? '#46d369' : '#d1d5db',
              background: activeTab === tab ? 'rgba(70, 211, 105, 0.1)' : 'white',
              color: activeTab === tab ? '#065f46' : '#6b7280',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading content...</div>
      ) : (
        <DataTable
          data={filteredContent}
          columns={columns}
          title={`${activeTab === 'All' ? 'All Content' : activeTab}`}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          emptyMessage={`No ${activeTab.toLowerCase()} content found.`}
        />
      )}

      {/* Edit Mode */}
      {viewMode === 'edit' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 50, overflowY: 'auto' }}>
          <ContentForm
            content={selectedContent}
            onSave={handleUpdateContent}
            onCancel={() => {
              setViewMode('list');
              setSelectedContent(null);
            }}
          />
        </div>
      )}

      {/* View Modal */}
      {viewMode === 'view' && selectedContent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
            <button onClick={() => setViewMode('list')} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedContent.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <img src={selectedContent.poster?.url || selectedContent.image} alt="Poster" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedContent.genre?.map(g => <span key={g} style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{g}</span>)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p><strong>Description:</strong> {selectedContent.description}</p>
                <p><strong>Type:</strong> {selectedContent.type}</p>
                <p><strong>Year:</strong> {selectedContent.year}</p>
                <p><strong>Rating:</strong> {selectedContent.rating}/10</p>
                <p><strong>Status:</strong> {selectedContent.status}</p>
                <p><strong>Views:</strong> {selectedContent.views}</p>
                <p><strong>Monetization:</strong> {selectedContent.isPaid ? `Paid (₹${selectedContent.price})` : 'Free'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ... (other components)

const AddContent = () => {
  const navigate = useNavigate();

  const handleSave = async (data) => {
    try {
      await adminContentService.createContent(data);
      alert('Content saved successfully!');
      navigate('/admin/content/library');
    } catch (err) {
      console.error("Failed to save content", err);
      alert('Failed to save content: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <ContentForm
      onSave={handleSave}
      onCancel={() => navigate('/admin/content/library')}
    />
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view' or 'edit'
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await adminUserService.getAllUsers();

      // Map backend data to table format
      const mappedUsers = data.map(user => ({
        id: user._id,
        avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`,
        name: user.name,
        email: user.email,
        plan: user.subscription?.plan?.name || 'Free',
        status: user.isActive ? 'active' : 'inactive',
        totalWatchTime: user.watchHistory?.length || 0,
        fullData: user,
        favoriteGenre: user.preferences?.favoriteGenres?.[0] || 'N/A',
        joinDate: new Date(user.createdAt).toLocaleDateString(),
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
      }));

      setUsers(mappedUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please check your connection.');
      // Fallback to mock data if backend fails, but let's keep it empty for now to show real flow
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await adminUserService.getPlans();
      setPlans(data);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  const columns = [
    {
      key: 'avatar', label: 'Avatar', sortable: false, render: (value) => (
        <img src={value} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
      )
    },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'plan', label: 'Plan', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'totalWatchTime', label: 'Watch Time (hrs)', sortable: true },
    { key: 'favoriteGenre', label: 'Favorite Genre', sortable: true },
    { key: 'joinDate', label: 'Join Date', sortable: true },
    { key: 'lastLogin', label: 'Last Login', sortable: true }
  ];

  const handleEdit = (user) => {
    setSelectedUser(user.fullData);
    setModalMode('edit');
  };

  const handleDelete = async (user) => {
    if (confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      try {
        await adminUserService.deleteUser(user.id);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        alert('User deleted successfully');
      } catch (err) {
        alert(err.message || 'Failed to delete user');
      }
    }
  };

  const handleView = (user) => {
    setSelectedUser(user.fullData);
    setModalMode('view');
  };

  const handleUpdateUser = async (updatedData) => {
    try {
      setIsModalLoading(true);
      if (updatedData.isActive !== selectedUser.isActive) {
        await adminUserService.updateUserStatus(selectedUser._id, updatedData.isActive);
      }
      if (updatedData.planId !== selectedUser.subscription?.plan?._id) {
        await adminUserService.updateUserSubscription(selectedUser._id, {
          planId: updatedData.planId === '' ? null : updatedData.planId,
          isActive: updatedData.planId !== '',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }
      await fetchUsers();
      setSelectedUser(null);
      setModalMode(null);
      alert('User updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to update user');
    } finally {
      setIsModalLoading(false);
    }
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px', marginTop: 0, color: '#111827' }}>User Management</h1>
          <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Manage user accounts, subscriptions, and activity</p>
          <div style={{
            background: error ? '#fee2e2' : '#e7f5e7',
            border: error ? '1px solid #ef4444' : '1px solid #46d369',
            padding: '8px 12px',
            borderRadius: '6px',
            marginTop: '8px',
            fontSize: '0.85rem'
          }}>
            {isLoading ? (
              <span style={{ color: '#6b7280' }}>Loading users...</span>
            ) : error ? (
              <span style={{ color: '#b91c1c' }}>{error}</span>
            ) : (
              <strong style={{ color: '#064e3b' }}>
                Real-time Data: {users.length} users ({users.filter(u => u.status === 'active').length} active, {users.filter(u => u.status === 'inactive').length} inactive)
              </strong>
            )}
          </div>
        </div>
        <button
          style={{
            background: '#46d369',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#3ea055'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#46d369'}
        >
          Add New User
        </button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        title="All Users"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        loading={isLoading}
        error={error}
        emptyMessage={isLoading ? "Loading..." : "No users found."}
      />

      {/* User Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {modalMode === 'edit' ? 'Edit User Details' : 'User Information'}
              </h2>
              <button
                onClick={() => { setSelectedUser(null); setModalMode(null); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <img
                  src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=random&color=fff`}
                  alt="User"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #46d369' }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{selectedUser.name}</h3>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{selectedUser.email}</p>
                </div>
              </div>

              {modalMode === 'view' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <InfoItem label="Status" value={selectedUser.isActive ? 'Active' : 'Inactive'} color={selectedUser.isActive ? '#059669' : '#dc2626'} />
                  <InfoItem label="Role" value={selectedUser.role} />
                  <InfoItem label="Plan" value={selectedUser.subscription?.plan?.name || 'Free'} />
                  <InfoItem label="Joined On" value={new Date(selectedUser.createdAt).toLocaleDateString()} />
                  <InfoItem label="Last Login" value={selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'} />
                  <InfoItem label="Phone" value={selectedUser.phone || 'N/A'} />
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  handleUpdateUser({
                    isActive: formData.get('status') === 'true',
                    planId: formData.get('plan')
                  });
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                      Account Status
                    </label>
                    <select
                      name="status"
                      defaultValue={selectedUser.isActive}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                      Subscription Plan
                    </label>
                    <select
                      name="plan"
                      defaultValue={selectedUser.subscription?.plan?._id || ''}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
                    >
                      <option value="">Free (No Plan)</option>
                      {plans.map(plan => (
                        <option key={plan._id} value={plan._id}>{plan.name} (₹{plan.price})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isModalLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#46d369',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: isModalLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isModalLoading ? 'Saving...' : <><Save size={18} /> Update User</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ label, value, color }) => (
  <div style={{ marginBottom: '8px' }}>
    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>{label}</p>
    <p style={{ margin: '4px 0 0', fontSize: '0.95rem', fontWeight: '600', color: color || '#1f2937' }}>{value}</p>
  </div>
);

const Monetization = () => {
  const [plans, setPlans] = useState([]);
  const [paidContent, setPaidContent] = useState([]); // New state for paid content
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Modal State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'add' or 'edit'
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [editingContent, setEditingContent] = useState(null); // Content being edited

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Parallel fetch
      const [plansData, analyticsData, paidContentData] = await Promise.all([
        adminUserService.getPlans(),
        adminSubscriptionService.getAnalytics(),
        adminMonetizationService.getPaidContentPerformance()
      ]);

      // Map plans
      const mappedPlans = plansData.map(plan => ({
        id: plan._id,
        name: plan.name,
        price: plan.price,
        subscriberCount: plan.subscriberCount || 0,
        revenue: plan.revenue || 0,
        features: plan.features || [],
        fullData: plan
      }));

      setPlans(mappedPlans);
      setAnalytics(analyticsData);
      setPaidContent(paidContentData); // Set paid content data
      setError(null);
    } catch (err) {
      console.error('Error fetching monetization data:', err);
      setError('Failed to load monetization data.');
    } finally {
      setIsLoading(false);
    }
  };

  const planColumns = [
    { key: 'name', label: 'Plan Name', sortable: true },
    { key: 'price', label: 'Price (₹)', sortable: true, render: (value) => `₹${value}` },
    { key: 'subscriberCount', label: 'Subscribers', sortable: true },
    { key: 'revenue', label: 'Revenue (₹)', sortable: true, render: (value) => `₹${(value / 100000).toFixed(1)}L` },
    { key: 'features', label: 'Features', sortable: false, render: (value) => value.length > 0 ? value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : '') : 'N/A' }
  ];

  // New columns for Pay-Per-View table
  const contentColumns = [
    {
      key: 'title', label: 'Content Title', sortable: true, render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={row.poster} alt="" style={{ width: '30px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
          <span>{val}</span>
        </div>
      )
    },
    { key: 'price', label: 'Price', sortable: true, render: (val) => `₹${val}` },
    { key: 'purchases', label: 'Purchases', sortable: true },
    { key: 'revenue', label: 'Total Revenue', sortable: true, render: (val) => `₹${(val || 0).toLocaleString()}` },
    { key: 'views', label: 'Views', sortable: true, render: (val) => val?.toLocaleString() }
  ];

  const handleEdit = (plan) => {
    setSelectedPlan(plan.fullData);
    setModalMode('edit');
  };

  const handleEditContent = (content) => {
    setEditingContent(content);
  };

  const handleSaveContentPrice = async (priceData) => {
    try {
      setIsModalLoading(true);
      // Call adminContentService to update
      // We pass id and partial data. We need to handle formData or JSON.
      // adminContentService handles both. simpler to pass JSON if service checks.
      // But service checks `instanceof FormData`. so we can pass plain object.
      // Wait, checking AdminContentService again...
      // "if (!isFormData) headers['Content-Type'] = 'application/json'; body: JSON.stringify..."
      // So yes, we can pass a plain object!

      await adminContentService.updateContent(editingContent._id, {
        price: parseFloat(priceData.price),
        isPaid: parseFloat(priceData.price) > 0, // Automatically set isPaid based on price
        currency: 'INR'
      });

      await fetchData(); // Refresh data
      setEditingContent(null);
      alert('Plan updated successfully');
    } catch (err) {
      console.error("Update content price error", err);
      alert(err.message || "Failed to update plan");
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleDelete = async (plan) => {
    if (confirm(`Are you sure you want to delete plan "${plan.name}"?`)) {
      try {
        await adminSubscriptionService.deletePlan(plan.id);
        // Refresh
        fetchData();
        alert('Plan deleted successfully');
      } catch (err) {
        alert(err.message || 'Failed to delete plan');
      }
    }
  };

  const handleAddNew = () => {
    setSelectedPlan(null);
    setModalMode('add');
  };

  const handleSavePlan = async (planData) => {
    try {
      setIsModalLoading(true);
      if (modalMode === 'add') {
        await adminSubscriptionService.createPlan(planData);
      } else {
        await adminSubscriptionService.updatePlan(selectedPlan._id, planData);
      }
      fetchData();
      setModalMode(null);
      alert(modalMode === 'add' ? 'Plan created successfully' : 'Plan updated successfully');
    } catch (err) {
      console.error("Save plan error", err);
      alert('Failed to save plan');
    } finally {
      setIsModalLoading(false);
    }
  };


  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '6px', color: '#111827' }}>Monetization</h1>
        <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Manage subscription plans and track revenue performance</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading monetization data...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>{error}</div>
      ) : (
        <>
          {/* Pay-Per-View Content Table (New Section) */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>Pay-Per-View Content Performance</h2>
            <DataTable
              data={paidContent}
              columns={contentColumns}
              title="" // Hide internal title
              hideSearch={false}
              onEdit={handleEditContent} // Enable Edit action
              emptyMessage="No paid content found. enable 'Add Purchase Plan' when editing content."
            />
          </div>
        </>
      )}

      {/* Plan Modal */}
      {modalMode && (
        <PlanFormModal
          mode={modalMode}
          initialData={selectedPlan}
          onSave={handleSavePlan}
          onCancel={() => setModalMode(null)}
          isLoading={isModalLoading}
        />
      )}

      {/* Content Pricing Modal */}
      {editingContent && (
        <ContentPricingModal
          initialData={editingContent}
          onSave={handleSaveContentPrice}
          onCancel={() => setEditingContent(null)}
          isLoading={isModalLoading}
        />
      )}
    </div>
  );
};

// Helper Component for Content Pricing
function ContentPricingModal({ initialData, onSave, onCancel, isLoading }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        position: 'relative',
        margin: 'auto'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Edit Content Plan
          </h2>
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          onSave({
            price: formData.get('price')
          });
        }}>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Content Title
              </label>
              <div style={{ padding: '10px', background: '#f3f4f6', borderRadius: '8px', color: '#1f2937' }}>
                {initialData.title}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Price (₹) *
              </label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={initialData.price}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                Set 0 to make it free.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#46d369',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? 'Saving...' : <><Save size={18} /> Update Plan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// Helper Component for Monetization
function PlanFormModal({ mode, initialData, onSave, onCancel, isLoading }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        position: 'relative',
        margin: 'auto'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 1
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {mode === 'add' ? 'Add New Plan' : 'Edit Plan'}
          </h2>
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const features = formData.get('features').split('\n').filter(f => f.trim());
          const duration = formData.get('duration');

          // Calculate durationInDays based on duration
          let durationInDays;
          switch (duration) {
            case 'monthly':
              durationInDays = 30;
              break;
            case 'quarterly':
              durationInDays = 90;
              break;
            case 'yearly':
              durationInDays = 365;
              break;
            default:
              durationInDays = 30;
          }

          onSave({
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            duration: duration,
            durationInDays: durationInDays,
            features: features,
            maxDevices: parseInt(formData.get('maxDevices')),
            videoQuality: formData.get('videoQuality'),
            canDownload: formData.get('canDownload') === 'true',
            isActive: formData.get('isActive') === 'true'
          });
        }}>
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Plan Name *
                </label>
                <input
                  name="name"
                  defaultValue={initialData?.name || ''}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Description *
                </label>
                <textarea
                  name="description"
                  defaultValue={initialData?.description || ''}
                  required
                  rows="3"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Price (₹) *
                </label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialData?.price || ''}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Duration *
                </label>
                <select
                  name="duration"
                  defaultValue={initialData?.duration || 'monthly'}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Max Devices *
                </label>
                <input
                  name="maxDevices"
                  type="number"
                  min="1"
                  defaultValue={initialData?.maxDevices || 1}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Video Quality *
                </label>
                <select
                  name="videoQuality"
                  defaultValue={initialData?.videoQuality || 'HD'}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="SD">SD</option>
                  <option value="HD">HD</option>
                  <option value="4K">4K</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Download Allowed
                </label>
                <select
                  name="canDownload"
                  defaultValue={initialData?.canDownload !== false ? 'true' : 'false'}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Status
                </label>
                <select
                  name="isActive"
                  defaultValue={initialData?.isActive !== false ? 'true' : 'false'}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Features (one per line) *
                </label>
                <textarea
                  name="features"
                  defaultValue={initialData?.features?.join('\n') || ''}
                  required
                  rows="5"
                  placeholder="HD Quality&#10;1 Device&#10;Download Available"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#46d369',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '24px'
              }}
            >
              {isLoading ? 'Saving...' : <><Save size={18} /> {mode === 'add' ? 'Create Plan' : 'Update Plan'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const QuickBites = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const data = await adminQuickByteService.getAllReels();
      setReels(data);
    } catch (error) {
      console.error('Failed to fetch reels:', error);
      // alert('Failed to load Quick Bites');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'poster', label: 'Preview', sortable: false, render: (value) => (
        <img src={value?.url || value} alt="Thumb" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
      )
    },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'genre', label: 'Genre', sortable: true },
    { key: 'year', label: 'Year', sortable: true },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => `★ ${r || 0}` },
    {
      key: 'isPaid',
      label: 'Monetization',
      sortable: true,
      render: (isPaid, row) => (
        <span style={{ color: isPaid ? '#b45309' : '#166534', fontWeight: 'bold' }}>
          {isPaid ? `Paid (₹${row.price || 0})` : 'Free'}
        </span>
      )
    },
    { key: 'views', label: 'Views', sortable: true, render: (v) => v?.toLocaleString() || 0 },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status) => (
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '600',
          background: status === 'published' ? '#dcfce7' : '#f3f4f6',
          color: status === 'published' ? '#166534' : '#374151'
        }}>
          {status}
        </span>
      )
    },
    { key: 'createdAt', label: 'Created', sortable: true, render: (d) => new Date(d).toLocaleDateString() }
  ];

  const handleEdit = (item) => alert(`Edit functionality coming soon for ${item.title}`);

  const handleDelete = async (item) => {
    if (confirm(`Delete ${item.title}? This cannot be undone.`)) {
      try {
        await adminQuickByteService.deleteReel(item._id || item.id);
        fetchReels(); // Refresh list
      } catch (error) {
        alert('Failed to delete item');
      }
    }
  };

  const handleView = (item) => window.open(item.video?.url, '_blank');

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px', marginTop: 0, color: '#111827' }}>Quick Bites</h1>
          <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Manage vertical clips and short content</p>
          <div style={{ background: '#e7f5e7', border: '1px solid #46d369', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', fontSize: '0.8rem' }}>
            <strong>Vertical Content:</strong> {reels.length} clips active
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/quick-bytes/add')}
          style={{
            background: '#46d369',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#3ea055'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#46d369'}
        >
          Add Quick Bite
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading Quick Bites...</div>
      ) : (
        <DataTable
          data={reels}
          columns={columns}
          title="All Quick Bites"
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          emptyMessage="No vertical clips found."
        />
      )}
    </div>
  );
};

const AddQuickBite = () => {
  const navigate = useNavigate();
  const handleSave = async (formData) => {
    try {
      await adminQuickByteService.createReel(formData);
      alert('Quick Bite saved successfully!');
      navigate('/admin/quick-bytes');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save Quick Bite. Check console for details.');
    }
  };
  return (
    <QuickBitesForm
      onSave={handleSave}
      onCancel={() => navigate('/admin/quick-bytes')}
    />
  );
};

const Settings = () => {
  const settingsSections = [
    {
      title: 'App Configuration',
      icon: '⚙️',
      items: [
        { label: 'Platform Name', value: 'InPlay OTT', type: 'text' },
        { label: 'Default Language', value: 'English', type: 'select' },
        { label: 'Timezone', value: 'Asia/Kolkata', type: 'select' },
        { label: 'Maintenance Mode', value: false, type: 'toggle' }
      ]
    },
    {
      title: 'Content Settings',
      icon: '🎬',
      items: [
        { label: 'Auto-publish New Content', value: false, type: 'toggle' },
        { label: 'Content Review Required', value: true, type: 'toggle' },
        { label: 'Max Upload Size (MB)', value: '500', type: 'number' },
        { label: 'Allowed Video Formats', value: 'MP4, MOV, AVI', type: 'text' }
      ]
    },
    {
      title: 'Security Settings',
      icon: '🔒',
      items: [
        { label: 'Two-Factor Authentication', value: true, type: 'toggle' },
        { label: 'Session Timeout (minutes)', value: '60', type: 'number' },
        { label: 'Password Policy', value: 'Strong', type: 'select' },
        { label: 'IP Whitelisting', value: false, type: 'toggle' }
      ]
    },
    {
      title: 'Notification Settings',
      icon: '🔔',
      items: [
        { label: 'Email Notifications', value: true, type: 'toggle' },
        { label: 'Push Notifications', value: true, type: 'toggle' },
        { label: 'System Alerts', value: true, type: 'toggle' },
        { label: 'User Activity Alerts', value: false, type: 'toggle' }
      ]
    }
  ];

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}>Settings</h1>
        <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Configure application settings and preferences</p>
        <div style={{ background: '#e7f5e7', border: '1px solid #46d369', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', fontSize: '0.85rem' }}>
          <strong>Mock Settings:</strong> App configuration, content settings, security settings, notification settings
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex} style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{section.icon}</span>
                {section.title}
              </h2>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#374151',
                      flex: 1
                    }}>
                      {item.label}
                    </label>

                    <div style={{ flex: 1, maxWidth: '150px' }}>
                      {item.type === 'toggle' ? (
                        <label style={{
                          position: 'relative',
                          display: 'inline-block',
                          width: '44px',
                          height: '24px',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="checkbox"
                            defaultChecked={item.value}
                            style={{
                              opacity: 0,
                              width: 0,
                              height: 0
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: item.value ? '#46d369' : '#ccc',
                            borderRadius: '24px',
                            transition: '0.4s'
                          }}>
                            <span style={{
                              position: 'absolute',
                              height: '18px',
                              width: '18px',
                              left: item.value ? '23px' : '3px',
                              bottom: '3px',
                              backgroundColor: 'white',
                              borderRadius: '50%',
                              transition: '0.4s'
                            }}></span>
                          </span>
                        </label>
                      ) : item.type === 'select' ? (
                        <select
                          defaultValue={item.value}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value={item.value}>{item.value}</option>
                        </select>
                      ) : item.type === 'number' ? (
                        <input
                          type="number"
                          defaultValue={item.value}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          defaultValue={item.value}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        padding: '16px',
        border: '1px solid #e5e7eb',
        zIndex: 1000
      }}>
        <button
          onClick={handleSave}
          style={{
            background: '#46d369',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#3ea055'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#46d369'}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="content/library" element={<ContentLibrary />} />
        <Route path="content/add" element={<AddContent />} />
        <Route path="quick-bytes" element={<QuickBites />} />
        <Route path="quick-bytes/add" element={<AddQuickBite />} />
        <Route path="for-you" element={<ForYouReels />} />
        <Route path="users" element={<Users />} />
        <Route path="monetization/plans" element={<Monetization />} />
        <Route path="settings/app" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
}

