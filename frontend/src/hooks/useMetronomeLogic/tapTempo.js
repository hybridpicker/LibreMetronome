import { TEMPO_MIN, TEMPO_MAX } from './constants';

export function createTapTempoLogic(options) {
  // Support both function and object inputs for setTempo
  const setTempo = typeof options === 'function' ? options : options.setTempo;
  
  // Internal storage for tap times to maintain state between calls
  const tapTimes = [];
  const MAX_TAPS = 6; // Consider last 6 taps for better accuracy
  const MAX_TAP_INTERVAL = 2000; // Ignore taps more than 2 seconds apart
  const MIN_TAP_INTERVAL = 100; // Ignore taps that are too close together (debounce)
  const REQUIRED_TAPS = 4; // Require at least 4 taps for better accuracy
  
  // Constants for 120 BPM stability
  const COMMON_BPM_STABILITY_THRESHOLD = 0.05; // 5% threshold for snap-to stability
  const COMMON_TEMPOS = [60, 90, 100, 120, 140, 160, 180]; // Common tempos for snap-to
  
  // Keep track of last tap time for debouncing
  let lastTapTime = 0;
  
  if (typeof setTempo !== 'function') {
    throw new Error('setTempo must be a function');
  }
  
  return function handleTapTempo() {
    console.log("[TAP TEMPO] Button or key pressed!");
    const now = performance.now();
    
    // Debounce taps that are too close together
    if (lastTapTime && (now - lastTapTime < MIN_TAP_INTERVAL)) {
      console.log(`[TAP TEMPO] Tap too soon (${Math.round(now - lastTapTime)}ms), ignoring`);
      return null;
    }
    
    // Update last tap time for debouncing
    lastTapTime = now;
    
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

    // Calculate intervals between all consecutive taps
    const intervals = [];
    for (let i = 1; i < tapTimes.length; i++) {
      const interval = tapTimes[i] - tapTimes[i - 1];
      
      // Filter out invalid intervals (too short or too long)
      if (interval >= MIN_TAP_INTERVAL && interval <= MAX_TAP_INTERVAL) {
        intervals.push(interval);
        console.log(`[TAP TEMPO] Interval ${i}: ${Math.round(interval)}ms`);
      } else {
        console.log(`[TAP TEMPO] Skipping invalid interval ${i}: ${Math.round(interval)}ms`);
      }
    }
    
    // Need at least one valid interval to calculate tempo
    if (intervals.length === 0) {
      console.log("[TAP TEMPO] No valid intervals, need more taps");
      return null;
    }
    
    // Sort intervals and remove outliers (optional but improves stability)
    if (intervals.length >= 3) {
      // Sort intervals by duration
      intervals.sort((a, b) => a - b);
      
      // Calculate median to help identify outliers
      const median = intervals[Math.floor(intervals.length / 2)];
      
      // Filter out intervals that are too far from the median (more than 40% deviation)
      const filteredIntervals = intervals.filter(interval => 
        Math.abs(interval - median) / median < 0.4
      );
      
      // Only use filtered intervals if we have enough left
      if (filteredIntervals.length >= 2) {
        console.log(`[TAP TEMPO] Filtered ${intervals.length - filteredIntervals.length} outlier intervals`);
        intervals.length = 0;
        intervals.push(...filteredIntervals);
      }
    }

    // Calculate average interval more carefully
    const avgMs = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    console.log(`[TAP TEMPO] Average interval: ${Math.round(avgMs)}ms`);
    
    // Convert to BPM with higher precision (no rounding yet)
    const calculatedTempo = 60000 / avgMs;
    console.log(`[TAP TEMPO] Raw calculated tempo: ${calculatedTempo.toFixed(2)} BPM`);
    
    // Stability algorithm: snap to common tempos if close
    let newTempo = calculatedTempo;
    
    // Look for common tempos within stability threshold
    for (const commonTempo of COMMON_TEMPOS) {
      const percentDifference = Math.abs(calculatedTempo - commonTempo) / commonTempo;
      
      if (percentDifference < COMMON_BPM_STABILITY_THRESHOLD) {
        console.log(`[TAP TEMPO] Snapping from ${calculatedTempo.toFixed(2)} to ${commonTempo} BPM (common tempo)`);
        newTempo = commonTempo;
        break;
      }
    }
    
    // Round to nearest integer after stability adjustments
    newTempo = Math.round(newTempo);
    
    // Apply BPM limits
    newTempo = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
    console.log(`[TAP TEMPO] Final calculated tempo: ${newTempo} BPM`);
    
    // Only set the tempo after we have enough taps for accuracy
    if (tapTimes.length >= REQUIRED_TAPS) {
      console.log(`[TAP TEMPO] Setting final tempo to ${newTempo} BPM`);
      setTempo(newTempo);
      return newTempo;
    }

    console.log(`[TAP TEMPO] Need ${REQUIRED_TAPS - tapTimes.length} more tap(s) to set tempo`);
    return null;
  };
}
