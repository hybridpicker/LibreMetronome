// src/components/metronome/MultiCircleMode/utils/circleSequencing.js
import { debugLog } from './debugUtils';

/**
 * Special handling for 3-circle case with fixed transition pattern
 * @param {number} currentIndex - Current circle index
 * @returns {number} - Next circle index
 */
export const nextCircleFor3CircleCase = (currentIndex) => {
  debugLog(`[3-CIRCLE] Computing next circle from ${currentIndex}`);
  let nextIndex;
  
  switch (currentIndex) {
    case 0:
      nextIndex = 1;
      break;
    case 1:
      nextIndex = 2;
      break;
    case 2:
      nextIndex = 0;
      break;
    default:
      nextIndex = 0;
  }
  
  debugLog(`[3-CIRCLE] Explicit transition: ${currentIndex} -> ${nextIndex}`);
  return nextIndex;
};

/**
 * Determine next circle in sequence based on number of circles
 * @param {number} currentIndex - Current circle index
 * @param {Array} circleSettings - Array of all circle configurations
 * @returns {number} - Next circle index
 */
export const getNextCircleIndex = (currentIndex, circleSettings) => {
  // Ensure circleSettings is defined and non-empty
  if (!circleSettings || circleSettings.length === 0) return 0;
  
  // Special handling for exactly 2 circles
  if (circleSettings.length === 2) {
    // For two circles: 0->1->0->1 alternation pattern
    const nextIndex = currentIndex === 0 ? 1 : 0;
    debugLog(`[2-CIRCLE] Force strict alternation: ${currentIndex} -> ${nextIndex}`);
    return nextIndex;
  }
  
  // Special handling for exactly 3 circles
  if (circleSettings.length === 3) {
    return nextCircleFor3CircleCase(currentIndex);
  }
  
  // Standard calculation for other cases
  return (currentIndex + 1) % circleSettings.length;
};

/**
 * Check if a complete cycle of all circles has been played
 * @param {number} currentIndex - Current circle index
 * @param {number} nextIndex - Next circle index
 * @param {number} totalCircles - Total number of circles
 * @returns {boolean} - True if a full cycle has completed
 */
export const isFullCycleCompleted = (currentIndex, nextIndex, totalCircles) => {
  // A full cycle completes when transitioning from the last circle back to the first
  return currentIndex === totalCircles - 1 && nextIndex === 0;
};