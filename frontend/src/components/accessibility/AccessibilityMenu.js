import React, { useState, useEffect } from 'react';
import AccessibilitySettings from './AccessibilitySettings';
import { playAudioFeedback } from '../../utils/accessibility/accessibilityUtils';
import './AccessibilityMenu.css';

const AccessibilityMenu = () => {
  const [showSettings, setShowSettings] = useState(false);
  
  // Close settings panel with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
        if (window.audioFeedbackEnabled) {
          playAudioFeedback('click');
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSettings]);
  
  const handleButtonClick = () => {
    setShowSettings(!showSettings);
    if (window.audioFeedbackEnabled) {
      playAudioFeedback('click');
    }
  };
  
  return (
    <div className="accessibility-container">
      <button 
        className="accessibility-toggle"
        onClick={handleButtonClick}
        aria-label="Accessibility settings"
        aria-expanded={showSettings}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="accessibility-icon" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8a2 2 0 100-4 2 2 0 000 4z"></path>
          <path d="M10 12h4"></path>
          <path d="M12 16v4"></path>
          <path d="M8 9l2 3"></path>
          <path d="M16 9l-2 3"></path>
        </svg>
        <span className="sr-only">Accessibility</span>
      </button>
      
      {showSettings && (
        <div className="settings-overlay" role="dialog" aria-modal="true">
          <div className="settings-container">
            <AccessibilitySettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityMenu;
