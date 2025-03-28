// src/components/Menu/AccessibilityTab.js
import React, { useState, useEffect } from 'react';
import { playAudioFeedback, announceToScreenReader } from '../../utils/accessibility/accessibilityUtils';
import './AccessibilityTab.css';

/**
 * AccessibilityTab Component
 * A tab in the settings menu that provides accessibility options
 */
const AccessibilityTab = ({ onClose }) => {
  // State for accessibility settings
  const [highContrast, setHighContrast] = useState(
    localStorage.getItem('accessibility-high-contrast') === 'true'
  );
  const [largeText, setLargeText] = useState(
    localStorage.getItem('accessibility-large-text') === 'true'
  );
  const [reducedMotion, setReducedMotion] = useState(
    localStorage.getItem('accessibility-reduced-motion') === 'true' || 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [audioFeedback, setAudioFeedback] = useState(
    localStorage.getItem('accessibility-audio-feedback') === 'true'
  );
  const [screenReaderMessages, setScreenReaderMessages] = useState(
    localStorage.getItem('accessibility-screen-reader-messages') !== 'false'
  );
  const [focusIndicators, setFocusIndicators] = useState(
    localStorage.getItem('accessibility-focus-indicators') !== 'false'
  );
  const [colorBlindMode, setColorBlindMode] = useState(
    localStorage.getItem('accessibility-color-blind-mode') || 'none'
  );

  // Effect for high contrast mode
  useEffect(() => {
    localStorage.setItem('accessibility-high-contrast', highContrast.toString());
    document.body.classList.remove('high-contrast');
    if (highContrast) {
      document.body.classList.add('high-contrast');
    }
    
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'highContrast', value: highContrast }
    }));
  }, [highContrast]);

  // Effect for large text mode
  useEffect(() => {
    localStorage.setItem('accessibility-large-text', largeText.toString());
    document.body.classList.remove('large-text');
    if (largeText) {
      document.body.classList.add('large-text');
      
      // Force refresh of layout for elements that might not automatically adjust
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
    
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'largeText', value: largeText }
    }));
  }, [largeText]);

  // Effect for reduced motion
  useEffect(() => {
    localStorage.setItem('accessibility-reduced-motion', reducedMotion.toString());
    document.body.classList.remove('reduced-motion');
    if (reducedMotion) {
      document.body.classList.add('reduced-motion');
    }
    
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'reducedMotion', value: reducedMotion }
    }));
  }, [reducedMotion]);

  // Effect for audio feedback
  useEffect(() => {
    localStorage.setItem('accessibility-audio-feedback', audioFeedback.toString());
    window.audioFeedbackEnabled = audioFeedback;
    
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'audioFeedback', value: audioFeedback }
    }));
  }, [audioFeedback]);

  // Effect for screen reader messages
  useEffect(() => {
    localStorage.setItem('accessibility-screen-reader-messages', screenReaderMessages.toString());
    window.screenReaderMessagesEnabled = screenReaderMessages;
    
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'screenReaderMessages', value: screenReaderMessages }
    }));
  }, [screenReaderMessages]);
  
  // Effect for focus indicators
  useEffect(() => {
    localStorage.setItem('accessibility-focus-indicators', focusIndicators.toString());
    window.focusIndicatorsEnabled = focusIndicators;
    
    document.body.classList.remove('focus-visible-enabled');
    if (focusIndicators) {
      document.body.classList.add('focus-visible-enabled');
    }
    
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'focusIndicators', value: focusIndicators }
    }));
  }, [focusIndicators]);
  
  // Effect for color blind mode
  useEffect(() => {
    localStorage.setItem('accessibility-color-blind-mode', colorBlindMode);
    
    document.body.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
    
    if (colorBlindMode !== 'none') {
      document.body.classList.add('color-blind');
      document.body.classList.add(colorBlindMode);
    }
    
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'colorBlindMode', value: colorBlindMode }
    }));
  }, [colorBlindMode]);

  // Handle toggle changes with audio feedback
  const handleToggle = (setter, value) => {
    setter(value);
    if (audioFeedback) {
      playAudioFeedback('click');
    }
  };

  // Apply settings and close the overlay
  const handleApply = () => {
    if (audioFeedback) {
      playAudioFeedback('click');
    }
    
    // Announce settings have been saved
    if (screenReaderMessages) {
      announceToScreenReader('Accessibility settings saved', 'polite');
    }
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="accessibility-tab-content">
      <div className="settings-group">
        <h3>Display Options</h3>
        
        <div className="setting-item">
          <input 
            type="checkbox" 
            id="high-contrast" 
            checked={highContrast} 
            onChange={e => handleToggle(setHighContrast, e.target.checked)} 
          />
          <label htmlFor="high-contrast">High Contrast Mode</label>
          <p className="setting-description">Increases contrast for better visibility</p>
        </div>
        
        <div className="setting-item">
          <input 
            type="checkbox" 
            id="large-text" 
            checked={largeText} 
            onChange={e => handleToggle(setLargeText, e.target.checked)} 
          />
          <label htmlFor="large-text">Large Text</label>
          <p className="setting-description">Increases text size throughout the app</p>
        </div>
        
        <div className="setting-item">
          <input 
            type="checkbox" 
            id="reduced-motion" 
            checked={reducedMotion} 
            onChange={e => handleToggle(setReducedMotion, e.target.checked)} 
          />
          <label htmlFor="reduced-motion">Reduced Motion</label>
          <p className="setting-description">Minimizes animations and motion effects</p>
        </div>
        
        <div className="setting-item">
          <input 
            type="checkbox" 
            id="focus-indicators" 
            checked={focusIndicators} 
            onChange={e => handleToggle(setFocusIndicators, e.target.checked)} 
          />
          <label htmlFor="focus-indicators">Enhanced Focus Indicators</label>
          <p className="setting-description">Shows clear visual indicators for keyboard focus</p>
        </div>
      </div>
      
      <div className="settings-group">
        <h3>Color Vision</h3>
        <div className="setting-item color-blind-mode">
          <label htmlFor="color-blind-mode">Color Blind Mode</label>
          <select 
            id="color-blind-mode" 
            value={colorBlindMode} 
            onChange={e => handleToggle(setColorBlindMode, e.target.value)}
            aria-describedby="color-blind-desc"
          >
            <option value="none">None</option>
            <option value="protanopia">Protanopia (Red-Blind)</option>
            <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
            <option value="tritanopia">Tritanopia (Blue-Blind)</option>
            <option value="monochromacy">Monochromacy (Full Color Blindness)</option>
          </select>
          <p id="color-blind-desc" className="setting-description">Adjusts colors for different types of color vision deficiency</p>
        </div>
      </div>
      
      <div className="settings-group">
        <h3>Feedback Options</h3>
        
        <div className="setting-item">
          <input 
            type="checkbox" 
            id="audio-feedback" 
            checked={audioFeedback} 
            onChange={e => handleToggle(setAudioFeedback, e.target.checked)} 
          />
          <label htmlFor="audio-feedback">Audio Feedback</label>
          <p className="setting-description">Plays sounds for actions and notifications</p>
        </div>
        
        <div className="setting-item">
          <input 
            type="checkbox" 
            id="screen-reader-messages" 
            checked={screenReaderMessages} 
            onChange={e => handleToggle(setScreenReaderMessages, e.target.checked)} 
          />
          <label htmlFor="screen-reader-messages">Screen Reader Announcements</label>
          <p className="setting-description">Provides extra context for screen readers</p>
        </div>
      </div>
      
      <div className="keyboard-shortcuts">
        <h3>Keyboard Shortcuts</h3>
        <div className="shortcuts-columns">
          <ul>
            <li><kbd>Space</kbd>: Play/Pause metronome</li>
            <li><kbd>T</kbd>: Tap tempo</li>
            <li><kbd>↑</kbd>/<kbd>↓</kbd>: Adjust tempo by 1 BPM</li>
            <li><kbd>←</kbd>/<kbd>→</kbd>: Adjust tempo by 5 BPM</li>
          </ul>
          <ul>
            <li><kbd>+</kbd>/<kbd>-</kbd>: Adjust volume</li>
            <li><kbd>1</kbd>-<kbd>9</kbd>: Set beats per measure</li>
            <li><kbd>Esc</kbd>: Close dialogs</li>
            <li><kbd>Tab</kbd>: Navigate between elements</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityTab;
