// src/components/metronome/MultiCircleMode/hooks/useTrainingModeLogic.js
import { useRef, useCallback } from 'react';
import { debugLog } from '../utils/debugUtils';

/**
 * Hook to manage training mode features like muting, speeding up, etc.
 */
export function useTrainingModeLogic({
  macroMode,
  speedMode,
  tempoRef,
  setTempo,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  measuresUntilSpeedUp,
  tempoIncreasePercent
}) {
  // Training mode refs
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const lastTempoIncreaseTimeRef = useRef(0);

  /**
   * Handle logic at measure boundaries (muting, tempo increases)
   */
  const handleMeasureBoundary = useCallback(() => {
    // Increment the measure counter
    measureCountRef.current++;
    
    debugLog(`[Training] Measure count: ${measureCountRef.current}/${measuresUntilSpeedUp}, speedMode=${speedMode}`);
    
    // Dispatch event for UI updates to ensure TrainingActiveContainer sees the updated count
    window.dispatchEvent(new CustomEvent('training-measure-update'));
    
    // Macro Timing Mode - Handle silence phase
    if (macroMode === 1) {
      if (!isSilencePhaseRef.current) {
        // Check if we should enter silence phase
        if (measureCountRef.current >= measuresUntilMute) {
          debugLog(`[Training] 🔇 STARTING SILENCE PHASE 🔇`);
          isSilencePhaseRef.current = true;
          muteMeasureCountRef.current = 0;
          
          // Make sure the global silence reference is updated
          window.isSilencePhaseRef = isSilencePhaseRef;
          
          // Notify UI
          window.dispatchEvent(new CustomEvent('training-measure-update'));
        }
      } else {
        // Already in silence phase, increment counter
        muteMeasureCountRef.current++;
        
        debugLog(`[Training] Silence phase: ${muteMeasureCountRef.current}/${muteDurationMeasures}`);
        
        // Check if we should exit silence phase
        if (muteMeasureCountRef.current >= muteDurationMeasures) {
          debugLog(`[Training] 🔊 ENDING SILENCE PHASE 🔊`);
          isSilencePhaseRef.current = false;
          window.isSilencePhaseRef = isSilencePhaseRef;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0; // Reset measure count after silence ends
          
          // Notify UI
          window.dispatchEvent(new CustomEvent('training-measure-update'));
        }
      }
    }
    
    // Speed Training Mode - Handle auto tempo increase
    if (speedMode === 1 && !isSilencePhaseRef.current) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        // Calculate new tempo with percentage increase
        const factor = 1 + tempoIncreasePercent / 100;
        const newTempo = Math.min(Math.round(tempoRef.current * factor), 240);
        
        // Only increase if it would change by at least 1 BPM
        if (newTempo > tempoRef.current) {
          debugLog(`⏩ AUTO INCREASING TEMPO from ${tempoRef.current} to ${newTempo} BPM (${tempoIncreasePercent}%)`);
          
          // Set new tempo
          setTempo(newTempo);
          
          // Reset measure counter after tempo increase
          measureCountRef.current = 0;
          
          // Notify UI
          window.dispatchEvent(new CustomEvent('training-measure-update'));
        }
      }
    }

    return true; // Continue scheduler
  }, [
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    tempoRef,
    setTempo
  ]);

  return {
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    lastTempoIncreaseTimeRef,
    handleMeasureBoundary
  };
}