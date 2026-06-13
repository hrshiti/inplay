import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const headerLogo = '/FINAL_LOGO_copy__1_.jpg-removebg-preview (2).png';

const Header = ({ currentUser, onLoginClick }) => {
    const navigate = useNavigate();

    return (
        <div className="mx-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 16px' }}>
            <div className="brand-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <img src={headerLogo} alt="InPlay" className="brand-logo-image" style={{ height: '30px' }} />
            </div>
            
            <div 
                onClick={() => navigate('/search')}
                style={{ 
                    cursor: 'pointer', 
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Search size={22} color="#fff" />
            </div>
        </div>
    );
};

export default Header;
