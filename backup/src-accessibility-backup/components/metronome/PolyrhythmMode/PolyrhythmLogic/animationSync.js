/**
 * Animation synchronization utilities for polyrhythm mode
 * Ensures that visual beats are perfectly aligned with audio beats
 */

/**
 * Schedules a UI update to happen at exactly the right time
 * relative to when an audio beat is scheduled to play.
 * Enhanced for complex polyrhythms like 8:9.
 */
export const scheduleAnimationUpdate = ({
  audioTime,           // Audio context time when beat is scheduled
  audioCtx,            // Audio context reference
  beatIndex,           // Which beat in the pattern (0 = first beat)
  isInnerCircle,       // Whether this is for inner or outer circle
  setInnerCurrentSubFn, // Function to update inner beat in UI
  setOuterCurrentSubFn, // Function to update outer beat in UI
  onInnerBeatTriggeredFn, // Callback for inner beat (for additional effects)
  onOuterBeatTriggeredFn, // Callback for outer beat (for additional effects)
  uiAnimationDuration = 0.04 // How long the beat highlight should show
}) => {
  if (!audioCtx || !audioTime) return;
  
  // Calculate time difference between audio context time and performance.now()
  const audioNowTime = audioCtx.currentTime;
  const audioTimeOffset = audioTime - audioNowTime;
  
  // Current performance.now() timestamp
  const perfNow = performance.now();
  
  // Calculate target time in performance.now() timeline
  const targetTime = perfNow + (audioTimeOffset * 1000);
  
  // Calculate how long to wait
  const timeToWait = Math.max(0, targetTime - perfNow);
  
  // If it's the first beat of either circle, dispatch a special event
  if (beatIndex === 0) {
    // For first beats, we want to ensure precise timing
    // Save the audio context in the window for DirectBeatIndicator to access
    if (audioCtx && typeof window !== 'undefined' && !window.audioContext) {
      window.audioContext = audioCtx;
      
      // Dispatch audio time sync event for indicators to use
      window.dispatchEvent(new CustomEvent('audio-time-sync', {
        detail: {
          audioContextTime: audioCtx.currentTime,
          performanceNow: performance.now()
        }
      }));
    }
    
    // For extremely precise timing, use a setTimeout with the exact timeToWait
    const timer = setTimeout(() => {
      // Only dispatch the first-beat event for inner circle to avoid duplicates
      if (isInnerCircle) {
        // Dispatch a custom event with exact timing information
        window.dispatchEvent(new CustomEvent('polyrhythm-first-beat', {
          detail: {
            timestamp: performance.now(),
            audioTime: audioTime,
            bpm: window.currentTempo,
            innerBeats: window.currentInnerBeats
          }
        }));
        
        // Also dispatch another audio time sync event at this exact moment
        window.dispatchEvent(new CustomEvent('audio-time-sync', {
          detail: {
            audioContextTime: audioCtx.currentTime,
            performanceNow: performance.now(),
            scheduledAudioTime: audioTime
          }
        }));
      }
    }, timeToWait);
    
    // Set a cleanup function just to be safe
    if (typeof window !== 'undefined') {
      const cleanup = () => {
        clearTimeout(timer);
      };
      
      window.addEventListener('polyrhythm-cleanup', cleanup);
      setTimeout(() => {
        window.removeEventListener('polyrhythm-cleanup', cleanup);
      }, timeToWait + 100);
    }
  }
  
  // Schedule the UI update at the exact right time
  setTimeout(() => {
    // Update the appropriate circle's current subdivision
    if (isInnerCircle) {
      setInnerCurrentSubFn(beatIndex);
      if (onInnerBeatTriggeredFn) onInnerBeatTriggeredFn(beatIndex);
    } else {
      setOuterCurrentSubFn(beatIndex);
      if (onOuterBeatTriggeredFn) onOuterBeatTriggeredFn(beatIndex);
    }
    
    // If animation duration is set, schedule clearing the highlight
    if (uiAnimationDuration > 0) {
      // After specified duration, reset to -1 (no beat highlighted)
      setTimeout(() => {
        if (isInnerCircle) {
          setInnerCurrentSubFn(-1);
        } else {
          setOuterCurrentSubFn(-1);
        }
      }, uiAnimationDuration * 1000);
    }
  }, timeToWait);
};
