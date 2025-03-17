// src/components/metronome/MultiCircleMode/utils/audioScheduling.js
import { debugLog, measurePerformance } from './debugUtils';

/**
 * Schedules a click sound at the specified time
 * @param {Object} params - Parameters object
 * @param {AudioContext} params.audioCtx - Audio context
 * @param {AudioBuffer} params.buffer - Audio buffer to play
 * @param {number} params.when - When to play the sound (in audio context time)
 * @param {number} params.volume - Volume level (0.0 to 1.0)
 * @param {boolean} params.shouldMute - Whether to mute this beat
 * @param {Array} params.nodeRefs - Reference to active nodes for cleanup
 * @returns {Object} - The created source node
 */
export const scheduleClick = ({ 
  audioCtx, 
  buffer, 
  when, 
  volume = 1.0,
  shouldMute = false,
  nodeRefs = []
}) => {
  if (!audioCtx || !buffer) {
    debugLog('Missing audio context or buffer, cannot schedule click');
    return null;
  }
  
  return measurePerformance('scheduleClick', () => {
    try {
      // Create and configure source
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
  
      // Create gain node for volume control
      const gainNode = audioCtx.createGain();
      
      // Apply muting if needed
      if (shouldMute) {
        gainNode.gain.value = 0;
      } else {
        gainNode.gain.value = Math.min(Math.max(volume, 0), 1); // Clamp volume between 0 and 1
      }
  
      // Connect the nodes
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
  
      // Start the sound at the specified time
      source.start(when);
      
      // Save reference for cleanup
      if (nodeRefs) {
        nodeRefs.push(source);
      }
  
      return source;
    } catch (err) {
      console.error('Error scheduling click:', err);
      return null;
    }
  });
};

/**
 * Gets the appropriate click buffer based on accent pattern
 * @param {Object} params - Parameters object
 * @param {number} params.subIndex - Current subdivision index
 * @param {Array} params.accents - Accent pattern array
 * @param {AudioBuffer} params.normalBuffer - Regular click sound
 * @param {AudioBuffer} params.accentBuffer - Accented click sound 
 * @param {AudioBuffer} params.firstBuffer - First beat click sound
 * @returns {AudioBuffer} - The appropriate buffer to play
 */
export const getClickBuffer = ({
  subIndex,
  accents,
  normalBuffer,
  accentBuffer,
  firstBuffer
}) => {
  // Sanity check if we have valid buffers
  if (!normalBuffer) return null;
  
  // First beat of measure gets first beat sound (if available)
  if (subIndex === 0 && firstBuffer) {
    return firstBuffer;
  }
  
  // Check accent pattern (if exists)
  if (accents && accents.length > 0) {
    const accentValue = accents[subIndex % accents.length];
    
    // Accent value of 2 means use accent buffer
    if (accentValue === 2 && accentBuffer) {
      return accentBuffer;
    }
    
    // Accent value of 0 means silent (we handle this at the muting level)
    // Accent value of 1 means normal click
    return normalBuffer;
  }
  
  // Default to normal click for all other cases
  return normalBuffer;
};

/**
 * Calculate precise timing adjustments for analog feel
 * @param {boolean} analogMode - Whether analog timing is enabled
 * @returns {number} - Time adjustment in seconds
 */
export const calculateAnalogTiming = (analogMode) => {
  if (!analogMode) return 0;
  
  // Add a small random timing variation to simulate analog feel
  // Range: -15ms to +15ms
  return (Math.random() * 0.03) - 0.015;
};

/**
 * Process all subdisions for a beat to handle swing feel 
 * @param {Object} params - Parameters
 * @param {number} params.subDivisionDuration - Base duration of a subdivision
 * @param {number} params.swingFactor - Amount of swing (0-1)
 * @param {number} params.totalSubdivisions - Total subdivisions in beat
 * @returns {Array<number>} - Array of adjusted timings for subdivisions
 */
export const calculateSwingTimings = ({
  subDivisionDuration,
  swingFactor,
  totalSubdivisions
}) => {
  if (!swingFactor || swingFactor <= 0) {
    // No swing, return equal divisions
    return Array(totalSubdivisions).fill(subDivisionDuration);
  }
  
  const timings = [];
  for (let i = 0; i < totalSubdivisions; i++) {
    const isEvenSub = (i % 2 === 0);
    const adjustedDuration = isEvenSub
      ? subDivisionDuration * (1 + swingFactor)
      : subDivisionDuration * (1 - swingFactor);
    timings.push(adjustedDuration);
  }
  
  return timings;
};