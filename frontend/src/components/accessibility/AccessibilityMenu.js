import React, { useEffect } from 'react';
import AccessibilitySettings from './AccessibilitySettings';
import { playAudioFeedback } from '../../utils/accessibility/accessibilityUtils';
import './AccessibilityMenu.css';

const AccessibilityMenu = ({ isOpen = false, onClose, triggerRef }) => {
  const showSettings = isOpen;
  const setShowSettings = (open) => { if (!open && onClose) onClose(); };

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
  
  return (
    <div className="accessibility-container">
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-container">
            <AccessibilitySettings 
              onClose={() => setShowSettings(false)} 
              triggerRef={triggerRef}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityMenu;
