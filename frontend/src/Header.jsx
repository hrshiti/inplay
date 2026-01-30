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
                <div className="icon-container" onClick={() => navigate('/search')}>
                    <Search size={22} color="#fff" strokeWidth={2.5} />
                </div>
                <div className="icon-container" onClick={() => currentUser ? navigate('/my-space') : onLoginClick?.()}>
                    <User size={22} color="#fff" strokeWidth={2.5} />
                    <div className="notification-dot"></div>
                </div>
            </div>
        </div>
    );
};

export default Header;
