// File: src/components/Footer.js
import React from 'react';
import './Footer.css';
import { SupportButton } from '../Support';
import { IS_NATIVE_APP } from '../../nativeApp';

const SOURCE_URL = 'https://github.com/hybridpicker/LibreMetronome';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className={`footer${IS_NATIVE_APP ? ' footer--native' : ''}`}>
      {/* Phones (web build): one slim line. The native phone build renders no
          footer; the licence text and source link live in the Guide's About
          block instead. */}
      <p className="footer-phone-line">
        &copy; {year} LibreMetronome | GPL v3 |{' '}
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Source</a>
      </p>
      {/* Separator with added spacing */}
      <hr className="separator" />
      <div className="footer-content">
        <div className="footer-left">
          <p>&copy; {year} LibreMetronome | GPL v3 License.</p>
          <p>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Source Code
            </a>
          </p>
        </div>
        <div className="footer-right">
          {!IS_NATIVE_APP && <SupportButton useInternalPage={true} />}
        </div>
      </div>
    </footer>
  );
};

export default Footer;