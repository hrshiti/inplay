import { useState } from 'react';
import { Bell, Search, User, Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import adminAuthService from '../../../services/api/adminAuthService';

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  // Get admin user data from localStorage
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const handleLogout = () => {
    adminAuthService.logout();
    navigate('/admin/login');
  };
  return (
    <header className="admin-topbar" style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e1e5e9',
      padding: '0 24px',
      height: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Left Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onMenuClick}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="mobile-menu-btn"
        >
          <Menu size={20} />
        </button>

        <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a1a1a' }}>
          Admin Dashboard
        </div>
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Search */}
        <div className="search-container" style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            color: '#666'
          }} />
          <input
            type="text"
            placeholder="Search content, users..."
            style={{
              padding: '8px 12px 8px 40px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.9rem',
              width: '250px',
              backgroundColor: '#f8f9fa',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#46d369'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        {/* Notifications */}
        <button
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            position: 'relative',
            color: '#666'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '0.7rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600'
          }}>
            3
          </span>
        </button>

        {/* User Profile */}
        <div
          className="user-profile-dropdown"
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <div
            className="user-profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#46d369',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600'
            }}>
              <User size={16} />
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>
                {adminUser.name || 'Admin User'}
              </span>
              <span style={{
                fontSize: '0.75rem',
                color: '#666'
              }}>
                Super Admin
              </span>
            </div>
          </div>

          {/* Dropdown Menu */}
          <div className="dropdown-menu" style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: 'white',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            minWidth: '180px',
            opacity: showDropdown ? 1 : 0,
            visibility: showDropdown ? 'visible' : 'hidden',
            transform: showDropdown ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'all 0.3s ease',
            zIndex: 1000
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              fontSize: '0.9rem',
              color: '#666'
            }}>
              Signed in as {adminUser.name || 'Admin User'}
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                color: '#dc2626',
                fontSize: '0.9rem',
                cursor: 'pointer',
                borderRadius: '0 0 8px 8px',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
