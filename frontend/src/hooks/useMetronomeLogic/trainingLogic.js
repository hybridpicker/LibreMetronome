// src/hooks/useMetronomeLogic/trainingLogic.js - Enhanced Version

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
    const randomMute = Math.random() < (muteProbability || 0.3);
    
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
  
  // Handle macro timing training (fixed silence intervals)
  if (macroMode === 1) {
    if (isSilencePhaseRef && !isSilencePhaseRef.current) {
      // Check if we should enter silence phase
      if (measureCountRef && measureCountRef.current >= measuresUntilMute) {
        console.log(`[Training] 🔇 STARTING SILENCE PHASE 🔇`);
        
        // Store previous state for comparison
        const prevState = isSilencePhaseRef.current;
        
        // Set the silence phase
        isSilencePhaseRef.current = true;
        
        // Update global reference
        window.isSilencePhaseRef = isSilencePhaseRef;
        
        // Reset mute measure counter
        if (muteMeasureCountRef) {
          muteMeasureCountRef.current = 0;
        }
        
        // Force an immediate update since this is a critical state change
        forceTrainingUpdate({ 
          event: 'silence-start',
          prevState,
          newState: true
        });
      }
    } else if (isSilencePhaseRef && isSilencePhaseRef.current) {
      // Already in silence phase, increment counter
      if (muteMeasureCountRef) {
        muteMeasureCountRef.current += 1;
        shouldForceUpdate = true;
        
        // Check if we should exit silence phase
        if (muteMeasureCountRef.current >= muteDurationMeasures) {
          console.log(`[Training] 🔊 ENDING SILENCE PHASE 🔊`);
          
          // Store previous state for comparison
          const prevState = isSilencePhaseRef.current;
          
          // Set the silence phase
          isSilencePhaseRef.current = false;
          
          // Update global reference 
          window.isSilencePhaseRef = isSilencePhaseRef;
          
          // Reset both counters
          muteMeasureCountRef.current = 0;
          if (measureCountRef) {
            measureCountRef.current = 0;
          }
          
          // Force an immediate update since this is a critical state change
          forceTrainingUpdate({
            event: 'silence-end',
            prevState,
            newState: false
          });
        }
      }
    }
  }
  
  // Handle speed training (auto tempo increase)
  if (speedMode === 1) {
    // Only process when not in silence phase
    if (!isSilencePhaseRef || !isSilencePhaseRef.current) {
      if (measureCountRef && measureCountRef.current >= measuresUntilSpeedUp) {
        // Calculate new tempo with percentage increase
        if (tempoRef && setTempo) {
          const factor = 1 + tempoIncreasePercent / 100;
          const currentTempo = tempoRef.current;
          
          // Cap the new tempo at a reasonable maximum
          const maxAllowedTempo = 180; // Same as in manual mode
          const newTempo = Math.min(Math.round(currentTempo * factor), maxAllowedTempo);
          
          // Ensure the tempo doesn't jump too much at once (max +5 BPM per auto-increase)
          const cappedNewTempo = Math.min(newTempo, currentTempo + 5);
          
          // Only increase if it would change by at least 1 BPM
          if (cappedNewTempo > currentTempo) {
            console.log(`[Training] ⏩ AUTO INCREASING TEMPO from ${currentTempo} to ${cappedNewTempo} BPM`);
            setTempo(cappedNewTempo);
          }
        }
        
        // Reset measure counter after tempo increase
        if (measureCountRef) {
          measureCountRef.current = 0;
          shouldForceUpdate = true;
        }
      }
    }
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
  
  // Calculate new tempo with percentage increase
  const factor = 1 + (tempoIncreasePercent || 5) / 100;
  const currentTempo = tempoRef.current;
  
  // Cap the new tempo at a reasonable maximum (lower than 240 for manual increases)
  const maxAllowedTempo = 180; // More reasonable maximum tempo 
  const newTempo = Math.min(Math.round(currentTempo * factor), maxAllowedTempo);
  
  // Ensure the tempo doesn't jump too much at once (max +10 BPM per click)
  const cappedNewTempo = Math.min(newTempo, currentTempo + 10);
  
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