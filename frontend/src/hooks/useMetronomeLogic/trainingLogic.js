// src/hooks/useMetronomeLogic/trainingLogic.js - Enhanced Version

// Speed training never goes beyond this tempo (lower than TEMPO_MAX on purpose)
const MAX_TRAINING_TEMPO = 180;
// Largest tempo jump per step in BPM
const AUTO_SPEEDUP_MAX_STEP = 5;
const MANUAL_SPEEDUP_MAX_STEP = 10;
const DEFAULT_MANUAL_INCREASE_PERCENT = 5;
// Note: used with `||`, so a configured probability of 0 also falls back to this value (known quirk,
// pinned by tests, see docs/quality-report.md).
const DEFAULT_MUTE_PROBABILITY = 0.3;

/**
 * Special utility to force training UI updates across all metronome modes.
 * This creates and dispatches events that notify the training container.
 * 
 * @param {Object} detail - Optional details to include with the event
 */
export function forceTrainingUpdate(detail = {}) {
  try {
    // Try to use the global force update function if available
    if (typeof window !== 'undefined' && window.forceTrainingUpdate) {
      window.forceTrainingUpdate();
    }
    
    // Dispatch specialized events
    const commonDetail = {
      timestamp: Date.now(),
      silencePhase: window.isSilencePhaseRef?.current,
      ...detail
    };
    
    // Dispatch multiple event types for redundancy
    window.dispatchEvent(new CustomEvent('training-measure-update', { detail: commonDetail }));
    document.dispatchEvent(new CustomEvent('training-state-changed', { 
      bubbles: true, 
      detail: commonDetail 
    }));
    
    // Add a specific force-update event for components to listen for
    window.dispatchEvent(new CustomEvent('force-training-update', { 
      detail: commonDetail 
    }));
    
    // Log for debugging
    console.log('[Training] Force update triggered:', commonDetail);
  } catch (err) {
    console.warn('[Training] Error forcing update:', err);
  }
}

/**
 * Determine whether this beat should be muted based on training mode settings.
 * 
 * @param {Object} config 
 * @param {number} config.macroMode - 0: off, 1: fixed silence, 2: random silence
 * @param {Object} config.isSilencePhaseRef - Reference to silence phase state
 * @param {number} config.muteProbability - Probability of muting (for random mode)
 * @returns {boolean} - Whether to mute this beat
 */
export function shouldMuteThisBeat({ macroMode, isSilencePhaseRef, muteProbability }) {
  // No muting if training mode is off
  if (macroMode === 0) return false;
  
  // Always ensure global silence ref is updated
  if (isSilencePhaseRef) {
    window.isSilencePhaseRef = isSilencePhaseRef;
  }
  
  // Fixed silence intervals (mode 1)
  if (macroMode === 1) {
    return isSilencePhaseRef?.current === true;
  }
  
  // Random silence (mode 2)
  if (macroMode === 2) {
    // Generate random mute based on probability
    const randomMute = Math.random() < (muteProbability || DEFAULT_MUTE_PROBABILITY);
    
    // Update the silence phase for UI components to read
    if (isSilencePhaseRef) {
      // Only update and dispatch events if the state changed
      if (isSilencePhaseRef.current !== randomMute) {
        isSilencePhaseRef.current = randomMute;
        
        // Update global reference
        window.isSilencePhaseRef = isSilencePhaseRef;
        
        // Force training UI update
        forceTrainingUpdate({ mode: 'random', value: randomMute });
      }
    }
    
    return randomMute;
  }
  
  return false;
}

/**
 * Switch the silence phase of fixed-interval macro timing on or off and announce it
 * immediately (a critical state change: the UI must not wait for the next poll).
 */
function setSilencePhase(isSilencePhaseRef, silent) {
  console.log(silent ? `[Training] 🔇 STARTING SILENCE PHASE 🔇` : `[Training] 🔊 ENDING SILENCE PHASE 🔊`);

  const prevState = isSilencePhaseRef.current;
  isSilencePhaseRef.current = silent;
  window.isSilencePhaseRef = isSilencePhaseRef;

  forceTrainingUpdate({
    event: silent ? 'silence-start' : 'silence-end',
    prevState,
    newState: silent
  });
}

/**
 * Fixed silence intervals: play N measures, then stay silent for M measures.
 * @returns {boolean} - Whether the training UI needs an update because a counter moved
 */
function advanceFixedSilence({
  isSilencePhaseRef,
  measureCountRef,
  muteMeasureCountRef,
  measuresUntilMute,
  muteDurationMeasures
}) {
  if (!isSilencePhaseRef) return false;

  if (!isSilencePhaseRef.current) {
    if (measureCountRef && measureCountRef.current >= measuresUntilMute) {
      if (muteMeasureCountRef) {
        muteMeasureCountRef.current = 0;
      }
      setSilencePhase(isSilencePhaseRef, true);
    }
    return false;
  }

  // Already in the silence phase: count it and check whether it is over
  if (!muteMeasureCountRef) return false;
  muteMeasureCountRef.current += 1;
  if (muteMeasureCountRef.current >= muteDurationMeasures) {
    muteMeasureCountRef.current = 0;
    if (measureCountRef) {
      measureCountRef.current = 0;
    }
    setSilencePhase(isSilencePhaseRef, false);
  }
  return true;
}

/**
 * Raise the tempo by a percentage, capped at MAX_TRAINING_TEMPO and at +maxStep BPM.
 * @returns {{currentTempo: number, newTempo: number, cappedNewTempo: number}}
 */
