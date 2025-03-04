// File: src/components/Footer.js
import React from 'react';
import packageJson from '../../../package.json';
import './Footer.css';

const Footer = () => {
  const version = packageJson.version;
  const isBeta = version.startsWith('0.');

  return (
    <footer className="footer">
      {/* Separator with added spacing */}
      <hr className="separator" />
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} LibreMetronome | GPL v3 License.</p>
        <p>
          <a
            href="https://github.com/hybridpicker/LibreMetronome"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Source Code
          </a>{' '}|{' '}Version: {version} {isBeta ? '(Beta)' : ''}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
