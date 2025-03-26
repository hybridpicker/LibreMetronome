import React from 'react';
import { playAudioFeedback } from '../../utils/accessibility/accessibilityUtils';
import './SkipToContent.css';

/**
 * SkipToContent component provides an accessibility feature that allows
 * keyboard users to skip navigation and jump directly to main content
 */
const SkipToContent = () => {
  const handleClick = (e) => {
    // Prevent default link behavior
    e.preventDefault();
    
    // Find the main content element
    const mainContent = document.getElementById('main-content');
    
    if (mainContent) {
      // Focus the main content
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      
      // Remove tabindex when blur to avoid unwanted focus behavior
      mainContent.addEventListener('blur', () => {
        mainContent.removeAttribute('tabindex');
      }, { once: true });
      
      // Scroll to main content
      mainContent.scrollIntoView({ behavior: 'smooth' });
      
      // Play audio feedback if enabled
      if (window.audioFeedbackEnabled) {
        playAudioFeedback('click');
      }
    }
  };
  
  return (
    <a 
      href="#main-content"
      className="skip-to-content"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleClick(e);
        }
      }}
    >
      Skip to main content
    </a>
  );
};

export default SkipToContent;
