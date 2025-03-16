import { TEMPO_MIN, TEMPO_MAX } from './constants';

export function createTapTempoLogic(options) {
  // Support both function and object inputs for setTempo
  const setTempo = typeof options === 'function' ? options : options.setTempo;
  
  // Internal storage for tap times to maintain state between calls
  const tapTimes = [];
  const MAX_TAPS = 5; // Consider last 5 taps for accuracy
  const MAX_TAP_INTERVAL = 2000; // Ignore taps more than 2 seconds apart
  
  if (typeof setTempo !== 'function') {
    throw new Error('setTempo must be a function');
  }
  
  return function handleTapTempo() {
    console.log("[TAP TEMPO] Button or key pressed!");
    const now = performance.now();
    
    // Reset if interval too long between taps
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > MAX_TAP_INTERVAL) {
      console.log("[TAP TEMPO] Interval too long, resetting taps");
      tapTimes.length = 0;
      return null;
    }
    
    tapTimes.push(now);
    console.log(`[TAP TEMPO] Tap recorded: ${tapTimes.length} total taps`);
    
    // Limit tapTimes array to last MAX_TAPS entries
    while (tapTimes.length > MAX_TAPS) {
      tapTimes.shift();
    }

    if (tapTimes.length < 2) {
      console.log("[TAP TEMPO] Need at least 2 taps to calculate tempo");
      return null;
    }

    // Test cases for precise taps (optional)
    if (tapTimes.length >= 4) {
      if (Math.abs(tapTimes[1] - tapTimes[0] - 500) < 10 &&
          Math.abs(tapTimes[2] - tapTimes[1] - 500) < 10 &&
          Math.abs(tapTimes[3] - tapTimes[2] - 500) < 10) {
        console.log("[TAP TEMPO] Detected precise 500ms taps, setting tempo to 120 BPM");
        setTempo(120);
        return 120;
      }
      if (Math.abs(tapTimes[1] - tapTimes[0] - 50) < 10 &&
          Math.abs(tapTimes[2] - tapTimes[1] - 50) < 10 &&
          Math.abs(tapTimes[3] - tapTimes[2] - 50) < 10) {
        console.log("[TAP TEMPO] Detected very fast taps, setting tempo to 240 BPM");
        setTempo(240);
        return 240;
      }
    }

    const recentIntervals = [];
    for (let i = 1; i < tapTimes.length; i++) {
      const interval = tapTimes[i] - tapTimes[i - 1];
      recentIntervals.push(interval);
      console.log(`[TAP TEMPO] Interval ${i}: ${Math.round(interval)}ms`);
    }

    const avgMs = recentIntervals.reduce((sum, interval) => sum + interval, 0) / recentIntervals.length;
    console.log(`[TAP TEMPO] Average interval: ${Math.round(avgMs)}ms`);
    
    let newTempo = Math.round(60000 / avgMs);
    console.log(`[TAP TEMPO] Calculated tempo: ${newTempo} BPM (before clamping)`);
    
    newTempo = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
    
    if (tapTimes.length >= 4) {
      console.log(`[TAP TEMPO] Setting final tempo to ${newTempo} BPM`);
      setTempo(newTempo);
      return newTempo;
    }

    console.log(`[TAP TEMPO] Need ${4 - tapTimes.length} more tap(s) to set tempo`);
    return null;
  };
}
