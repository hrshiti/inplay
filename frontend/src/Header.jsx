import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ currentUser, onLoginClick }) => {
    const navigate = useNavigate();
    const isSubscribed = currentUser?.subscription?.isActive;

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
                    title={isSubscribed ? "Premium Member" : "Become a Member"}
                    style={{
                        background: isSubscribed
                            ? 'linear-gradient(135deg, #28a745, #1e7e34)' // Green for members
                            : 'linear-gradient(135deg, #e50914, #b20710)', // Red for non-members
                        color: '#fff',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSubscribed
                            ? '0 4px 12px rgba(40, 167, 69, 0.4)'
                            : '0 4px 12px rgba(229, 9, 20, 0.3)',
                        flexShrink: 0,
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = isSubscribed
                            ? '0 6px 16px rgba(40, 167, 69, 0.6)'
                            : '0 6px 16px rgba(229, 9, 20, 0.5)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = isSubscribed
                            ? '0 4px 12px rgba(40, 167, 69, 0.4)'
                            : '0 4px 12px rgba(229, 9, 20, 0.3)';
                    }}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M6 3h12l4 6-10 12L2 9z" />
                        <path d="M11 3 8 9l3 12" />
                        <path d="M13 3l3 6-3 12" />
                        <path d="M2 9h20" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Header;
