import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import '../../../App.css';
import '../styles/admin.css';

export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="admin-layout" style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex'
    }}>
      <Sidebar
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

        <main className="admin-content" style={{
          flex: 1,
          padding: '0',
          overflowY: 'auto'
        }}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
