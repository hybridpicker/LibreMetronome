// File: src/components/Footer.js
import React from 'react';
import './Footer.css';
import { SupportButton } from '../Support';
import { IS_NATIVE_APP } from '../../nativeApp';

const Footer = () => {
  return (
    <footer className="footer">
      {/* Separator with added spacing */}
      <hr className="separator" />
      <div className="footer-content">
        <div className="footer-left">
          <p>&copy; {new Date().getFullYear()} LibreMetronome | GPL v3 License.</p>
          <p>
            <a
              href="https://github.com/hybridpicker/LibreMetronome"
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