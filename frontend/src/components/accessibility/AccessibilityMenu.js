import React, { useState, useEffect, useRef } from 'react';
import AccessibilitySettings from './AccessibilitySettings';
import InterfaceIcon from '../common/InterfaceIcon';
import { playAudioFeedback, announceToScreenReader } from '../../utils/accessibility/accessibilityUtils';
import './AccessibilityMenu.css';

const AccessibilityMenu = () => {
  const [showSettings, setShowSettings] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    const body = document.body;
    const highContrast = localStorage.getItem('accessibility-high-contrast') === 'true';
    const largeText = localStorage.getItem('accessibility-large-text') === 'true';
    const reducedMotion = localStorage.getItem('accessibility-reduced-motion') === 'true';
    const colorBlindMode = localStorage.getItem('accessibility-color-blind-mode') || 'none';

    body.classList.toggle('high-contrast', highContrast);
    body.classList.toggle('large-text', largeText);
    body.classList.toggle('reduced-motion', reducedMotion);
    body.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
    if (colorBlindMode !== 'none') body.classList.add('color-blind', colorBlindMode);
  }, []);
  
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
    
    // Announce to screen readers
    if (window.screenReaderMessagesEnabled) {
      if (showSettings) {
        announceToScreenReader('Accessibility settings panel closed', 'polite');
      } else {
        announceToScreenReader('Accessibility settings panel opened', 'polite');
      }
    }
  };
  
  return (
    <div className="accessibility-container">
      <button 
        ref={buttonRef}
        className="accessibility-toggle header-action"
        title="Accessibility settings"
        onClick={handleButtonClick}
        aria-label="Accessibility settings"
        aria-expanded={showSettings}
        aria-haspopup="dialog"
      >
        <InterfaceIcon name="accessibility" size={22} />
        <span className="sr-only">Accessibility</span>
      </button>
      
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-container">
            <AccessibilitySettings 
              onClose={() => setShowSettings(false)} 
              triggerRef={buttonRef}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityMenu;
