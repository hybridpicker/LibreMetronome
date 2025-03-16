import { useEffect, useRef } from 'react';

// Helper function to process tap times and calculate tempo
const processTapTimesForTempo = (tapTimes) => {
  // Keep only the last 5 taps
  while (tapTimes.length > 5) {
    tapTimes.shift();
  }
  
  // Calculate tempo with at least 2 taps
  if (tapTimes.length >= 2) {
    let sum = 0;
    for (let i = 1; i < tapTimes.length; i++) {
      const interval = tapTimes[i] - tapTimes[i - 1];
      sum += interval;
      console.log(`[KEYBOARD] Interval ${i}: ${Math.round(interval)}ms`);
    }
    const avgMs = sum / (tapTimes.length - 1);
    console.log(`[KEYBOARD] Average interval: ${Math.round(avgMs)}ms`);
    
    // Convert to BPM and clamp
    const newTempo = Math.round(60000 / avgMs);
    const clampedTempo = Math.max(15, Math.min(240, newTempo));
    console.log(`[KEYBOARD] Setting tempo to ${clampedTempo} BPM`);
    
    // Dispatch a custom event that App.js can listen for
    const tempoEvent = new CustomEvent('metronome-set-tempo', {
      detail: { tempo: clampedTempo }
    });
    window.dispatchEvent(tempoEvent);
    return clampedTempo;
  } else {
    console.log(`[KEYBOARD] Need ${2 - tapTimes.length} more tap(s) to set tempo`);
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
        if (togglePlayRef.current) {
          togglePlayRef.current();
        }
      }

      switch (event.code) {
        case 'KeyT':
          console.log("[KEYBOARD] 'T' key pressed for tap tempo");
          if (tapTempoRef.current) {
            console.log("[KEYBOARD] Using metronome's tapTempo function");
            tapTempoRef.current();
            break;
          }
          console.log("[KEYBOARD] No tapTempo function provided, using fallback implementation");
          const now = Date.now();
          if (now - lastTapKeyTimeRef.current < 100) {
            console.log("[KEYBOARD] Tap too soon after previous tap, ignoring");
            return;
          }
          lastTapKeyTimeRef.current = now;
          event.preventDefault();
          const tapTime = performance.now();
          tapTimesRef.current.push(tapTime);
          console.log(`[KEYBOARD] Tap recorded: ${tapTimesRef.current.length} total taps`);
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
