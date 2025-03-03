// src/components/metronome/MultiCircleMode/hooks/useMultiCircleLogic.js
import { useState, useEffect, useRef, useCallback } from "react";
import useMetronomeLogic from "../../../../hooks/useMetronomeLogic";

const useMultiCircleLogic = ({
  tempo,
  setTempo,
  isPaused,
  setIsPaused,
  swing,
  volume,
  circleSettings,
  setCircleSettings,
  activeCircle,
  playingCircle,
  setPlayingCircle,
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  registerTogglePlay,
  registerTapTempo
}) => {
  // State tracking references
  const isTransitioningRef = useRef(false);
  const lastCircleSwitchCheckTimeRef = useRef(0);
  const measureCountRef = useRef(0);
  const isProcessingPlayPauseRef = useRef(false);
  
  // Training-specific references
  const isSilencePhaseRef = useRef(false);
  const muteMeasureCountRef = useRef(0);
  const lastTempoIncreaseRef = useRef(0);
  
  // Make silence phase ref globally available to metronome logic
  useEffect(() => {
    window.isSilencePhaseRef = isSilencePhaseRef;
    
    return () => {
      // Cleanup global refs when component unmounts
      delete window.isSilencePhaseRef;
    };
  }, []);
  
  // Create ref for playing settings (includes training settings)
  const playingSettingsRef = useRef({
    ...circleSettings[playingCircle],
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp
  });
  
  // Update the playing settings ref whenever relevant props change
  useEffect(() => {
    if (circleSettings && playingCircle < circleSettings.length) {
      playingSettingsRef.current = {
        ...circleSettings[playingCircle],
        macroMode,
        speedMode,
        measuresUntilMute,
        muteDurationMeasures,
        muteProbability,
        tempoIncreasePercent,
        measuresUntilSpeedUp
      };
      console.log("Updated playing settings, beat mode:", playingSettingsRef.current.beatMode);
    }
  }, [
    playingCircle, 
    circleSettings, 
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp
  ]);
  
  // Create metronome logic with current playing settings
  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions: playingSettingsRef.current?.subdivisions || 4,
    setSubdivisions: () => {},
    isPaused,
    setIsPaused,
    swing,
    volume,
    accents: playingSettingsRef.current?.accents || [3, 1, 1, 1],
    analogMode: false,
    gridMode: false,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    beatMultiplier: playingSettingsRef.current?.beatMode === "quarter" ? 1 : 2,
    multiCircleMode: true
  });

  // Handle setting subdivisions (used by keyboard shortcuts)
  const handleSetSubdivisions = useCallback((subdivisionValue) => {
    if (subdivisionValue < 1 || subdivisionValue > 9) return;
    
    setCircleSettings(prev => {
      if (!prev || !prev.length) return prev;
      const updated = [...prev];
      if (activeCircle >= updated.length) return prev;
      
      updated[activeCircle] = {
        ...updated[activeCircle],
        subdivisions: subdivisionValue,
        accents: Array.from({ length: subdivisionValue }, (_, i) => (i === 0 ? 3 : 1))
      };
      return updated;
    });
  }, [activeCircle, setCircleSettings]);
  
  // ADD CIRCLE FUNCTION
  const addCircle = useCallback(() => {
    setCircleSettings(prev => {
      if (!prev || prev.length >= 3) { // MAX_CIRCLES = 3
        return prev;
      }
      return [
        ...prev,
        {
          subdivisions: 4,
          accents: Array.from({ length: 4 }, (_, i) => (i === 0 ? 3 : 1)),
          beatMode: "quarter"
        }
      ];
    });
  }, [setCircleSettings]);

  // REMOVE CIRCLE FUNCTION
  const removeCircle = useCallback((indexToRemove) => {
    if (!circleSettings || circleSettings.length <= 1) {
      return;
    }
    
    setCircleSettings(prev => prev.filter((_, idx) => idx !== indexToRemove));
    
    // If the playing circle is removed, set the playing circle to 0
    if (playingCircle === indexToRemove) {
      setPlayingCircle(0);
    } else if (playingCircle > indexToRemove) {
      // If a circle before the playing circle is removed, adjust the index
      setPlayingCircle(prev => prev - 1);
    }
  }, [circleSettings, playingCircle, setPlayingCircle, setCircleSettings]);

  // Update accent on beat click
  const updateAccent = useCallback((beatIndex, circleIndex) => {
    if (beatIndex === 'remove') {
      removeCircle(circleIndex);
      return;
    }
    
    setCircleSettings(prev => {
      if (!prev || !prev.length) return prev;
      const updated = [...prev];
      if (activeCircle >= updated.length) return prev;
      
      const circle = updated[activeCircle];
      if (!circle.accents || beatIndex >= circle.accents.length) return prev;
      
      const acc = [...circle.accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...circle, accents: acc };
      return updated;
    });
  }, [activeCircle, removeCircle, setCircleSettings]);

  // Handle subdivision changes and circle switching
  const prevSubdivisionRef = useRef(null);
  
  const handleSubdivisionChange = useCallback((newSubdivision) => {
    if (isPaused || !circleSettings || circleSettings.length <= 1) return;
    
    // Only detect end of measure when current subdivision is 0 and previous wasn't
    if (
      prevSubdivisionRef.current !== null &&
      prevSubdivisionRef.current !== newSubdivision &&
      newSubdivision === 0 &&
      !isTransitioningRef.current
    ) {
      // Update measure counter
      const newMeasureCount = measureCountRef.current + 1;
      measureCountRef.current = newMeasureCount;
      console.log(`[Multi-Circle] End of measure detected. Global count: ${newMeasureCount}/${measuresUntilMute}`);
      
      // TRAINING MODE LOGIC - Completely separate from circle switching
      if (macroMode === 1) {
        if (!isSilencePhaseRef.current) {
          // Check if we should enter silence phase
          if (newMeasureCount >= measuresUntilMute) {
            console.log(`[Training] 🔇 STARTING SILENCE PHASE 🔇 (after ${newMeasureCount} measures)`);
            isSilencePhaseRef.current = true; 
            window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
            muteMeasureCountRef.current = 0;
            // Keep measure count for reference
          }
        } else {
          // Already in silence phase, increment counter
          const newMuteCount = muteMeasureCountRef.current + 1;
          muteMeasureCountRef.current = newMuteCount;
          console.log(`[Training] Silence phase: ${newMuteCount}/${muteDurationMeasures}`);
          
          // Check if we should exit silence phase
          if (newMuteCount >= muteDurationMeasures) {
            console.log("[Training] 🔊 ENDING SILENCE PHASE 🔊");
            isSilencePhaseRef.current = false;
            window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
            muteMeasureCountRef.current = 0;
            measureCountRef.current = 0; // Only reset measure count AFTER silence ends
          }
        }
      }
      
      // SPEED TRAINING LOGIC
      if (speedMode === 1 && !isSilencePhaseRef.current) {
        if (newMeasureCount >= measuresUntilSpeedUp) {
          const factor = 1 + tempoIncreasePercent / 100;
          const newTempo = Math.min(Math.round(tempo * factor), 240);
          console.log(`[Training] ⏩ INCREASING TEMPO from ${tempo} to ${newTempo} BPM`);
          setTempo(newTempo);
          measureCountRef.current = 0; // Reset measure count after tempo increase
        }
      }
      
      // CIRCLE SWITCHING LOGIC - Independent of training mode
      const now = Date.now();
      if (now - lastCircleSwitchCheckTimeRef.current < 500) return;
      lastCircleSwitchCheckTimeRef.current = now;
      
      // Begin transition between circles
      isTransitioningRef.current = true;
      const nextCircleIndex = (playingCircle + 1) % circleSettings.length;
      console.log(`[Multi-Circle] Switching from circle ${playingCircle} to ${nextCircleIndex}`);
      
      // Make sure silence phase is consistent
      if (isSilencePhaseRef.current) {
        console.log("[Multi-Circle] Transferring silence phase to next circle");
        // Ensure global reference is updated
        window.isSilencePhaseRef = isSilencePhaseRef;
      }
      
      // Store the current and next beat modes
      const currentBeatMode = playingSettingsRef.current.beatMode;
      const nextBeatMode = circleSettings[nextCircleIndex].beatMode;
      console.log(`[Multi-Circle] Transitioning from ${currentBeatMode} to ${nextBeatMode} mode`);
      
      // Update the playing settings
      playingSettingsRef.current = {
        ...circleSettings[nextCircleIndex],
        macroMode,
        speedMode,
        measuresUntilMute,
        muteDurationMeasures,
        muteProbability,
        tempoIncreasePercent,
        measuresUntilSpeedUp,
      };
      
      // First stop the current scheduler
      if (logic && logic.stopScheduler) {
        logic.stopScheduler();
      }
      
      // Update the playing circle
      setPlayingCircle(nextCircleIndex);
      
      // Use a minimal delay for the audio transition to avoid double beats
      if (!isPaused && logic && logic.audioCtx) {
        const currentTime = logic.audioCtx.currentTime;
        const secondsPerBeat = 60 / (tempo * (nextBeatMode === "eighth" ? 2 : 1));
        
        setTimeout(() => {
          if (!isPaused && !isTransitioningRef.current && logic && logic.startScheduler) {
            try {
              // Start at precisely the next beat time
              logic.startScheduler(currentTime + secondsPerBeat);
              console.log(`[Multi-Circle] Started next circle rhythm at time ${currentTime + secondsPerBeat}`);
            } catch (err) {
              console.error("Error starting next circle:", err);
            }
          }
        }, 20);
      }
      
      // Clear transition flag with delay
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
    }
    
    prevSubdivisionRef.current = newSubdivision;
  }, [
    isPaused, 
    circleSettings, 
    playingCircle,
    logic,
    tempo,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    setTempo,
    setPlayingCircle
  ]);
  
  useEffect(() => {
    if (!isPaused && logic && logic.currentSubdivision !== undefined) {
      handleSubdivisionChange(logic.currentSubdivision);
    }
  }, [logic?.currentSubdivision, handleSubdivisionChange, isPaused]);

  // Handle Play/Pause
  const handlePlayPause = useCallback(() => {
    if (isProcessingPlayPauseRef.current) {
      return;
    }
    
    // Set a timeout to reset the lock in case something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (isProcessingPlayPauseRef.current) {
        isProcessingPlayPauseRef.current = false;
      }
    }, 2000);
    
    isProcessingPlayPauseRef.current = true;
    
    setIsPaused(prev => {
      if (prev) {
        // Starting playback
        setPlayingCircle(0);
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        measureCountRef.current = 0;
        lastCircleSwitchCheckTimeRef.current = 0;
        
        // Reset training mode counters
        const wasInSilence = isSilencePhaseRef.current;
        isSilencePhaseRef.current = false;
        window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
        muteMeasureCountRef.current = 0;
        lastTempoIncreaseRef.current = 0;
        console.log(`[Training] Reset all training counters on play. Was in silence: ${wasInSilence}`);
        
        // Update playing settings with both circle and training settings
        if (circleSettings && circleSettings.length > 0) {
          playingSettingsRef.current = {
            ...circleSettings[0],
            macroMode,
            speedMode,
            measuresUntilMute,
            muteDurationMeasures,
            muteProbability,
            tempoIncreasePercent,
            measuresUntilSpeedUp
          };
        }
        
        const startPlayback = () => {
          if (logic && logic.currentSubStartRef) {
            logic.currentSubStartRef.current = 0;
          }
          if (logic && logic.startScheduler) {
            logic.startScheduler();
          }
          isProcessingPlayPauseRef.current = false;
          clearTimeout(safetyTimeout);
        };
        
        // Make sure the AudioContext is available
        if (!logic || !logic.audioCtx) {
          startPlayback();
        } else if (logic.audioCtx.state === "suspended") {
          logic.audioCtx
            .resume()
            .then(() => {
              startPlayback();
            })
            .catch(err => {
              console.error("Error resuming AudioContext:", err);
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout);
            });
        } else {
          startPlayback();
        }
        return false;
      } else {
        // Stopping playback
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        
        if (logic && logic.stopScheduler) {
          logic.stopScheduler();
        }
        
        if (logic && logic.audioCtx && logic.audioCtx.state === "running") {
          logic.audioCtx
            .suspend()
            .then(() => {
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout);
            })
            .catch(err => {
              console.error("Error suspending AudioContext:", err);
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout);
            });
        } else {
          isProcessingPlayPauseRef.current = false;
          clearTimeout(safetyTimeout);
        }
        setPlayingCircle(0);
        return true;
      }
    });
  }, [
    logic, 
    setIsPaused, 
    circleSettings, 
    isPaused,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    setPlayingCircle
  ]);

  // Register callbacks with parent if provided
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
    if (registerTapTempo && logic && logic.tapTempo) {
      registerTapTempo(logic.tapTempo);
    }
    
    return () => {
      // Clean up callbacks when component unmounts
      if (registerTogglePlay) {
        registerTogglePlay(null);
      }
      if (registerTapTempo) {
        registerTapTempo(null);
      }
    };
  }, [handlePlayPause, logic?.tapTempo, registerTogglePlay, registerTapTempo]);

  return {
    logic,
    isSilencePhaseRef,
    measureCountRef,
    muteMeasureCountRef,
    isProcessingPlayPauseRef,
    handlePlayPause,
    handleSetSubdivisions,
    updateAccent,
    addCircle,
    removeCircle,
    isTransitioningRef
  };
};

export default useMultiCircleLogic;