function computeTrainingTempo(currentTempo, increasePercent, maxStep) {
  const factor = 1 + increasePercent / 100;
  const newTempo = Math.min(Math.round(currentTempo * factor), MAX_TRAINING_TEMPO);
  const cappedNewTempo = Math.min(newTempo, currentTempo + maxStep);
  return { currentTempo, newTempo, cappedNewTempo };
}

/**
 * Automatic speed-up: after N measures outside a silence phase raise the tempo and restart the count.
 * @returns {boolean} - Whether the measure counter was reset
 */
function applyAutoSpeedUp({
  isSilencePhaseRef,
  measureCountRef,
  measuresUntilSpeedUp,
  tempoRef,
  setTempo,
  tempoIncreasePercent
}) {
  // Only process when not in silence phase
  if (isSilencePhaseRef && isSilencePhaseRef.current) return false;
  if (!measureCountRef || measureCountRef.current < measuresUntilSpeedUp) return false;

  if (tempoRef && setTempo) {
    const { currentTempo, cappedNewTempo } = computeTrainingTempo(
      tempoRef.current,
      tempoIncreasePercent,
      AUTO_SPEEDUP_MAX_STEP
    );
    // Only increase if it would change by at least 1 BPM
    if (cappedNewTempo > currentTempo) {
      console.log(`[Training] ⏩ AUTO INCREASING TEMPO from ${currentTempo} to ${cappedNewTempo} BPM`);
      setTempo(cappedNewTempo);
    }
  }

  measureCountRef.current = 0;
  return true;
}

/**
 * Logic to handle measure boundaries in training mode.
 * This function should be called at the start of each measure.
 * 
 * @param {Object} config
 * @param {number} config.macroMode - 0: off, 1: fixed silence, 2: random silence
 * @param {number} config.speedMode - 0: off, 1: auto increase
 * @param {Object} config.measureCountRef - Reference to measure count
 * @param {number} config.measuresUntilMute - Measures to play before muting
 * @param {Object} config.isSilencePhaseRef - Reference to silence phase state
 * @param {Object} config.muteMeasureCountRef - Reference to mute measure count
 * @param {number} config.muteDurationMeasures - How long to stay muted
 * @param {function} config.setTempo - Function to set new tempo
 * @param {Object} config.tempoRef - Reference to current tempo
 * @param {number} config.tempoIncreasePercent - Percentage to increase tempo
 * @param {number} config.measuresUntilSpeedUp - Measures before increasing tempo
 * @returns {boolean} - Whether to continue scheduler
 */
export function handleMeasureBoundary({
  macroMode,
  speedMode,
  measureCountRef,
  measuresUntilMute,
  isSilencePhaseRef,
  muteMeasureCountRef,
  muteDurationMeasures,
  setTempo,
  tempoRef,
  tempoIncreasePercent,
  measuresUntilSpeedUp
}) {
  // No-op if training mode is off
  if (macroMode === 0 && speedMode === 0) return true;
  
  // Always ensure global silence ref is updated
  if (isSilencePhaseRef) {
    window.isSilencePhaseRef = isSilencePhaseRef;
  }
  
  // Increment measure counter at the start of each measure
  let shouldForceUpdate = false;
  if (measureCountRef) {
    measureCountRef.current += 1;
    shouldForceUpdate = true;
  }
  
  if (macroMode === 1) {
    shouldForceUpdate = advanceFixedSilence({
      isSilencePhaseRef,
      measureCountRef,
      muteMeasureCountRef,
      measuresUntilMute,
      muteDurationMeasures
    }) || shouldForceUpdate;
  }
  
  if (speedMode === 1) {
    shouldForceUpdate = applyAutoSpeedUp({
      isSilencePhaseRef,
      measureCountRef,
      measuresUntilSpeedUp,
      tempoRef,
      setTempo,
      tempoIncreasePercent
    }) || shouldForceUpdate;
  }
  
  // If any counters changed, force a training UI update
  if (shouldForceUpdate) {
    forceTrainingUpdate({ event: 'measure-boundary' });
  }
  
  // Always continue scheduler
  return true;
}

/**
 * Handle manual tempo acceleration for speed training mode 2.
 * 
 * @param {Object} config
 * @param {number} config.tempoIncreasePercent - Percentage to increase tempo
 * @param {Object} config.tempoRef - Reference to current tempo value
 * @param {function} config.setTempo - Function to set new tempo
 * @returns {number} - The new tempo value
 */
export function manualTempoAcceleration({
  tempoIncreasePercent,
  tempoRef,
  setTempo
}) {
  // Validate inputs
  if (!tempoRef || tempoRef.current === undefined) {
    throw new Error('Invalid tempoRef');
  }
  
  if (typeof setTempo !== 'function') {
    throw new Error('setTempo must be a function');
  }
  
  // Cap the new tempo at a reasonable maximum and limit the jump per click
  const { currentTempo, newTempo, cappedNewTempo } = computeTrainingTempo(
    tempoRef.current,
    tempoIncreasePercent || DEFAULT_MANUAL_INCREASE_PERCENT,
    MANUAL_SPEEDUP_MAX_STEP
  );
  
  console.log(`[Training] ⏩ MANUAL TEMPO INCREASE from ${currentTempo} to ${cappedNewTempo} BPM (original calc: ${newTempo})`);
  
  // Apply the new capped tempo
  setTempo(cappedNewTempo);
  
  // Force an update to refresh the UI
  forceTrainingUpdate({
    event: 'manual-tempo-increase',
    oldTempo: currentTempo,
    newTempo: cappedNewTempo
  });
  
  return cappedNewTempo;
}