import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { X, Save, User as UserIcon, Shield, CheckCircle2, AlertCircle, Video, Headphones, Smartphone, Megaphone, Layers, Film } from 'lucide-react';
import AdminLayout from './components/AdminLayout';
import DataTable from './components/tables/DataTable';
import ContentForm from './components/forms/ContentForm';
import QuickBitesForm from './components/forms/QuickBitesForm';
import { ADMIN_ANALYTICS, ADMIN_ACTIVITY_LOGS, ADMIN_MOVIES, ADMIN_SERIES, ADMIN_USERS, ADMIN_SUBSCRIPTIONS, ADMIN_REELS } from './services/mockData';
import adminUserService from '../../services/api/adminUserService';
import adminSubscriptionService from '../../services/api/adminSubscriptionService';
import adminDashboardService from '../../services/api/adminDashboardService';
import adminQuickByteService from '../../services/api/adminQuickByteService';
import adminContentService from '../../services/api/adminContentService';
import adminMonetizationService from '../../services/api/adminMonetizationService';
import adminAuthService from '../../services/api/adminAuthService';
import ForYouReels from './ForYouReels';
import AudioSeriesPage from './pages/audio-series/AudioSeriesPage';
import AdPromotionPage from './pages/AdPromotionPage';
import LegalPages from './pages/LegalPages';
import TabManagementPage from './pages/TabManagementPage';
import adminTabService from '../../services/api/adminTabService';
const getImageUrl = (path) => {
  if (!path) return "https://placehold.co/300x450/111/FFF?text=No+Image";
  // Fallback to the utility if available, or just use the same logic
  let sanitizedPath = String(path).replace(/^undefined\//, '/');
  if (sanitizedPath.startsWith('http://') || sanitizedPath.startsWith('https://')) return sanitizedPath;
  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.inplays.in/api';
  const serverRoot = rawApiUrl.replace(/\/$/, '').replace(/\/api$/, '');
  const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
  return `${serverRoot}${cleanPath}`;
};

const InfoItem = ({ label, value, color }) => (
  <div style={{ marginBottom: '8px' }}>
    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>{label}</p>
    <p style={{ margin: '4px 0 0', fontSize: '0.95rem', fontWeight: '600', color: color || '#1f2937' }}>{value}</p>
  </div>
);

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
      const [dashboardData, paidContent] = await Promise.all([
        adminDashboardService.getDashboardAnalytics(),
        adminMonetizationService.getPaidContentPerformance().catch(err => {
          console.error("Failed to load paid content", err);
          return [];
        })
      ]);

      // Merge paid content into subscription plans for the dashboard view
      if (dashboardData && dashboardData.subscriptions && paidContent) {
        const contentItems = paidContent.map(item => ({
          _id: item._id || item.id,
          name: item.title,
          subscriberCount: item.purchases || 0,
          revenue: item.revenue || 0,
          isOneTimePurchase: true
        }));

        // Combine plans and paid content, sorted by revenue (highest first)
        dashboardData.subscriptions.plans = [
          ...dashboardData.subscriptions.plans,
          ...contentItems
        ].sort((a, b) => b.revenue - a.revenue);
      }

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

  const { users, content, revenue, subscriptions, recentActivity, quickBites, audioSeries, forYou, promotions, tabs } = data;
  const movieCount = content.byType.find(t => t._id === 'movie')?.count || 0;
  const seriesCount = content.byType.find(t => t._id === 'series')?.count || 0;

  // Safe access for new props
  const qbTotal = quickBites?.total || 0;
  const asTotal = audioSeries?.total || 0;
  const fyTotal = forYou?.total || 0;
  const promoActive = promotions?.active || 0;
  const tabsActive = tabs?.active || 0;

  const StatCard = ({ title, value, subtext, icon: Icon, color, bgColor }) => (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151', margin: 0 }}>{title}</h3>
        <div style={{ padding: '8px', background: bgColor, borderRadius: '50%', color: color }}>
          <Icon size={18} />
        </div>
      </div>
      <div>
        <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', margin: 0 }}>{value}</p>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0' }}>{subtext}</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '16px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}>Dashboard Overview</h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Welcome back! Here's a comprehensive overview of your platform's performance.</p>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%', flexShrink: 0 }}></div>
          <p style={{ color: '#166534', fontSize: '0.9rem', margin: 0, fontWeight: '500' }}>
            System Status: <strong>Operational</strong> • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Primary Stats Row */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: '#374151' }}>Key Metrics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard
          title="Total Users"
          value={users.totalUsers.toLocaleString()}
          subtext={`${users.activeUsers} active now`}
          icon={UserIcon}
          color="#16a34a"
          bgColor="#dcfce7"
        />
        <StatCard
          title="Total Content"
          value={content.overview.totalContent}
          subtext={`${movieCount} movies, ${seriesCount} series`}
          icon={Film}
          color="#2563eb"
          bgColor="#dbeafe"
        />
        <StatCard
          title="Total Views"
          value={(content.overview.globalTotalViews || content.overview.totalViews).toLocaleString()}
          subtext="Lifetime content views"
          icon={Video}
          color="#7c3aed"
          bgColor="#ede9fe"
        />
        <StatCard
          title="Revenue"
          value={`₹${revenue.overview.totalRevenue.toLocaleString()}`}
          subtext="Total lifetime revenue"
          icon={Shield}
          color="#d97706"
          bgColor="#fef3c7"
        />
      </div>

      {/* Secondary Stats Row - Module Breakdowns */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: '#374151' }}>Module Overview</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard
          title="Quick Bites"
          value={qbTotal}
          subtext={`${quickBites?.totalViews?.toLocaleString() || 0} views`}
          icon={Smartphone}
          color="#db2777"
          bgColor="#fce7f3"
        />
        <StatCard
          title="Audio Series"
          value={asTotal}
          subtext={`${audioSeries?.totalViews?.toLocaleString() || 0} plays`}
          icon={Headphones}
          color="#0891b2"
          bgColor="#cffafe"
        />
        <StatCard
          title="For You Reels"
          value={fyTotal}
          subtext={`${forYou?.totalViews?.toLocaleString() || 0} views`}
          icon={Video}
          color="#ea580c"
          bgColor="#ffedd5"
        />
        <StatCard
          title="Active Ads"
          value={promoActive}
          subtext={`${promotions?.total || 0} total campaigns`}
          icon={Megaphone}
          color="#4f46e5"
          bgColor="#e0e7ff"
        />
        <StatCard
          title="Active Tabs"
          value={tabsActive}
          subtext={`${tabs?.total || 0} configured tabs`}
          icon={Layers}
          color="#0d9488"
          bgColor="#ccfbf1"
        />
      </div>

      {/* Activity and Subscriptions Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

        {/* Recent Activity */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#111827' }}>Recent Activity</h3>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Last 10 events</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: index !== recentActivity.length - 1 ? '12px' : 0, borderBottom: index !== recentActivity.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: activity.type === 'user_registration' ? '#dcfce7' :
                      activity.type === 'content_upload' ? '#dbeafe' :
                        activity.type === 'payment' ? '#fef3c7' : '#f3f4f6',
                    color: activity.type === 'user_registration' ? '#16a34a' :
                      activity.type === 'content_upload' ? '#2563eb' :
                        activity.type === 'payment' ? '#d97706' : '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {activity.type === 'user_registration' ? <UserIcon size={16} /> :
                      activity.type === 'content_upload' ? <Video size={16} /> :
                        activity.type === 'payment' ? <Shield size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '2px', color: '#1f2937' }}>{activity.message}</p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                      {new Date(activity.timestamp).toLocaleString()} • {activity.user}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>No recent activity found.</p>
            )}
          </div>
        </div>

        {/* Subscription Performance */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#111827' }}>Subscription Performance</h3>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Revenue by Plan</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {subscriptions.plans.length > 0 ? (
              subscriptions.plans.map((plan) => {
                const percentage = users.totalUsers > 0 ? (plan.subscriberCount / users.totalUsers) * 100 : 0;
                return (
                  <div key={plan._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151', margin: 0 }}>{plan.name}</p>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>{plan.subscriberCount} {plan.isOneTimePurchase ? 'purchases' : 'active subscribers'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>₹{Number(plan.revenue).toLocaleString()}</p>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: '#46d369', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>No subscription plans data available.</p>
            )}

            {/* Churn Rate Mini-Card */}
            <div style={{ marginTop: '16px', padding: '16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: '#991b1b', fontWeight: '600', fontSize: '0.9rem', margin: 0 }}>Churned Users (This Period)</p>
                <span style={{ background: '#fff', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {subscriptions.churnRate?.churnedUsers || 0} users
                </span>
              </div>
            </div>
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
  const [tabsData, setTabsData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10
  });



  useEffect(() => {
    const init = async () => {
      await fetchTabs();
      await fetchContent(currentPage);
    };
    init();
  }, [currentPage]);

  const fetchTabs = async () => {
    try {
      const data = await adminTabService.getAllTabs();
      setTabsData(data || []);
    } catch (error) {
      console.error("Failed to fetch tabs", error);
    }
  };

  const fetchContent = async (page = 1) => {
    try {
      setLoading(true);
      // Fetch a large enough limit to allow client-side filtering and pagination for now
      // This is the most reliable way to keep all tabs working without backend changes
      const response = await adminContentService.getAllContent({ page: 1, limit: 1000 });
      const rawData = response.data || [];
      setContentList(rawData);
    } catch (error) {
      console.error("Failed to fetch content", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = ['All'];

  const filteredContent = contentList.filter(item => {
    if (activeTab === 'All') return true;
    return true;
  });

  // Client-side pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
  const paginatedContent = filteredContent.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const columns = [
    { key: 'image', label: 'Poster', sortable: false, render: (value, row) => <img src={getImageUrl(row.poster?.url || row.image)} alt="poster" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} /> },
    { key: 'title', label: 'Title', sortable: true },
    {
      key: 'type', label: 'Type', sortable: true, render: (val, row) => {
        if (val && val !== '-') return val;
        if (row.dynamicTabId) {
          const tab = tabsData.find(t => t._id === row.dynamicTabId);
          return tab ? tab.name : '-';
        }
        return '-';
      }
    },
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
    navigate(`/admin/content/edit/${item._id}`);
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
    navigate(`/admin/content/view/${item._id}`);
  };



  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px', marginTop: 0, color: '#111827' }}>Content Library</h1>
          <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Manage your movies, series, and other content</p>
          <div style={{ background: '#e7f5e7', border: '1px solid #46d369', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', fontSize: '0.85rem' }}>
            <strong style={{ color: '#064e3b' }}>Total Items:</strong> <span style={{ color: '#065f46' }}>{filteredContent.length} items (Page {currentPage} of {Math.max(1, totalPages)})</span>
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
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading content library...</div>
      ) : (
        <>
          <DataTable
            data={paginatedContent}
            columns={columns}
            title={`${activeTab === 'All' ? 'All Content' : activeTab}`}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            emptyMessage={`No ${activeTab.toLowerCase()} content found.`}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', paddingBottom: '24px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}
              >
                Previous
              </button>
              <div style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: '500' }}>
                Page <span style={{ color: '#111827' }}>{currentPage}</span> of {totalPages}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: currentPage === totalPages ? '#f3f4f6' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}


    </div>
  );
};

// ... (other components)

const EditContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await adminContentService.getContent(id);
        setContent(data);
      } catch (e) {
        console.error(e);
        navigate('/admin/content/library');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id, navigate]);

  const handleUpdate = async (formData) => {
    try {
      await adminContentService.updateContent(id, formData);
      alert('Content updated successfully!');
      navigate('/admin/content/library');
    } catch (err) {
      console.error("Failed to update content", err);
      alert('Failed to update content: ' + (err.message || 'Unknown error'));
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading content details...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <ContentForm
        content={content}
        onSave={handleUpdate}
        onCancel={() => navigate('/admin/content/library')}
      />
    </div>
  );
};

const ViewContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await adminContentService.getContent(id);
        setContent(data);
      } catch (e) {
        console.error(e);
        navigate('/admin/content/library');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id, navigate]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      Loading content details...
    </div>
  );
  if (!content) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '20px', backdropFilter: 'blur(4px)'
    }}>
      <div
        className="admin-modal-scroll"
        style={{
          background: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px',
          maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: 'white', padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6', zIndex: 10, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{content.title}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{content.type}</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{content.status}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/content/library')}
            style={{
              background: '#f3f4f6', border: 'none', cursor: 'pointer',
              padding: '8px', borderRadius: '50%', color: '#374151', display: 'flex'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '32px' }}>
            {/* Left Column: Media & Genres */}
            <div>
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
                <img
                  src={getImageUrl(content.poster?.url || content.image)}
                  alt="Poster"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px',
                  borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold'
                }}>
                  {content.rating > 0 ? `★ ${content.rating}` : 'No Rating'}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>Genres</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {content.genre?.map(g => (
                    <span key={g} style={{ background: '#ecfdf5', color: '#065f46', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>
                      {g}
                    </span>
                  ))}
                  {(!content.genre || content.genre.length === 0) && <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No genres added</span>}
                </div>
              </div>

              {content.tags?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>Tags</h4>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {content.tags.map(tag => (
                      <span key={tag} style={{ color: '#6b7280', fontSize: '0.75rem', border: '1px solid #e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', marginBottom: '8px', borderBottom: '2px solid #46d369', display: 'inline-block' }}>Description</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', color: '#4b5563' }}>{content.description || 'No description available.'}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f9fafb', padding: '20px', borderRadius: '12px' }}>
                <InfoItem label="Release Year" value={content.year} />
                <InfoItem label="Language" value={content.language || 'N/A'} />
                <InfoItem label="Monetization" value={content.isPaid ? `Paid (₹${content.price})` : 'Free'} color={content.isPaid ? '#b45309' : '#059669'} />
                <InfoItem label="View Count" value={content.views?.toLocaleString() || 0} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <InfoItem label="Director" value={content.director?.join(', ') || content.director || 'N/A'} />
                <InfoItem label="Producer" value={content.producer || 'N/A'} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoItem label="Main Cast" value={content.cast || 'N/A'} />
                </div>
              </div>

              {content.video?.url && (
                <div style={{ marginTop: 'auto', borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>Video Source</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <a
                      href={content.video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1, textDecoration: 'none', background: '#111827', color: 'white',
                        padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '8px', fontWeight: '600'
                      }}
                    >
                      <Film size={18} /> Open Video Link
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Series Episodes Section */}
          {(content.type === 'series' || content.type === 'hindi_series') && content.seasons?.length > 0 && (
            <div style={{ marginTop: '32px', borderTop: '1px solid #f3f4f6', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Seasons & Episodes</h3>
              {content.seasons.map((season) => (
                <div key={season._id} style={{ marginBottom: '24px', background: '#f9fafb', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '700', color: '#111827', display: 'flex', justifyContent: 'space-between' }}>
                    Season {season.seasonNumber}: {season.title || 'Untitled Season'}
                    <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal' }}>{season.episodes?.length || 0} Episodes</span>
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {season.episodes?.map((episode) => (
                      <div key={episode._id} style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div>
                          <span style={{ fontWeight: '700', color: '#46d369', marginRight: '8px' }}>E{episode.episodeNumber}</span>
                          <span style={{ fontWeight: '600', color: '#374151' }}>{episode.title}</span>
                          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>{episode.description?.substring(0, 100)}{episode.description?.length > 100 ? '...' : ''}</p>
                        </div>
                        {episode.video?.url && (
                          <a href={episode.video.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
                            View Video
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
        avatar: getImageUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`,
        name: user.name,
        email: user.email,
        plan: user.subscription?.plan?.name || 'Free',
        status: user.isActive ? 'active' : 'inactive',
        totalWatchTime: ((user.watchHistory?.reduce((acc, entry) => acc + (entry.watchedSeconds || 0), 0) || 0) / 3600).toFixed(1),
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
        <img src={getImageUrl(value)} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
      )
    },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'plan', label: 'Plan', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'totalWatchTime', label: 'Watch Time (hrs)', sortable: true },
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
          <div
            className="admin-modal-scroll"
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
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
                  src={getImageUrl(selectedUser.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=random&color=fff`}
                  alt="User"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #46d369' }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>{selectedUser.name}</h3>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{selectedUser.email}</p>
                </div>
              </div>

              {modalMode === 'view' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <InfoItem label="Status" value={selectedUser.isActive ? 'Active' : 'Inactive'} color={selectedUser.isActive ? '#059669' : '#dc2626'} />
                  <InfoItem label="Role" value={selectedUser.role} />
                  <InfoItem label="Plan" value={selectedUser.subscription?.plan?.name || 'Free'} />
                  <InfoItem label="Joined On" value={new Date(selectedUser.createdAt).toLocaleDateString()} />
                  <InfoItem label="Last Login" value={selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : 'Never'} />
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
    { key: 'revenue', label: 'Revenue (₹)', sortable: true, render: (value) => `₹${Number(value).toLocaleString()}` },
    { key: 'features', label: 'Features', sortable: false, render: (value) => value.length > 0 ? value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : '') : 'N/A' }
  ];

  // New columns for Pay-Per-View table
  const contentColumns = [
    {
      key: 'title', label: 'Content Title', sortable: true, render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={getImageUrl(row.poster)} alt="" style={{ width: '30px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
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
          <div style={{ marginBottom: '40px' }}>
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

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#374151' }}>Membership Plans</h2>
              <button
                onClick={handleAddNew}
                style={{
                  background: '#46d369',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Add New Membership Plan
              </button>
            </div>
            <DataTable
              data={plans}
              columns={planColumns}
              title=""
              onEdit={handleEdit}
              onDelete={handleDelete}
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
      <div
        className="admin-modal-scroll"
        style={{
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
        }}
      >
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
            case 'half-yearly':
              durationInDays = 180;
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
                  <option value="quarterly">Quarterly (3 Months)</option>
                  <option value="half-yearly">Half-Yearly (6 Months)</option>
                  <option value="yearly">Yearly (12 Months)</option>
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
      key: 'poster', label: 'Preview', sortable: false, render: (value, row) => {
        // Handle various possible image structures
        const imgUrl = getImageUrl(value?.url || value || row.thumbnail?.url || row.thumbnail || row.image?.url || row.image);
        return <img src={imgUrl} alt="Thumb" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} onError={(e) => { e.target.style.display = 'none'; }} />
      }
    },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'genre', label: 'Genre', sortable: true },
    { key: 'year', label: 'Year', sortable: true },
    { key: 'rating', label: 'Rating', sortable: true, render: (r) => `★ ${r || 0}` },
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

  const handleEdit = (item) => navigate(`/admin/quick-bytes/edit/${item._id || item.id}`);

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

  const handleView = (item) => navigate(`/admin/quick-bytes/view/${item._id || item.id}`);

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px', marginTop: 0, color: '#111827' }}>Quick Bites</h1>
          <p style={{ color: '#4b5563', fontSize: '0.85rem' }}>Manage vertical clips and short content</p>
          <div style={{ background: '#e7f5e7', border: '1px solid #46d369', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', fontSize: '0.8rem' }}>
            <strong style={{ color: '#064e3b' }}>Vertical Content:</strong> <span style={{ color: '#065f46' }}>{reels.length} clips active</span>
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

const ViewQuickBite = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await adminQuickByteService.getReelById(id);
        setContent(data);
      } catch (e) {
        console.error(e);
        navigate('/admin/quick-bytes');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id, navigate]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      Loading Quick Bite details...
    </div>
  );
  if (!content) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '20px', backdropFilter: 'blur(4px)'
    }}>
      <div
        className="custom-scrollbar"
        style={{
          background: 'white', borderRadius: '16px', width: '100%', maxWidth: '800px',
          maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#46d369 #f3f4f6'
        }}
      >
        <div style={{
          position: 'sticky', top: 0, background: 'white', padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6', zIndex: 10, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{content.title}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{content.type || 'Quick Bite'}</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{content.status}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/quick-bytes')}
            style={{
              background: '#f3f4f6', border: 'none', cursor: 'pointer',
              padding: '8px', borderRadius: '50%', color: '#374151', display: 'flex'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '32px' }}>
            <div>
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
                <img
                  src={getImageUrl(content.thumbnail?.url || content.poster?.url || content.image)}
                  alt="Poster"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              <InfoItem label="Total Micro Videos" value={content.episodes?.length || (content.video ? 1 : 0)} color="#46d369" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', marginBottom: '8px', borderBottom: '2px solid #46d369', display: 'inline-block' }}>Description</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', color: '#4b5563' }}>{content.description || 'No description available.'}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f9fafb', padding: '20px', borderRadius: '12px' }}>
                <InfoItem label="Genre" value={content.genre || 'Entertainment'} />
                <InfoItem label="Year" value={content.year} />
                <InfoItem label="Monetization" value={content.isPaid ? `Paid (₹${content.price})` : 'Free'} color={content.isPaid ? '#b45309' : '#059669'} />
                <InfoItem label="Views" value={content.views?.toLocaleString() || 0} />
                <InfoItem label="Rating" value={`★ ${content.rating || 0}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
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

const EditQuickBite = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);

  useEffect(() => {
    fetchContent();
  }, [id]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const data = await adminQuickByteService.getReelById(id); // Use getReelById
      setContent(data);
    } catch (error) {
      console.error("Failed to load content for edit", error);
      alert("Failed to load Quick Bite details.");
      navigate('/admin/quick-bytes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (formData) => {
    try {
      await adminQuickByteService.updateReel(id, formData); // Use updateReel
      alert('Quick Bite updated successfully!');
      navigate('/admin/quick-bytes');
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Failed to update: ' + error.message);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading details...</div>;
  if (!content) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Content not found</div>;

  return (
    <QuickBitesForm
      content={content}
      onSave={handleUpdate}
      onCancel={() => navigate('/admin/quick-bytes')}
    />
  );
};

const Settings = () => {
  const [adminProfile, setAdminProfile] = useState({ name: '', email: '' });
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await adminAuthService.getProfile();
      setAdminProfile({ name: data.name, email: data.email });
      setError(null);
    } catch (err) {
      console.error('Failed to load profile', err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await adminAuthService.updateProfile({ name: adminProfile.name }); // Only updates name for now based on typical flows
      setSuccess('Profile details updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Update failed', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (security.newPassword !== security.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (security.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await adminAuthService.changePassword(security.currentPassword, security.newPassword);
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Password change failed', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Admin Profile...</div>;

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}>Admin Profile</h1>
        <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>Manage your account settings and security preferences</p>
      </div>

      {error && (
        <div style={{ marginBottom: '20px', padding: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ marginBottom: '20px', padding: '12px', background: '#dcfce7', border: '1px solid #22c55e', borderRadius: '8px', color: '#15803d' }}>
          {success}
        </div>
      )}

      {/* Profile Details Section */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon size={20} /> Personal Information
          </h2>
        </div>
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Full Name
              </label>
              <input
                type="text"
                value={adminProfile.name}
                onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Email Address
              </label>
              <input
                type="email"
                value={adminProfile.email}
                disabled
                title="Email cannot be changed directly"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px' }}>Email cannot be changed.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#46d369', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
              >
                {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security Section */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} /> Security & Password
          </h2>
        </div>
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Current Password
              </label>
              <input
                type="password"
                value={security.currentPassword}
                onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                required
                placeholder="Enter current password"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={security.newPassword}
                  onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                  required
                  placeholder="At least 6 characters"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={security.confirmPassword}
                  onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                  required
                  placeholder="Confirm new password"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#374151', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
              >
                {saving ? 'Processing...' : <><Shield size={18} /> Update Password</>}
              </button>
            </div>
          </form>
        </div>
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
        <Route path="content/edit/:id" element={<EditContent />} />
        <Route path="content/view/:id" element={<ViewContent />} />
        <Route path="quick-bytes" element={<QuickBites />} />
        <Route path="quick-bytes/add" element={<AddQuickBite />} />
        <Route path="quick-bytes/edit/:id" element={<EditQuickBite />} />
        <Route path="quick-bytes/view/:id" element={<ViewQuickBite />} />
        <Route path="for-you" element={<ForYouReels />} />
        <Route path="users" element={<Users />} />
        <Route path="audio-series" element={<AudioSeriesPage />} />
        <Route path="audio-series/add" element={<AudioSeriesPage />} />
        <Route path="audio-series/edit/:id" element={<AudioSeriesPage />} />
        <Route path="monetization/plans" element={<Monetization />} />
        <Route path="promotions" element={<AdPromotionPage />} />
        <Route path="promotions/add" element={<AdPromotionPage />} />
        <Route path="promotions/edit/:id" element={<AdPromotionPage />} />
        <Route path="legal" element={<LegalPages />} />
        <Route path="tabs" element={<TabManagementPage />} />
        <Route path="settings/app" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
}

