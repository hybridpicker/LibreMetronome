// File: src/components/Header/Header.js
import React from 'react';
import { ReactComponent as LibreMetronomeLogo } from '../../assets/logo/Logo_LibreMetronome.svg';

const Header = () => (
  <header className="header">
    <LibreMetronomeLogo className="header-logo" role="img" aria-label="LibreMetronome" focusable="false" />
  </header>
);

export default Header;
