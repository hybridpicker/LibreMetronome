// src/hooks/useMetronomeLogic/tapTempo.js
import { TEMPO_MIN, TEMPO_MAX } from './constants';

export function createTapTempoLogic(options) {
  // Support both function and object inputs
  const setTempo = typeof options === 'function' ? options : options.setTempo;
  
  // Store tap times in a closure to maintain them between calls
  const tapTimes = [];
  const MAX_TAPS = 5; // Number of recent taps to consider
  const MAX_TAP_INTERVAL = 2000; // Ignore taps more than 2 seconds apart
  
  // Return the tap handler function
  return function handleTapTempo() {
    const now = performance.now();
    
    // If last tap was too long ago, reset the array
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > MAX_TAP_INTERVAL) {
      tapTimes.length = 0;
    }
    
    // Add current tap
    tapTimes.push(now);
    console.log("Tap registered at", now);
    
    // Limit to last MAX_TAPS taps for better accuracy:
    while (tapTimes.length > MAX_TAPS) {
      tapTimes.shift();
    }

    // Need at least 2 taps to calculate tempo
    if (tapTimes.length < 2) {
      console.log("Need at least one more tap to calculate tempo");
      return null;
    }

    // Calculate average time interval between taps
    let sum = 0;
    for (let i = 1; i < tapTimes.length; i++) {
      const interval = tapTimes[i] - tapTimes[i - 1];
      sum += interval;
      console.log(`Tap interval ${i}: ${interval.toFixed(0)}ms`);
    }
    
    const avgMs = sum / (tapTimes.length - 1);
    const newTempo = Math.round(60000 / avgMs);
    
    // Clamp between min and max
    const clampedTempo = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
    
    console.log(`Calculated tempo: ${newTempo} BPM, clamped to: ${clampedTempo} BPM`);
    
    // Set the tempo if we have a valid function
    if (typeof setTempo === 'function') {
      try {
        setTempo(clampedTempo);
        console.log(`Successfully set tempo to ${clampedTempo} BPM`);
      } catch (err) {
        console.error("Error setting tempo:", err);
      }
    } else {
      console.error("setTempo is not a function:", setTempo);
    }
    
    return clampedTempo;
  };
}