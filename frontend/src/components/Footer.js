// File: src/components/Footer.js
import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      {/* Separator with added spacing */}
      <hr className="separator" />
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} LibreMetronome. MIT-License.</p>
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
    </footer>
  );
};

export default Footer;
