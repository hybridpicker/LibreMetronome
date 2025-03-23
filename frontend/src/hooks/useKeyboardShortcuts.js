import { useEffect, useRef } from 'react';

// Helper function to process tap times and calculate tempo
const MIN_TAP_INTERVAL = 100; // Milliseconds
const MAX_TAP_INTERVAL = 2000; // Milliseconds
const COMMON_TEMPOS = [60, 90, 100, 120, 140, 160, 180]; // Common tempos for snap-to

const processTapTimesForTempo = (tapTimes) => {
  // Filter out times that are too close together
  const filteredTimes = [];
  let lastTime = 0;
  
  for (const time of tapTimes) {
    if (lastTime === 0 || (time - lastTime >= MIN_TAP_INTERVAL)) {
      filteredTimes.push(time);
      lastTime = time;
    } else {
      console.log(`[KEYBOARD] Tap too soon (${Math.round(time - lastTime)}ms), ignoring`);
    }
  }
  
  // Keep only the last 5 valid taps
  while (filteredTimes.length > 5) {
    filteredTimes.shift();
  }
  
  // Calculate tempo with at least 2 taps
  if (filteredTimes.length >= 2) {
    // Calculate intervals between consecutive taps
    const intervals = [];
    for (let i = 1; i < filteredTimes.length; i++) {
      const interval = filteredTimes[i] - filteredTimes[i - 1];
      if (interval >= MIN_TAP_INTERVAL && interval <= MAX_TAP_INTERVAL) {
        intervals.push(interval);
        console.log(`[KEYBOARD] Interval ${i}: ${Math.round(interval)}ms`);
      }
    }
    
    if (intervals.length === 0) {
      console.log(`[KEYBOARD] No valid intervals found`);
      return null;
    }
    
    // If we have enough intervals, filter out outliers
    if (intervals.length >= 3) {
      intervals.sort((a, b) => a - b);
      const median = intervals[Math.floor(intervals.length / 2)];
      const validIntervals = intervals.filter(interval => 
        Math.abs(interval - median) / median < 0.4
      );
      
      if (validIntervals.length >= 2) {
        console.log(`[KEYBOARD] Using ${validIntervals.length} filtered intervals`);
        intervals.length = 0;
        intervals.push(...validIntervals);
      }
    }
    
    const avgMs = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    console.log(`[KEYBOARD] Average interval: ${Math.round(avgMs)}ms`);
    
    // Convert to BPM
    let newTempo = Math.round(60000 / avgMs);
    
    // Snap to common tempos if close
    for (const commonTempo of COMMON_TEMPOS) {
      const percentDifference = Math.abs(newTempo - commonTempo) / commonTempo;
      if (percentDifference < 0.05) {
        console.log(`[KEYBOARD] Snapping from ${newTempo} to ${commonTempo} BPM (common tempo)`);
        newTempo = commonTempo;
        break;
      }
    }
    
    // Clamp to valid range
    const clampedTempo = Math.max(15, Math.min(240, newTempo));
    console.log(`[KEYBOARD] Setting tempo to ${clampedTempo} BPM`);
    
    // Dispatch a custom event that App.js can listen for
    const tempoEvent = new CustomEvent('metronome-set-tempo', {
      detail: { tempo: clampedTempo }
    });
    window.dispatchEvent(tempoEvent);
    return clampedTempo;
  } else {
    console.log(`[KEYBOARD] Need ${2 - filteredTimes.length} more tap(s) to set tempo`);
    return null;
  }
};

