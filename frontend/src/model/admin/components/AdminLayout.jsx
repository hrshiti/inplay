import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import '../../../App.css';
import '../styles/admin.css';

import DailyCodeModal from './DailyCodeModal';
import adminAuthService from '../../../services/api/adminAuthService';

export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const todayStr = new Date().toISOString().split('T')[0];

  const isSubAdmin = user.role === 'sub_admin';
  const isDailyVerified = isSubAdmin
    ? user.dailyVerification?.lastVerifiedDate === todayStr || user.isDailyVerified === true
    : true;

  const handleDailySuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleLogout = () => {
    adminAuthService.logout();
    window.location.href = '/admin/login';
  };

  return (
    <div className="admin-layout" style={{
      height: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex'
    }}>
      <Sidebar
        key={refreshKey}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="admin-main" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginLeft: sidebarCollapsed ? '60px' : '200px',
        transition: 'margin-left 0.3s ease'
      }}>
        <Topbar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />

        <main className="admin-content custom-scrollbar" data-lenis-prevent="true" style={{
          flex: 1,
          padding: '0',
          overflowY: 'auto'
        }}>
          {children || <Outlet />}
        </main>

        {isSubAdmin && (
          <DailyCodeModal
            isOpen={!isDailyVerified}
            onSuccess={handleDailySuccess}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}
