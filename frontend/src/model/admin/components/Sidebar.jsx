import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Smartphone,
  Shield,
  Layout,
  CreditCard,
  Repeat,
  Megaphone
} from 'lucide-react';

import { UserCheck } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, tabId: 'dashboard' },
  { name: 'Content', href: '/admin/content/library', icon: Film, tabId: 'content_library' },
  { name: 'Promotions', href: '/admin/promotions', icon: Megaphone, tabId: 'promotions' },
  { name: 'Banner Management', href: '/admin/banners', icon: Layout, tabId: 'banner_management' },
  { name: 'Quick Bites', href: '/admin/quick-bytes', icon: Zap, tabId: 'quick_bites' },
  { name: 'For You', href: '/admin/for-you', icon: Smartphone, tabId: 'for_you' },
  { name: 'Darmaa Sections', href: '/admin/darmaa-sections', icon: Film, tabId: 'darmaa_sections' },
  { name: 'Bhojpuri Sections', href: '/admin/bhojpuri-sections', icon: Film, tabId: 'bhojpuri_sections' },
  { name: 'Cinema Sections', href: '/admin/cinema-sections', icon: Film, tabId: 'cinema_sections' },
  { name: 'Audio Series', href: '/admin/audio-series', icon: Film, tabId: 'audio_series' },
  { name: 'Users', href: '/admin/users', icon: Users, tabId: 'users' },
  { name: 'Plan', href: '/admin/monetization/plans', icon: CreditCard, tabId: 'subscriptions' },
  { name: 'Subscription', href: '/admin/monetization/subscriptions', icon: Repeat, tabId: 'subscriptions' },
  { name: 'Legal Pages', href: '/admin/legal', icon: Shield, tabId: 'legal_pages' },
  { name: 'Tab Management', href: '/admin/tabs', icon: Layout, tabId: 'tab_management' },
  { name: 'Staff & Access', href: '/admin/staff-access', icon: UserCheck, superAdminOnly: true },
  { name: 'Notifications', href: '/admin/notifications', icon: Megaphone, tabId: 'dashboard' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, tabId: 'dashboard' }
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const userRole = user.role || 'super_admin';
  const permittedTabs = user.permittedTabs || [];

  const visibleNav = navigation.filter(item => {
    if (userRole === 'super_admin' || userRole === 'admin') return true;
    if (item.superAdminOnly) return false;
    return permittedTabs.includes(item.tabId);
  });

  return (
    <div className="admin-sidebar" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      width: collapsed ? '60px' : '200px',
      backgroundColor: '#1a1a1a',
      color: 'white',
      transition: 'width 0.3s ease',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div className="sidebar-header" style={{
        padding: '24px 20px',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        {!collapsed && (
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#46d369' }}>
            InPlay Admin
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="custom-scrollbar" data-lenis-prevent="true" style={{ flex: 1, padding: '20px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {visibleNav.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: collapsed ? '12px' : '12px 16px',
                    color: isActive ? '#46d369' : '#ccc',
                    textDecoration: 'none',
                    backgroundColor: isActive ? 'rgba(70, 211, 105, 0.1)' : 'transparent',
                    borderRight: isActive ? '3px solid #46d369' : '3px solid transparent',
                    transition: 'all 0.3s ease',
                    fontSize: '0.95rem',
                    fontWeight: isActive ? '600' : '400'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <item.icon size={20} style={{ marginRight: collapsed ? 0 : '12px' }} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{
        padding: '20px',
        borderTop: '1px solid #333',
        textAlign: 'center'
      }}>
        {!collapsed && (
          <div style={{
            fontSize: '0.8rem',
            color: '#666',
            lineHeight: '1.4'
          }}>
            InPlay OTT Platform<br />
            Admin Panel v1.0
          </div>
        )}
      </div>
    </div>
  );
}
