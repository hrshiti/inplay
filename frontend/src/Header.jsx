import React from 'react';
import { useNavigate } from 'react-router-dom';

const headerLogo = '/FINAL_LOGO_copy__1_.jpg-removebg-preview (2).png';

const Header = ({ currentUser, onLoginClick }) => {
    const navigate = useNavigate();

    return (
        <div className="mx-header">
            <div className="mx-header-left">
                <div className="brand-logo">
                    <img src={headerLogo} alt="InPlay" className="brand-logo-image" />
                </div>
            </div>
        </div>
    );
};

export default Header;
