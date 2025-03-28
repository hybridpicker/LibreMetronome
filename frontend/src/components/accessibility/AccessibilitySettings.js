import React, { useState, useEffect, useRef } from 'react';
import './AccessibilitySettings.css';
import { playAudioFeedback, announceToScreenReader } from '../../utils/accessibility/accessibilityUtils';
import FocusTrap from './FocusTrap';

const AccessibilitySettings = ({ onClose, triggerRef }) => {
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
  const [hapticFeedback, setHapticFeedback] = useState(
    localStorage.getItem('accessibility-haptic-feedback') === 'true'
  );
  const [colorBlindMode, setColorBlindMode] = useState(
    localStorage.getItem('accessibility-color-blind-mode') || 'none'
  );

  useEffect(() => {
    localStorage.setItem('accessibility-high-contrast', highContrast.toString());
    // First remove to ensure clean state
    document.body.classList.remove('high-contrast');
    if (highContrast) {
      document.body.classList.add('high-contrast');
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'highContrast', value: highContrast }
    }));
    
    console.log('High contrast setting updated:', highContrast);
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('accessibility-large-text', largeText.toString());
    // First remove to ensure clean state
    document.body.classList.remove('large-text');
    if (largeText) {
      document.body.classList.add('large-text');
      
      // Force refresh of layout for elements that might not automatically adjust
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'largeText', value: largeText }
    }));
    
    // Announce change to screen readers if enabled
    if (window.screenReaderMessagesEnabled) {
      const message = largeText ? 'Large text mode enabled' : 'Large text mode disabled';
      announceToScreenReader(message, 'polite');
    }
    
    console.log('Large text setting updated:', largeText);
  }, [largeText]);

  useEffect(() => {
    localStorage.setItem('accessibility-reduced-motion', reducedMotion.toString());
    // First remove to ensure clean state
    document.body.classList.remove('reduced-motion');
    if (reducedMotion) {
      document.body.classList.add('reduced-motion');
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'reducedMotion', value: reducedMotion }
    }));
    
    console.log('Reduced motion setting updated:', reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('accessibility-audio-feedback', audioFeedback.toString());
    window.audioFeedbackEnabled = audioFeedback;
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'audioFeedback', value: audioFeedback }
    }));
    
    console.log('Audio feedback setting updated:', audioFeedback);
  }, [audioFeedback]);

  useEffect(() => {
    localStorage.setItem('accessibility-screen-reader-messages', screenReaderMessages.toString());
    window.screenReaderMessagesEnabled = screenReaderMessages;
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'screenReaderMessages', value: screenReaderMessages }
    }));
    
    console.log('Screen reader messages setting updated:', screenReaderMessages);
  }, [screenReaderMessages]);
  
  useEffect(() => {
    localStorage.setItem('accessibility-focus-indicators', focusIndicators.toString());
    window.focusIndicatorsEnabled = focusIndicators;
    
    // First remove to ensure clean state
    document.body.classList.remove('focus-visible-enabled');
    if (focusIndicators) {
      document.body.classList.add('focus-visible-enabled');
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'focusIndicators', value: focusIndicators }
    }));
    
    console.log('Focus indicators setting updated:', focusIndicators);
  }, [focusIndicators]);
  
  useEffect(() => {
    localStorage.setItem('accessibility-haptic-feedback', hapticFeedback.toString());
    window.hapticFeedbackEnabled = hapticFeedback;
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'hapticFeedback', value: hapticFeedback }
    }));
    
    console.log('Haptic feedback setting updated:', hapticFeedback);
  }, [hapticFeedback]);
  
  useEffect(() => {
    localStorage.setItem('accessibility-color-blind-mode', colorBlindMode);
    
    // Clear all color blind classes first
    document.body.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
    
    // Apply appropriate classes based on selected mode
    if (colorBlindMode !== 'none') {
      document.body.classList.add('color-blind');
      document.body.classList.add(colorBlindMode);
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
      detail: { setting: 'colorBlindMode', value: colorBlindMode }
    }));
    
    console.log('Color blind mode updated:', colorBlindMode);
  }, [colorBlindMode]);

  const handleSave = () => {
    if (audioFeedback) {
      playAudioFeedback('click');
    }
    
    // Provide haptic feedback if enabled
    if (hapticFeedback && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(100);
    }
    
    // Announce settings have been saved
    if (screenReaderMessages) {
      announceToScreenReader('Accessibility settings saved and dialog closed', 'polite');
    }
    
    onClose();
  };
  
  return (
    <FocusTrap isActive={true} triggerRef={triggerRef} onEscape={onClose}>
      <div className="accessibility-settings" role="dialog" aria-labelledby="a11y-title">
        <h2 id="a11y-title">Accessibility Settings</h2>
        
        <div className="settings-group">
          <h3>Display Options</h3>
          
          <div className="setting-item">
            <input 
              type="checkbox" 
              id="high-contrast" 
              checked={highContrast} 
              onChange={e => {
                setHighContrast(e.target.checked);
                if (audioFeedback) playAudioFeedback('click');
              }} 
            />
            <label htmlFor="high-contrast">High Contrast Mode</label>
            <p className="setting-description">Increases contrast for better visibility</p>
          </div>
          
          <div className="setting-item">
            <input 
              type="checkbox" 
              id="large-text" 
              checked={largeText} 
              onChange={e => {
                setLargeText(e.target.checked);
                if (audioFeedback) playAudioFeedback('click');
              }} 
            />
            <label htmlFor="large-text">Large Text</label>
            <p className="setting-description">Increases text size throughout the app</p>
          </div>
          
          <div className="setting-item">
            <input 
              type="checkbox" 
              id="reduced-motion" 
              checked={reducedMotion} 
              onChange={e => {
                setReducedMotion(e.target.checked);
                if (audioFeedback) playAudioFeedback('click');
              }} 
              disabled={true}
            />
            <label htmlFor="reduced-motion">Reduced Motion (TODO)</label>
            <p className="setting-description">Minimizes animations and motion effects</p>
          </div>
          
          <div className="setting-item">
            <input 
              type="checkbox" 
              id="focus-indicators" 
              checked={focusIndicators} 
              onChange={e => {
                setFocusIndicators(e.target.checked);
                if (audioFeedback) playAudioFeedback('click');
              }} 
              disabled={true}
            />
            <label htmlFor="focus-indicators">Enhanced Focus Indicators (TODO)</label>
            <p className="setting-description">Shows clear visual indicators for keyboard focus</p>
          </div>
          
          <div className="setting-item color-blind-mode">
            <label htmlFor="color-blind-mode">Color Blind Mode</label>
            <select 
              id="color-blind-mode" 
              value={colorBlindMode} 
              onChange={e => {
                setColorBlindMode(e.target.value);
                if (audioFeedback) playAudioFeedback('click');
              }}
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
              onChange={e => {
                setAudioFeedback(e.target.checked);
                // Don't play sound when turning off audio feedback
                if (e.target.checked) playAudioFeedback('click');
              }} 
            />
            <label htmlFor="audio-feedback">Audio Feedback</label>
            <p className="setting-description">Plays sounds for actions and notifications</p>
          </div>
          
          {/* Screen Reader Announcements and Haptic Feedback options removed */}
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
        
        <div className="button-group">
          <button 
            onClick={handleSave} 
            className="close-button"
            aria-label="Save accessibility settings and close dialog"
          >
            Save & Close
          </button>
        </div>
      </div>
    </FocusTrap>
  );
};

export default AccessibilitySettings;
