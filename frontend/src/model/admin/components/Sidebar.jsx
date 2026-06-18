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

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Content', href: '/admin/content/library', icon: Film },
  { name: 'Promotions', href: '/admin/promotions', icon: Megaphone },
  { name: 'Quick Bites', href: '/admin/quick-bytes', icon: Zap },
  { name: 'For You', href: '/admin/for-you', icon: Smartphone },
  { name: 'Darmaa Sections', href: '/admin/darmaa-sections', icon: Film },
  { name: 'Bhojpuri Sections', href: '/admin/bhojpuri-sections', icon: Film },
  { name: 'Cinema Sections', href: '/admin/cinema-sections', icon: Film },
  { name: 'Audio Series', href: '/admin/audio-series', icon: Film },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Plan', href: '/admin/monetization/plans', icon: CreditCard },
  { name: 'Subscription', href: '/admin/monetization/subscriptions', icon: Repeat },
  { name: 'Legal Pages', href: '/admin/legal', icon: Shield },
  { name: 'Tab Management', href: '/admin/tabs', icon: Layout },
  { name: 'Notifications', href: '/admin/notifications', icon: Megaphone },
  { name: 'Settings', href: '/admin/settings/app', icon: Settings }
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

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
      <nav style={{ flex: 1, padding: '20px 0' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navigation.map((item) => {
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
