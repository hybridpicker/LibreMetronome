import { useEffect, useRef } from 'react';

// Helper function to process tap times and calculate tempo
const MIN_TAP_INTERVAL = 100; // Milliseconds
const MAX_TAP_INTERVAL = 2000; // Milliseconds
const COMMON_TEMPOS = [60, 90, 100, 120, 140, 160, 180]; // Common tempos for snap-to
const SPACE_DEBOUNCE_MS = 300; // Ignore a second Space press within this window

// Digit1..Digit9 and Numpad1..Numpad9 set the number of beats
const SUBDIVISION_KEY = /^(?:Digit|Numpad)([1-9])$/;

// Key code -> name of the callback it triggers
const CALLBACK_KEYS = {
  KeyR: 'onToggleTrainingOverlay',
  ArrowUp: 'onIncreaseTempo',
  ArrowRight: 'onIncreaseTempo',
  ArrowDown: 'onDecreaseTempo',
  ArrowLeft: 'onDecreaseTempo',
  KeyA: 'onSwitchToAnalog',
  KeyC: 'onSwitchToCircle',
  KeyG: 'onSwitchToGrid',
  KeyI: 'onToggleInfoOverlay',
  KeyM: 'onSwitchToMulti',
  KeyY: 'onSwitchToPolyrhythm' // Y for polYrhythm
};

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
  onSwitchToPolyrhythm,
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
    const dispatchTogglePlay = () => {
      window.dispatchEvent(new CustomEvent('metronome-toggle-play', {
        detail: { timestamp: performance.now() }
      }));
    };

    const handleSpace = () => {
      const now = Date.now();
      if (now - lastSpaceKeyTimeRef.current < SPACE_DEBOUNCE_MS) {
        return;
      }
      lastSpaceKeyTimeRef.current = now;

      if (!togglePlayRef.current) {
        console.log("[KEYBOARD] Spacebar: No handler provided, using global event");
        dispatchTogglePlay();
        return;
      }
      console.log("[KEYBOARD] Spacebar: Using provided callback");
      try {
        togglePlayRef.current();
      } catch (err) {
        console.error("[KEYBOARD] Error in play/pause handler:", err);
        console.log("[KEYBOARD] Spacebar: Falling back to global event");
        dispatchTogglePlay();
      }
    };

    // Returns false when the key press was ignored as a double tap.
    const handleTapKey = () => {
      console.log("[KEYBOARD] 'T' key pressed for tap tempo");

      // Preferred handlers: the global one, the global ref, then the component's own
      if (window.handleGlobalTapTempo) {
        console.log("[KEYBOARD] Using global tap tempo handler");
        window.handleGlobalTapTempo();
        return true;
      }
      if (window.tapTempoRef && typeof window.tapTempoRef.current === 'function') {
        console.log("[KEYBOARD] Using global tapTempoRef.current");
        window.tapTempoRef.current();
        return true;
      }
      if (tapTempoRef.current) {
        console.log("[KEYBOARD] Using metronome's tapTempo function");
        tapTempoRef.current();
        return true;
      }

      // Fallback to the built-in implementation
      console.log("[KEYBOARD] No tapTempo function provided, using fallback implementation");
      const now = Date.now();
      if (now - lastTapKeyTimeRef.current < MIN_TAP_INTERVAL) {
        console.log("[KEYBOARD] Tap too soon after previous tap, ignoring");
        return false;
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
      return true;
    };

    // Shortcut -> callback; the key counts as handled even when the callback is missing.
    const callbacks = {
      onToggleTrainingOverlay,
      onIncreaseTempo,
      onDecreaseTempo,
      onSwitchToAnalog,
      onSwitchToCircle,
      onSwitchToGrid,
      onToggleInfoOverlay,
      onSwitchToMulti,
      onSwitchToPolyrhythm
    };

    const handleKeyDown = (event) => {
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      // Leave modifier combinations to the browser and the macOS menu bar
      // (⌘C, ⌘M, ⌘1, …) instead of also triggering a metronome shortcut.
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        handleSpace();
        return;
      }

      // Handled keys are marked as consumed. Otherwise the browser scrolls on
      // arrow keys, and the macOS app passes the key on to AppKit, which plays
      // the system alert sound.
      const subdivisionMatch = SUBDIVISION_KEY.exec(event.code);
      if (subdivisionMatch) {
        if (onSetSubdivisions) onSetSubdivisions(Number(subdivisionMatch[1]));
      } else if (event.code === 'Enter') {
        // Enter accelerates manually in training mode
        if (!onManualTempoIncrease) return;
        onManualTempoIncrease();
      } else if (event.code === 'KeyT') {
        event.preventDefault();
        if (!handleTapKey()) return;
      } else if (CALLBACK_KEYS[event.code]) {
        const callback = callbacks[CALLBACK_KEYS[event.code]];
        if (callback) callback();
      } else {
        return;
      }

      event.preventDefault();
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
    onSwitchToPolyrhythm,
    onToggleInfoOverlay,
    onToggleTrainingOverlay,
    onManualTempoIncrease
  ]);
};

export default useKeyboardShortcuts;
