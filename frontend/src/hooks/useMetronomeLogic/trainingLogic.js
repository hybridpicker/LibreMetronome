// src/hooks/useMetronomeLogic/trainingLogic.js
import { TEMPO_MIN, TEMPO_MAX } from './constants';

/**
 * Manually accelerate tempo using the same logic as auto tempo increase
 */
export function manualTempoAcceleration({
  tempoIncreasePercent,
  tempoRef,
  setTempo
}) {
  // Validate inputs
  if (!tempoRef || typeof tempoRef.current !== 'number') {
    throw new Error('Invalid tempoRef');
  }
  if (typeof setTempo !== 'function') {
    throw new Error('setTempo must be a function');
  }

  // Calculate new tempo with percentage increase
  const factor = 1 + tempoIncreasePercent / 100;
  const newTempo = Math.round(tempoRef.current * factor);
  
  // Clamp to maximum tempo
  const clampedTempo = Math.min(newTempo, TEMPO_MAX);
  
  // Set the new tempo
  setTempo(clampedTempo);
  
  return clampedTempo;
}

/**
 * Called every time subIndex returns to 0 (i.e. at the start of each measure).
 * 
 * In "fixed silence" or "random silence" modes, we track measure counts and
 * possibly enable or disable silence. In "speed mode," we might automatically
 * increase the BPM after a certain # of measures.
 */
export function handleMeasureBoundary({
  measureCountRef,
  muteMeasureCountRef,
  isSilencePhaseRef,
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  measuresUntilSpeedUp,
  tempoIncreasePercent,
  tempoRef, // so we can read the current tempo
  setTempo
}) {
  // Increment measure count
  measureCountRef.current += 1;
  
  // Macro mode 1: "fixed silence after X measures"
  if (macroMode === 1) {
    if (!isSilencePhaseRef.current) {
      // check if we should enter silence
      if (measureCountRef.current >= measuresUntilMute) {
        isSilencePhaseRef.current = true;
        muteMeasureCountRef.current = 0;
        measureCountRef.current = 0;
      }
    } else {
      // we are in silence → keep counting
      muteMeasureCountRef.current += 1;
      if (muteMeasureCountRef.current >= muteDurationMeasures) {
        isSilencePhaseRef.current = false;
        muteMeasureCountRef.current = 0;
        measureCountRef.current = 0;
      }
    }
  }
  // Macro mode 2: random-silence logic could go here

  // Speed mode 1: Increase tempo after X measures
  if (speedMode === 1 && !isSilencePhaseRef.current) {
    if (measureCountRef.current >= measuresUntilSpeedUp) {
      const factor = 1 + tempoIncreasePercent / 100;
      const newTempo = Math.round(tempoRef.current * factor);
      setTempo(prev => Math.min(newTempo, 240));
      measureCountRef.current = 0;
    }
  }
  
  // Dispatch event to notify components of measure count update
  const measureUpdateEvent = new CustomEvent('training-measure-update', {
    detail: {
      measureCount: measureCountRef.current,
      muteMeasureCount: muteMeasureCountRef.current,
      isSilencePhase: isSilencePhaseRef.current
    }
  });
  window.dispatchEvent(measureUpdateEvent);
}

/**
 * For deciding if the current beat is muted due to macro-mode (e.g. random silence).
 */
export function shouldMuteThisBeat({
  macroMode,
  muteProbability,
  isSilencePhaseRef
}) {
  if (macroMode === 1 && isSilencePhaseRef.current) {
    return true;
  }
  if (macroMode === 2) {
    // random chance
    return Math.random() < muteProbability;
  }
  return false;
}