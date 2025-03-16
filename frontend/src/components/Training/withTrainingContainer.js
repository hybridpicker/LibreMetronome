import React, { useEffect, useRef, useState } from 'react';
import TrainingActiveContainer from './TrainingActiveContainer';

/**
 * Universal Higher-Order Component to add training functionality to any metronome mode.
 * This HOC ensures all metronome modes handle training state consistently
 * by injecting standardized event handling and state management.
 * 
 * DIRECT FIX VERSION: Adjusted to always render the wrapped metronome (canvas)
 * and conditionally show the training UI. The training state (insb. silence phase)
 * is nun beim Pausieren sofort zurückgesetzt, sodass Audio und Anzeige wieder übereinstimmen.
 */
const withTrainingContainer = (WrappedMetronome) => {
  return function WrappedWithTraining(props) {
    // Extract training props
    const {
      macroMode = 0,
      speedMode = 0,
      isSilencePhaseRef,
      measureCountRef,
      measuresUntilMute = 4,
      muteMeasureCountRef,
      muteDurationMeasures = 2,
      muteProbability = 0.3,
      tempoIncreasePercent = 5,
      measuresUntilSpeedUp = 4,
      isPaused,
      ...rest
    } = props;
    
    console.log(`[withTrainingContainer] Wrapping ${WrappedMetronome.name || 'Component'} with TrainingContainer`);
    console.log(`[withTrainingContainer] macroMode=${macroMode}, speedMode=${speedMode}`);

    // Create local refs that we control completely
    const localSilenceRef = useRef(false);
    const localMeasureCountRef = useRef(0);
    const localMuteCountRef = useRef(0);
    
    // State variables for UI updates (fixing ESLint errors)
    const [measureCount, setMeasureCount] = useState(0);
    const [muteMeasureCount, setMuteMeasureCount] = useState(0);
    const [isSilencePhase, setIsSilencePhase] = useState(false);
    
    // Force update counter to trigger UI refreshes
    const [updateCounter, setUpdateCounter] = useState(0);
    
    // Force update function that increments counter
    const forceUIUpdate = () => {
      console.log('[withTrainingContainer] Forcing UI update');
      setUpdateCounter(prev => prev + 1);
    };
    
    // Keep a stable global reference to these refs
    useEffect(() => {
      window.trainingRefs = {
        silenceRef: localSilenceRef,
        measureCountRef: localMeasureCountRef,
        muteCountRef: localMuteCountRef,
        forceUpdate: forceUIUpdate
      };
      
      window.isSilencePhaseRef = localSilenceRef;
      
      return () => {
        delete window.trainingRefs;
        delete window.isSilencePhaseRef;
      };
    }, []);
    
    // Use our local refs in place of the original ones
    const effectiveIsSilencePhaseRef = localSilenceRef;
    const effectiveMeasureCountRef = localMeasureCountRef;
    const effectiveMuteMeasureCountRef = localMuteCountRef;
    
    // Reset counters when training mode or Playback-Zustand sich ändert
    useEffect(() => {
      console.log(`[withTrainingContainer] Training mode or playback state changed - macroMode=${macroMode}, speedMode=${speedMode}, isPaused=${isPaused}`);
      
      // Beim Pausieren und beim Starten wird der Trainingszustand zurückgesetzt,
      // sodass UI und Audio wieder synchron sind.
      localSilenceRef.current = false;
      localMeasureCountRef.current = 0;
      localMuteCountRef.current = 0;
      forceUIUpdate();
    }, [macroMode, speedMode, isPaused]);
    
    // Set up global event listeners to sync state and update UI more frequently.
    useEffect(() => {
      const handleMeasureUpdate = (event) => {
        console.log('[withTrainingContainer] Received measure update event');
        
        if (macroMode === 1) {
          if (!localSilenceRef.current) {
            localMeasureCountRef.current += 1;
            console.log(`[withTrainingContainer] Measure count: ${localMeasureCountRef.current}/${measuresUntilMute}`);
            
            if (localMeasureCountRef.current >= measuresUntilMute) {
              console.log('[withTrainingContainer] Entering silence phase');
              localSilenceRef.current = true;
              localMuteCountRef.current = 0;
            }
          } else {
            localMuteCountRef.current += 1;
            console.log(`[withTrainingContainer] Silence count: ${localMuteCountRef.current}/${muteDurationMeasures}`);
            
            if (localMuteCountRef.current >= muteDurationMeasures) {
              console.log('[withTrainingContainer] Exiting silence phase');
              localSilenceRef.current = false;
              localMeasureCountRef.current = 0;
            }
          }
        } else if (macroMode === 2) {
          localMeasureCountRef.current += 1;
          const shouldMute = Math.random() < muteProbability;
          if (localSilenceRef.current !== shouldMute) {
            console.log(`[withTrainingContainer] Random silence: ${shouldMute ? 'Muting' : 'Playing'}`);
            localSilenceRef.current = shouldMute;
          }
        }
        
        if (speedMode === 1 && !localSilenceRef.current) {
          localMeasureCountRef.current += 1;
          console.log(`[withTrainingContainer] Speed training measure: ${localMeasureCountRef.current}/${measuresUntilSpeedUp}`);
          
          if (localMeasureCountRef.current >= measuresUntilSpeedUp) {
            localMeasureCountRef.current = 0;
          }
        }
        
        setMeasureCount(localMeasureCountRef.current);
        setMuteMeasureCount(localMuteCountRef.current);
        setIsSilencePhase(localSilenceRef.current);
        forceUIUpdate();
      };
      
      window.addEventListener('training-measure-update', handleMeasureUpdate);
      
      // Polling-Intervall reduziert auf 50ms für schnellere Updates
      const pollInterval = setInterval(() => {
        if (macroMode !== 0 || speedMode !== 0) {
          setMeasureCount(localMeasureCountRef.current);
          setMuteMeasureCount(localMuteCountRef.current);
          setIsSilencePhase(localSilenceRef.current);
          forceUIUpdate();
        }
      }, 50);
      
      // Initialer Aufruf
      handleMeasureUpdate();
      
      return () => {
        window.removeEventListener('training-measure-update', handleMeasureUpdate);
        clearInterval(pollInterval);
      };
    }, [
      macroMode, 
      speedMode, 
      measuresUntilMute, 
      muteDurationMeasures, 
      muteProbability, 
      measuresUntilSpeedUp,
      setMeasureCount,
      setMuteMeasureCount,
      setIsSilencePhase
    ]);
    
    // Always render the metronome canvas.
    const shouldShowTraining = macroMode !== 0 || speedMode !== 0;
    
    return (
      <div className="metronome-with-training-wrapper" data-training-active={shouldShowTraining}>
        {shouldShowTraining && (
          <TrainingActiveContainer
            macroMode={macroMode}
            speedMode={speedMode}
            isSilencePhaseRef={effectiveIsSilencePhaseRef}
            measureCountRef={effectiveMeasureCountRef}
            measuresUntilMute={measuresUntilMute}
            muteMeasureCountRef={effectiveMuteMeasureCountRef}
            muteDurationMeasures={muteDurationMeasures}
            tempoIncreasePercent={tempoIncreasePercent}
            measuresUntilSpeedUp={measuresUntilSpeedUp}
            isPaused={isPaused}
            forceUpdate={updateCounter}
          />
        )}
        
        <WrappedMetronome 
          macroMode={macroMode}
          speedMode={speedMode}
          isSilencePhaseRef={effectiveIsSilencePhaseRef}
          measureCountRef={effectiveMeasureCountRef}
          measuresUntilMute={measuresUntilMute}
          muteMeasureCountRef={effectiveMuteMeasureCountRef}
          muteDurationMeasures={muteDurationMeasures}
          muteProbability={muteProbability}
          tempoIncreasePercent={tempoIncreasePercent}
          measuresUntilSpeedUp={measuresUntilSpeedUp}
          isPaused={isPaused}
          forceTrainingUpdate={forceUIUpdate}
          {...rest} 
        />
      </div>
    );
  };
};

export default withTrainingContainer;
