// File: src/components/Footer/Footer.js
import React from 'react';
import './Footer.css';
import { SupportButton } from '../Support';
import { IS_NATIVE_APP } from '../../nativeApp';

const SOURCE_URL = 'https://github.com/hybridpicker/LibreMetronome';

// One quiet line. The native app (paid, ad-free, offline) renders no footer at
// all: the licence and source link live in the Guide's About block, and the
// donation link exists only on the web.
const Footer = () => {
  const year = new Date().getFullYear();
  if (IS_NATIVE_APP) return <footer className="footer footer--native" />;
  return (
    <footer className="footer">
      <p className="footer-line">
        <span>&copy; {year} LibreMetronome</span>
        <span aria-hidden="true">·</span>
        <span>GPL v3</span>
        <span aria-hidden="true">·</span>
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Source</a>
        <span aria-hidden="true">·</span>
        <SupportButton useInternalPage={true} />
      </p>
    </footer>
  );
};

export default Footer;
