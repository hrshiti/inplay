import React from 'react';
import { Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({ currentUser, onLoginClick }) => {
    const navigate = useNavigate();

    return (
        <div className="mx-header">
            <div className="mx-header-left">
                <div className="brand-logo">
                    {/* Amazon style text or Inplay text */}
                    <span className="brand-primary">inplay</span>
                </div>
            </div>
            <div className="mx-header-right">
                <button
                    className="membership-plan-tag"
                    onClick={() => navigate('/membership-plans')}
                    style={{
                        background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                        color: '#000',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}
                >
                    <span style={{ fontSize: '1rem' }}>💎</span> Membership Plan
                </button>
                <div style={{ display: 'flex', gap: '15px', marginLeft: '15px', alignItems: 'center' }}>
                    <Search
                        size={22}
                        color="white"
                        style={{ cursor: 'pointer', opacity: 0.8 }}
                        onClick={() => {
                            if (!currentUser) onLoginClick();
                            else navigate('/search');
                        }}
                    />
                    <User
                        size={22}
                        color="white"
                        style={{ cursor: 'pointer', opacity: 0.8 }}
                        onClick={() => {
                            if (!currentUser) onLoginClick();
                            else navigate('/my-space');
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Header;
