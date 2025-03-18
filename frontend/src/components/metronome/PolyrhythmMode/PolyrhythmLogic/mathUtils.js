// src/components/metronome/PolyrhythmMode/PolyrhythmLogic/mathUtils.js

/**
 * Calculate the least common multiple (LCM) of two numbers
 * Used to determine when both rhythms will realign
 */
export const lcm = (a, b) => {
    // Helper to find greatest common divisor
    const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
    const result = (a * b) / gcd(a, b);
    
    // Debug logging for LCM calculation
    console.log(`LCM calculation: ${a}:${b} = ${result}`);
    
    return result;
  };
  
  /**
   * Calculate timing information for both circles
   * - Calculates interval for each circle based on global BPM
   * - Determines the common cycle length (when both patterns realign)
   */
  export const getTimingInfo = ({ tempoRef, innerBeatsRef, outerBeatsRef }) => {
    // Convert BPM to seconds per beat
    const secondsPerBeat = 60 / tempoRef.current;
    
    // Calculate intervals for each circle
    // Formula: interval = (60 / BPM) / numberOfBeats
    const innerInterval = secondsPerBeat / innerBeatsRef.current;
    const outerInterval = secondsPerBeat / outerBeatsRef.current;
    
    // Calculate when both patterns will realign (complete polyrhythm cycle)
    const commonCycleLCM = lcm(innerBeatsRef.current, outerBeatsRef.current);
    
    // Duration of complete cycle in seconds
    const cycleDuration = (commonCycleLCM / innerBeatsRef.current) * innerInterval;
    
    // Debug logging for polyrhythm timing
    console.log(`Polyrhythm timing:
      - Tempo: ${tempoRef.current} BPM
      - Inner beats: ${innerBeatsRef.current}, interval: ${innerInterval.toFixed(3)}s
      - Outer beats: ${outerBeatsRef.current}, interval: ${outerInterval.toFixed(3)}s
      - LCM: ${commonCycleLCM}, cycle duration: ${cycleDuration.toFixed(3)}s
      - Inner beats in cycle: ${commonCycleLCM / innerBeatsRef.current}
      - Outer beats in cycle: ${commonCycleLCM / outerBeatsRef.current}
    `);
    
    return {
      innerInterval,
      outerInterval,
      cycleDuration,
      commonCycleLCM
    };
  };