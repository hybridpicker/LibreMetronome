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
      macroMode: initialMacroMode = 0,
      speedMode: initialSpeedMode = 0,
      isSilencePhaseRef,
      measureCountRef,
      measuresUntilMute = 4,
      muteMeasureCountRef,
      muteDurationMeasures = 2,
      muteProbability = 0.3,
      tempoIncreasePercent = 5,
      measuresUntilSpeedUp = 4,
      isPaused,
      setTrainingSettings,
      ...rest
    } = props;
    
    // Use state for training modes and parameters to allow toggling and editing
    const [macroMode, setMacroMode] = useState(initialMacroMode);
    const [speedMode, setSpeedMode] = useState(initialSpeedMode);
    const [localMeasuresUntilMute, setLocalMeasuresUntilMute] = useState(measuresUntilMute);
    const [localMuteDurationMeasures, setLocalMuteDurationMeasures] = useState(muteDurationMeasures);
    const [localMeasuresUntilSpeedUp, setLocalMeasuresUntilSpeedUp] = useState(measuresUntilSpeedUp);
    const [localTempoIncreasePercent, setLocalTempoIncreasePercent] = useState(tempoIncreasePercent);
    
    // Update local state when props change
    useEffect(() => {
      setMacroMode(initialMacroMode);
      setSpeedMode(initialSpeedMode);
      setLocalMeasuresUntilMute(measuresUntilMute);
      setLocalMuteDurationMeasures(muteDurationMeasures);
      setLocalMeasuresUntilSpeedUp(measuresUntilSpeedUp);
      setLocalTempoIncreasePercent(tempoIncreasePercent);
    }, [
      initialMacroMode, 
      initialSpeedMode, 
      measuresUntilMute, 
      muteDurationMeasures, 
      measuresUntilSpeedUp, 
      tempoIncreasePercent
    ]);
    
    // Removed console logs

    // Create local refs that we control completely
    const localSilenceRef = useRef(false);
    const localMeasureCountRef = useRef(0);
    const localMuteCountRef = useRef(0);
    
    // State variables for UI updates (fixing ESLint errors) - using underscore to show intentional non-use
    const [_, setMeasureCount] = useState(0); // eslint-disable-line no-unused-vars
    const [__, setMuteMeasureCount] = useState(0); // eslint-disable-line no-unused-vars
    const [___, setIsSilencePhase] = useState(0); // eslint-disable-line no-unused-vars
    
    // Force update counter to trigger UI refreshes
    const [updateCounter, setUpdateCounter] = useState(0);
    
    // Force update function that increments counter
    const forceUIUpdate = () => {
      // Removed noisy logging
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
    
    // Reset counters when training mode or playback state changes
    useEffect(() => {
      // Reset training state when modes change or playback state changes
      // to ensure UI and audio remain in sync
      localSilenceRef.current = false;
      localMeasureCountRef.current = 0;
      localMuteCountRef.current = 0;
      forceUIUpdate();
    }, [macroMode, speedMode, isPaused]);
    
    // Listen for training settings update events
    useEffect(() => {
      const handleTrainingSettingsUpdate = (event) => {
        const { 
          macroMode: newMacroMode, 
          speedMode: newSpeedMode 
        } = event.detail;
        
        if (newMacroMode !== undefined) {
          setMacroMode(newMacroMode);
          
          // Reset training state
          localSilenceRef.current = false;
          localMeasureCountRef.current = 0;
          localMuteCountRef.current = 0;
          
          // Update parent component if setTrainingSettings is available
          if (setTrainingSettings) {
            setTrainingSettings(prev => ({
              ...prev,
              macroMode: newMacroMode
            }));
          }
        }
        
        if (newSpeedMode !== undefined) {
          setSpeedMode(newSpeedMode);
          
          // Update parent component if setTrainingSettings is available
          if (setTrainingSettings) {
            setTrainingSettings(prev => ({
              ...prev,
              speedMode: newSpeedMode
            }));
          }
        }
        
        forceUIUpdate();
      };
      
      window.addEventListener('training-settings-update', handleTrainingSettingsUpdate);
      
      return () => {
        window.removeEventListener('training-settings-update', handleTrainingSettingsUpdate);
      };
    }, [setTrainingSettings]);
    
    // Listen for training parameter update events
    useEffect(() => {
      const handleTrainingParamUpdate = (event) => {
        const { type, newValue } = event.detail;
        
        // Removed console log
        
        switch (type) {
          case 'measuresUntilMute':
            setLocalMeasuresUntilMute(newValue);
            if (setTrainingSettings) {
              setTrainingSettings(prev => ({
                ...prev,
                measuresUntilMute: newValue
              }));
            }
            break;
            
          case 'muteDurationMeasures':
            setLocalMuteDurationMeasures(newValue);
            if (setTrainingSettings) {
              setTrainingSettings(prev => ({
                ...prev,
                muteDurationMeasures: newValue
              }));
            }
            break;
            
          case 'measuresUntilSpeedUp':
            setLocalMeasuresUntilSpeedUp(newValue);
            if (setTrainingSettings) {
              setTrainingSettings(prev => ({
                ...prev,
                measuresUntilSpeedUp: newValue
              }));
            }
            break;
            
          case 'tempoIncreasePercent':
            setLocalTempoIncreasePercent(newValue);
            if (setTrainingSettings) {
              setTrainingSettings(prev => ({
                ...prev,
                tempoIncreasePercent: newValue
              }));
            }
            break;
            
          default:
            // Silently ignore unknown parameters
        }
        
        // Reset training state when parameters change
        localSilenceRef.current = false;
        localMeasureCountRef.current = 0;
        localMuteCountRef.current = 0;
        
        forceUIUpdate();
      };
      
      window.addEventListener('training-param-update', handleTrainingParamUpdate);
      
      return () => {
        window.removeEventListener('training-param-update', handleTrainingParamUpdate);
      };
    }, [setTrainingSettings]);

    // Set up global event listeners to sync state and update UI more frequently.
    useEffect(() => {
      const handleMeasureUpdate = (event) => {
        // Removed excessive logging
        
        if (macroMode === 1) {
          if (!localSilenceRef.current) {
            localMeasureCountRef.current += 1;
            
            if (localMeasureCountRef.current >= measuresUntilMute) {
              localSilenceRef.current = true;
              localMuteCountRef.current = 0;
            }
          } else {
            localMuteCountRef.current += 1;
            
            if (localMuteCountRef.current >= muteDurationMeasures) {
              localSilenceRef.current = false;
              localMeasureCountRef.current = 0;
            }
          }
        } else if (macroMode === 2) {
          localMeasureCountRef.current += 1;
          const shouldMute = Math.random() < muteProbability;
          if (localSilenceRef.current !== shouldMute) {
            localSilenceRef.current = shouldMute;
          }
        }
        
        if (speedMode === 1 && !localSilenceRef.current) {
          localMeasureCountRef.current += 1;
          
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
      
      // Polling interval for training mode updates
      const pollInterval = setInterval(() => {
        if (macroMode !== 0 || speedMode !== 0) {
          setMeasureCount(localMeasureCountRef.current);
          setMuteMeasureCount(localMuteCountRef.current);
          setIsSilencePhase(localSilenceRef.current);
          forceUIUpdate();
        }
      }, 150); // Increased interval to reduce update frequency
      
      // Only run initial update for active training modes
      if (macroMode !== 0 || speedMode !== 0) {
        handleMeasureUpdate();
      }
      
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
      setIsSilencePhase,
      setTrainingSettings
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
            measuresUntilMute={localMeasuresUntilMute}
            muteMeasureCountRef={effectiveMuteMeasureCountRef}
            muteDurationMeasures={localMuteDurationMeasures}
            tempoIncreasePercent={localTempoIncreasePercent}
            measuresUntilSpeedUp={localMeasuresUntilSpeedUp}
            isPaused={isPaused}
            forceUpdate={updateCounter}
          />
        )}
        
        <WrappedMetronome 
          macroMode={macroMode}
          speedMode={speedMode}
          isSilencePhaseRef={effectiveIsSilencePhaseRef}
          measureCountRef={effectiveMeasureCountRef}
          measuresUntilMute={localMeasuresUntilMute}
          muteMeasureCountRef={effectiveMuteMeasureCountRef}
          muteDurationMeasures={localMuteDurationMeasures}
          muteProbability={muteProbability}
          tempoIncreasePercent={localTempoIncreasePercent}
          measuresUntilSpeedUp={localMeasuresUntilSpeedUp}
          isPaused={isPaused}
          forceTrainingUpdate={forceUIUpdate}
          {...rest} 
        />
      </div>
    );
  };
};

export default withTrainingContainer;