// File: src/components/Header.js
import React from 'react';
import './Header.css';
import LibreMetronomeLogo from '../../assets/logo/Logo_LibreMetronome.svg';

const Header = () => {
  return (
    <header className="header">
      <img src={LibreMetronomeLogo} alt="LibreMetronome" className="header-logo" />
    </header>
  );
};

export default Header;