const useKeyboardShortcuts = ({
  onTogglePlayPause,
  onTapTempo,
  onSetSubdivisions,
  onIncreaseTempo,
  onDecreaseTempo,
  onSwitchToAnalog,
  onSwitchToCircle,
  onSwitchToGrid,
  onSwitchToMulti,
  onToggleInfoOverlay,
  onToggleTrainingOverlay,
  onManualTempoIncrease
}) => {
  const togglePlayRef = useRef(onTogglePlayPause);
  const tapTempoRef = useRef(onTapTempo);

  // Store tap times in a ref
  const tapTimesRef = useRef([]);
  
  useEffect(() => {
    togglePlayRef.current = onTogglePlayPause;
  }, [onTogglePlayPause]);

  useEffect(() => {
    tapTempoRef.current = onTapTempo;
  }, [onTapTempo]);
  
  // Global event listener for tap tempo events
  useEffect(() => {
    const handleGlobalTapTempo = (event) => {
      console.log("[KEYBOARD] Received global tap tempo event");
      if (tapTempoRef.current) {
        console.log("[KEYBOARD] Using provided tapTempo handler");
        tapTempoRef.current();
      } else {
        console.log("[KEYBOARD] Using built-in implementation for tap event");
        const tapTime = event.detail?.timestamp || performance.now();
        tapTimesRef.current.push(tapTime);
        console.log(`[KEYBOARD] Global tap recorded: ${tapTimesRef.current.length} total taps`);
        processTapTimesForTempo(tapTimesRef.current);
      }
    };
    
    window.addEventListener('metronome-tap-tempo', handleGlobalTapTempo);
    return () => window.removeEventListener('metronome-tap-tempo', handleGlobalTapTempo);
  }, []);

  const lastSpaceKeyTimeRef = useRef(0);
  const lastTapKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        const now = Date.now();
        if (now - lastSpaceKeyTimeRef.current < 300) {
          return;
        }
        lastSpaceKeyTimeRef.current = now;
        
        // Enhanced spacebar handling with fallbacks
        if (togglePlayRef.current) {
          console.log("[KEYBOARD] Spacebar: Using provided callback");
          
          // Add a try-catch block to prevent errors
          try {
            togglePlayRef.current();
          } catch (err) {
            console.error("[KEYBOARD] Error in play/pause handler:", err);
            
            // Fallback: dispatch a global event
            console.log("[KEYBOARD] Spacebar: Falling back to global event");
            window.dispatchEvent(new CustomEvent('metronome-toggle-play', {
              detail: { timestamp: performance.now() }
            }));
          }
        } else {
          // Fallback if no handler is provided
          console.log("[KEYBOARD] Spacebar: No handler provided, using global event");
          window.dispatchEvent(new CustomEvent('metronome-toggle-play', {
            detail: { timestamp: performance.now() }
          }));
        }
      }

      switch (event.code) {
        case 'Enter':
          // Add Enter key support for manual acceleration in training mode
          if (onManualTempoIncrease) {
            event.preventDefault();
            onManualTempoIncrease();
          }
          break;
        case 'KeyT':
          console.log("[KEYBOARD] 'T' key pressed for tap tempo");
          event.preventDefault();
          
          // Try the global handler first
          if (window.handleGlobalTapTempo) {
            console.log("[KEYBOARD] Using global tap tempo handler");
            window.handleGlobalTapTempo();
            break;
          }
          
          // Check for global tapTempoRef (added for AdvancedMetronome)
          if (window.tapTempoRef && typeof window.tapTempoRef.current === 'function') {
            console.log("[KEYBOARD] Using global tapTempoRef.current");
            window.tapTempoRef.current();
            break;
          }
          
          // Then try the component's handler
          if (tapTempoRef.current) {
            console.log("[KEYBOARD] Using metronome's tapTempo function");
            tapTempoRef.current();
            break;
          }
          
          // Fallback to the built-in implementation
          console.log("[KEYBOARD] No tapTempo function provided, using fallback implementation");
          const now = Date.now();
          if (now - lastTapKeyTimeRef.current < 100) {
            console.log("[KEYBOARD] Tap too soon after previous tap, ignoring");
            return;
          }
          lastTapKeyTimeRef.current = now;
          const tapTime = performance.now();
          tapTimesRef.current.push(tapTime);
          console.log(`[KEYBOARD] Tap recorded: ${tapTimesRef.current.length} total taps`);
          
          // Always dispatch a global tap tempo event to ensure it's caught
          window.dispatchEvent(
            new CustomEvent("metronome-tap-tempo", {
              detail: { timestamp: tapTime }
            })
          );
          
          processTapTimesForTempo(tapTimesRef.current);
          break;
        case 'KeyR':
          if (onToggleTrainingOverlay) onToggleTrainingOverlay();
          break;
        case 'Digit1':
        case 'Numpad1':
          if (onSetSubdivisions) onSetSubdivisions(1);
          break;
        case 'Digit2':
        case 'Numpad2':
          if (onSetSubdivisions) onSetSubdivisions(2);
          break;
        case 'Digit3':
        case 'Numpad3':
          if (onSetSubdivisions) onSetSubdivisions(3);
          break;
        case 'Digit4':
        case 'Numpad4':
          if (onSetSubdivisions) onSetSubdivisions(4);
          break;
        case 'Digit5':
        case 'Numpad5':
          if (onSetSubdivisions) onSetSubdivisions(5);
          break;
        case 'Digit6':
        case 'Numpad6':
          if (onSetSubdivisions) onSetSubdivisions(6);
          break;
        case 'Digit7':
        case 'Numpad7':
          if (onSetSubdivisions) onSetSubdivisions(7);
          break;
        case 'Digit8':
        case 'Numpad8':
          if (onSetSubdivisions) onSetSubdivisions(8);
          break;
        case 'Digit9':
        case 'Numpad9':
          if (onSetSubdivisions) onSetSubdivisions(9);
          break;
        case 'ArrowUp':
        case 'ArrowRight':
          if (onIncreaseTempo) onIncreaseTempo();
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          if (onDecreaseTempo) onDecreaseTempo();
          break;
        case 'KeyP':
          if (onSwitchToAnalog) onSwitchToAnalog();
          break;
        case 'KeyC':
          if (onSwitchToCircle) onSwitchToCircle();
          break;
        case 'KeyG':
          if (onSwitchToGrid) onSwitchToGrid();
          break;
        case 'KeyM':
          if (onSwitchToMulti) onSwitchToMulti();
          break;
        case 'KeyI':
          if (onToggleInfoOverlay) onToggleInfoOverlay();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSetSubdivisions,
    onIncreaseTempo,
    onDecreaseTempo,
    onSwitchToAnalog,
    onSwitchToCircle,
    onSwitchToGrid,
    onSwitchToMulti,
    onToggleInfoOverlay,
    onToggleTrainingOverlay,
    onManualTempoIncrease
  ]);
};

export default useKeyboardShortcuts;
