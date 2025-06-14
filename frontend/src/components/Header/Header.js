// File: src/components/Header.js
import React from 'react';
import './Header.css';
import LibreMetronomeLogo from '../../assets/logo/Logo_LibreMetronome.svg';

const Header = ({ onAdminClick }) => {
  return (
    <header className="header">
      <img src={LibreMetronomeLogo} alt="LibreMetronome" className="header-logo" />
      <button 
        className="admin-button" 
        onClick={onAdminClick}
        title="Admin Panel"
      >
        ⚙️
      </button>
    </header>
  );
};

export default Header;
