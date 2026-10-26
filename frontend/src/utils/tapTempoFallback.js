import { clampTempo } from '../hooks/useMetronomeLogic/constants';

// Built-in tap tempo used when no metronome component registered a handler.
// Taps are kept in window._tapTempoTimes; the tempo is applied after four valid taps.
const MIN_TAP_INTERVAL = 200; // Milliseconds
const MAX_TAP_INTERVAL = 2000; // Milliseconds
const COMMON_TEMPOS = [60, 90, 100, 120, 140, 160, 180]; // Common tempos for stability

export function applyFallbackTap(event, setTempo) {
  // Store timestamp for future tap tempo calculation
  window._tapTempoTimes = window._tapTempoTimes || [];
  
  // Get the current timestamp
  const now = event.detail.timestamp || performance.now();
  
  // Check if this tap is too close to the previous one (debounce)
  if (window._tapTempoTimes.length > 0) {
    const lastTap = window._tapTempoTimes[window._tapTempoTimes.length - 1];
    if (now - lastTap < MIN_TAP_INTERVAL) {
      console.log(`[APP] Tap too soon after previous (${Math.round(now - lastTap)}ms), ignoring`);
      return;
    }
    
    // Reset if too long between taps
    if (now - lastTap > MAX_TAP_INTERVAL) {
      console.log(`[APP] Too long since last tap (${Math.round(now - lastTap)}ms), resetting`);
      window._tapTempoTimes = [now];
      return;
    }
  }
  
  // Add the current tap time
  window._tapTempoTimes.push(now);
  console.log(`[APP] Tap recorded: ${window._tapTempoTimes.length} total taps`);
  
  // Keep only the last 6 taps
  while (window._tapTempoTimes.length > 6) {
    window._tapTempoTimes.shift();
  }
  
  // Need at least 3 taps for a stable tempo
  if (window._tapTempoTimes.length >= 3) {
    // Calculate intervals between consecutive taps
    let intervals = [];
    for (let i = 1; i < window._tapTempoTimes.length; i++) {
      const interval = window._tapTempoTimes[i] - window._tapTempoTimes[i-1];
      if (interval >= MIN_TAP_INTERVAL && interval <= MAX_TAP_INTERVAL) {
        intervals.push(interval);
        console.log(`[APP] Interval ${i}: ${Math.round(interval)}ms`);
      }
    }
    
    // Need at least one valid interval
    if (intervals.length === 0) {
      console.log("[APP] No valid intervals");
      return;
    }
    
    // Remove outliers (intervals that are too far from median)
    if (intervals.length >= 3) {
      intervals.sort((a, b) => a - b);
      const median = intervals[Math.floor(intervals.length / 2)];
      const filteredIntervals = intervals.filter(i => Math.abs(i - median) / median < 0.4);
      
      // Only use filtered intervals if we have enough
      if (filteredIntervals.length >= 2) {
        intervals = filteredIntervals;
      }
    }
    
    // Calculate average interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    let newTempo = Math.round(60000 / avgInterval);
    
    // Snap to common tempos if close
    for (const commonTempo of COMMON_TEMPOS) {
      const percentDifference = Math.abs(newTempo - commonTempo) / commonTempo;
      if (percentDifference < 0.05) {
        console.log(`[APP] Snapping from ${newTempo} to ${commonTempo} BPM (common tempo)`);
        newTempo = commonTempo;
        break;
      }
    }
    
    // Clamp tempo to valid range
    const clampedTempo = clampTempo(newTempo);
    console.log(`[APP] Calculated tempo: ${clampedTempo} BPM`);
    
    // Only actually set the tempo after we have enough taps for accuracy
    if (window._tapTempoTimes.length >= 4) {
      console.log(`[APP] Setting tempo to ${clampedTempo} BPM`);
      setTempo(clampedTempo);
      
      // Reset for next sequence after successfully setting tempo
      window._tapTempoTimes = [];
    } else {
      console.log(`[APP] Need ${4 - window._tapTempoTimes.length} more tap(s) to confirm tempo`);
    }
  } else {
    console.log(`[APP] Need ${3 - window._tapTempoTimes.length} more tap(s) to calculate tempo`);
  }
}
