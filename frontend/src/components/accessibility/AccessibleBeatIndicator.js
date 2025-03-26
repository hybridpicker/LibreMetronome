import React, { useEffect, useState, useRef } from 'react';
import { announceToScreenReader, triggerHapticFeedback } from '../../utils/accessibility/accessibilityUtils';
import './AccessibleBeatIndicator.css';

/**
 * Component to provide accessible beat indications for visually impaired users
 * Provides both visual and auditory feedback about current beat
 */
const AccessibleBeatIndicator = ({ 
  isPlaying,
  currentBeat,
  totalBeats,
  accentedBeats = [1], // Default to first beat being accented
}) => {
  const [showVisualIndicator, setShowVisualIndicator] = useState(false);
  const previousBeatRef = useRef(0);
  
  // On component mount, check if we should show visual beat indicator
  useEffect(() => {
    const highContrast = localStorage.getItem('accessibility-high-contrast') === 'true';
    const largeText = localStorage.getItem('accessibility-large-text') === 'true';
    const screenReaderMessages = localStorage.getItem('accessibility-screen-reader-messages') !== 'false';
    
    // Show visual indicator if any accessibility feature is enabled
    setShowVisualIndicator(highContrast || largeText || screenReaderMessages);
  }, []);
  
  // Announce beat changes to screen readers if enabled
  useEffect(() => {
    if (!isPlaying || currentBeat === 0 || currentBeat === previousBeatRef.current) {
      return;
    }
    
    // Update previous beat reference
    previousBeatRef.current = currentBeat;
    
    // Only announce first beat and accented beats to avoid too many announcements
    if (currentBeat === 1 || accentedBeats.includes(currentBeat)) {
      const message = currentBeat === 1 
        ? `Beat ${currentBeat} of ${totalBeats}` 
        : `Beat ${currentBeat}`;
        
      if (window.screenReaderMessagesEnabled) {
        announceToScreenReader(message, 'assertive');
      }
      
      // Provide haptic feedback on first beat or accented beats if enabled
      if (window.hapticFeedbackEnabled) {
        // Stronger vibration for first beat
        if (currentBeat === 1) {
          triggerHapticFeedback('medium');
        } else if (accentedBeats.includes(currentBeat)) {
          triggerHapticFeedback('short');
        }
      }
    }
  }, [isPlaying, currentBeat, totalBeats, accentedBeats]);
  
  // Don't render anything if not playing or if visual indicator is not needed
  if (!isPlaying || !showVisualIndicator) {
    return null;
  }
  
  return (
    <div 
      className="accessible-beat-indicator" 
      aria-live="off" // We're handling announcements with a separate method
    >
      <div className="beat-display">
        {Array.from({ length: totalBeats }, (_, i) => (
          <div 
            key={i}
            className={`beat-dot ${i + 1 === currentBeat ? 'active' : ''} ${accentedBeats.includes(i + 1) ? 'accented' : ''}`}
            aria-hidden="true" // Hide from screen readers, we announce beats separately
          />
        ))}
      </div>
      <div className="beat-text">
        Beat {currentBeat} of {totalBeats}
      </div>
    </div>
  );
};

export default AccessibleBeatIndicator;