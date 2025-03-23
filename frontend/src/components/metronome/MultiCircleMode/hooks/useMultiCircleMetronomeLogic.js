// src/components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { useMetronomeRefs } from '../../../../hooks/useMetronomeLogic/references';
import { createTapTempoLogic } from '../../../../hooks/useMetronomeLogic/tapTempo';

// Import refactored modules
import { useAudioContext } from './useAudioContext';
import { useCircleTransitionLogic } from './useCircleTransitionLogic';
import { useTrainingModeLogic } from './useTrainingModeLogic';
import { useSchedulerLogic } from './useSchedulerLogic';
import { nextCircleFor3CircleCase } from '../utils/circleSequencing';
import { debugLog } from '../utils/debugUtils';

/**
 * A specialized version of useMetronomeLogic for Multi Circle Mode
 * Prioritizes precise timing above all else
 */
export default function useMultiCircleMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
  setSubdivisions,
  isPaused,
  setIsPaused,
  swing,
  volume,
  accents = [],
  analogMode = false,
  gridMode = false,
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2,
  beatMode = "quarter", // The active circle's beat mode
  onAnySubTrigger = null,
  circleSettings = [], // Array of all circle settings
  playingCircle = 0, // Index of currently playing circle
  onCircleChange = null // New callback to sync UI when circle changes
}) {
  // Get basic metronome refs
  const {
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    currentSubRef,
    nextNoteTimeRef,
    lookaheadRef,
    nodeRefs,
    playedBeatTimesRef,
    schedulerRunningRef,
    currentSubStartRef,
    currentSubIntervalRef,
    actualBpm, 
    setActualBpm
  } = useMetronomeRefs();

  // Local state
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  
  // Local refs for values not in useMetronomeRefs
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const accentsRef = useRef(accents);
  const subdivisionsRef = useRef(subdivisions);
  const playingCircleRef = useRef(playingCircle);
  const playStartTimeRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const isFirstMeasurePlayedRef = useRef(false);
  const minBeatsBeforeTransitionRef = useRef(0);
  const hasPlayedEnoughRef = useRef(false);
  // Unused ref removed
  
  // Keep refs updated with props
  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { playingCircleRef.current = playingCircle; }, [playingCircle]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);
  useEffect(() => { accentsRef.current = accents; }, [accents]);

  // Import custom hooks
  const { 
    safelyInitAudioContext, 
    isAudioReady, 
    reloadSounds 
  } = useAudioContext(audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef);

  const {
    circleTransitionRef,
    beatTimingRef,
    prepareCircleTransition,
    isTransitioning
  } = useCircleTransitionLogic(audioCtxRef, circleSettings);

  const {
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    // Removed unused ref
    handleMeasureBoundary
  } = useTrainingModeLogic({
    macroMode,
    speedMode,
    tempoRef,
    setTempo,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    measuresUntilSpeedUp,
    tempoIncreasePercent
  });

  const {
    getCurrentSubIntervalSec,
    // Removed unused variables
    getBeatMultiplier,
    // Removed unused variables
    doSchedulerLoop,
    stopScheduler,
    startScheduler
  } = useSchedulerLogic({
    audioCtxRef,
    nextNoteTimeRef,
    currentSubRef,
    lookaheadRef,
    nodeRefs,
    schedulerRunningRef,
    currentSubStartRef,
    currentSubIntervalRef,
    playedBeatTimesRef,
    setCurrentSubdivision,
    tempoRef,
    swingRef,
    subdivisionsRef,
    lastBeatTimeRef,
    accentsRef,
    volumeRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    onAnySubTrigger,
    analogMode,
    gridMode,
    macroMode,
    muteProbability,
    isSilencePhaseRef,
    setActualBpm,
    playingCircleRef,
    circleSettings,
    circleTransitionRef,
    beatTimingRef,
    onCircleChange,
    playStartTimeRef,
    minBeatsBeforeTransitionRef,
    hasPlayedEnoughRef,
    handleMeasureBoundary,
    nextCircleFor3CircleCase,
    measuresUntilMute,
    muteDurationMeasures,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    isPaused
  });

  // Tap Tempo handler - using inline function to fix unknown dependencies warning
  const handleTapTempo = useCallback(() => {
    return createTapTempoLogic(setTempo)();
  }, [setTempo]);

  // Function to update the beatMultiplier based on the current playing circle's beatMode
  const updateBeatMultiplier = useCallback((newMultiplier) => {
    debugLog(`Updating beat multiplier to: ${newMultiplier}`);
    
    // Update the current playing circle's beat mode
    const currentCircleIndex = playingCircleRef.current;
    const newBeatMode = newMultiplier === 2 ? "eighth" : "quarter";
    
    // Update the playing settings ref with the new beat mode
    if (circleSettings[currentCircleIndex]) {
      circleSettings[currentCircleIndex].beatMode = newBeatMode;
    }
    
    // Immediately update the current subdivision interval to respect the new beat multiplier
    if (currentSubIntervalRef.current && currentSubRef.current !== undefined) {
      // Calculate the new subdivision interval based on the new multiplier
      const newInterval = getCurrentSubIntervalSec(currentSubRef.current);
      currentSubIntervalRef.current = newInterval;
      
      debugLog(`Updated currentSubIntervalRef with new timing: ${newInterval}s`);
    }
    
    // Log the change for debugging
    debugLog(`Updated beat mode to: ${newBeatMode} for circle ${currentCircleIndex}`);
    
    // Return the new beat mode for any chaining operations
    return newBeatMode;
  }, [playingCircleRef, circleSettings, getCurrentSubIntervalSec, currentSubRef, currentSubIntervalRef]);

  // Listen for beat-mode-change events directly in the hook
  useEffect(() => {
    const handleBeatModeChange = (event) => {
      const { beatMode, beatMultiplier, circleIndex } = event.detail;
      
      debugLog(`Beat mode change event received: ${beatMode} (multiplier: ${beatMultiplier}) for circle ${circleIndex}`);
      
      // Only update the beat multiplier if this is for the currently playing circle
      if (circleIndex !== undefined && circleIndex === playingCircleRef.current) {
        debugLog(`Updating beat multiplier for playing circle ${circleIndex} to ${beatMultiplier}`);
        updateBeatMultiplier(beatMultiplier);
      } else {
        debugLog(`Ignoring beat mode change for non-playing circle ${circleIndex} (current: ${playingCircleRef.current})`);
      }
    };
    
    window.addEventListener('beat-mode-change', handleBeatModeChange);
    
    return () => {
      window.removeEventListener('beat-mode-change', handleBeatModeChange);
    };
  }, [updateBeatMultiplier, playingCircleRef]);
  
  // Listen for accent-change events to update audio immediately
  useEffect(() => {
    const handleAccentChange = (event) => {
      const { circleIndex, beatIndex, isPlayingCircle } = event.detail;
      
      // CRITICAL FIX: Only update the audio scheduler's accent reference if this is the currently playing circle
      if (isPlayingCircle && circleSettings[circleIndex]) {
        // Get updated accents pattern from the circle settings
        let updatedAccents = [...circleSettings[circleIndex].accents];
        
        // Update the audio reference if this is for the currently playing circle
        accentsRef.current = updatedAccents;
        debugLog(`Updated accent state for beat ${beatIndex} to ${updatedAccents[beatIndex]} (playing circle: ${playingCircleRef.current})`);
        
        // Only restart scheduler if we're actually playing (not paused)
        if (!isPaused && schedulerRunningRef.current) {
          // Properly restart the scheduler to force the new accent pattern to take effect immediately
          debugLog(`Restarting scheduler to apply accent changes`);
          
          // Use stopScheduler and startScheduler to ensure clean restart
          if (lookaheadRef.current) {
            clearInterval(lookaheadRef.current);
            lookaheadRef.current = null;
          }
          
          // Briefly delay the restart to ensure clean state
          setTimeout(() => {
            if (!isPaused) {
              // Only restart if still playing
              lookaheadRef.current = setInterval(doSchedulerLoop, 20);
              debugLog('Scheduler restarted after accent change');
            }
          }, 20);
        }
      } else {
        debugLog(`Ignored accent change for non-playing circle ${circleIndex} (current playing: ${playingCircleRef.current})`);
      }
    };
    
    window.addEventListener('accent-change', handleAccentChange);
    
    return () => {
      window.removeEventListener('accent-change', handleAccentChange);
    };
  }, [circleSettings, accentsRef, isPaused, schedulerRunningRef, lookaheadRef, doSchedulerLoop, playingCircleRef]);

  // Auto-start/stop based on isPaused
  useEffect(() => {
    if (isPaused) {
      debugLog('Paused state detected, stopping scheduler');
      stopScheduler();
      
      // Suspend audio context if it exists
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(err => {
          console.error('Error suspending audio context:', err);
        });
      }
    } else { 
      debugLog('Play state detected, starting scheduler');
      startScheduler();
    }
    
    // Store audio context reference in local variable for cleanup
    const currentAudioCtx = audioCtxRef.current;
    
    return () => {
      // Clean up on component unmount
      if (!isPaused) {
        stopScheduler();
      }
      
      // Use the local variable in the cleanup function
      if (currentAudioCtx && currentAudioCtx.state !== 'closed') {
        currentAudioCtx.close().catch(err => {
          console.error('Error closing audio context:', err);
        });
      }
    };
  }, [isPaused, startScheduler, stopScheduler, audioCtxRef]);

  // Restart scheduler when circleSettings change and we're not paused
  useEffect(() => {
    if (!isPaused && schedulerRunningRef.current) {
      debugLog("Restarting scheduler due to circleSettings change");
      stopScheduler();
      // Add a small delay before restarting to ensure clean state
      setTimeout(() => {
        startScheduler();
      }, 50);
    }
  }, [circleSettings, isPaused, startScheduler, stopScheduler, schedulerRunningRef]);

  // Add logging on initialization
  useEffect(() => {
    console.log("[MultiCircleMetronomeLogic] Initializing with settings:", {
      tempo,
      subdivisions,
      playingCircle,
      beatMode,
      circleSettings
    });
    
    // Initialize audio immediately on component mount
    const initAudio = async () => {
      try {
        console.log("[MultiCircleMetronomeLogic] Running initial audio setup");
        const ctx = await safelyInitAudioContext();
        console.log("[MultiCircleMetronomeLogic] Initial audio context setup complete:", ctx ? "success" : "failed");
        
        // Ensure sound buffers are loaded
        if (ctx) {
          console.log("[MultiCircleMetronomeLogic] Loading sound buffers");
          const success = await reloadSounds();
          console.log("[MultiCircleMetronomeLogic] Sound buffers loaded:", success);
        }
      } catch (err) {
        console.error("[MultiCircleMetronomeLogic] Error in initialization:", err);
      }
    };
    
    // Run the initialization
    initAudio();
    
  }, [tempo, subdivisions, playingCircle, beatMode, circleSettings, safelyInitAudioContext, reloadSounds]);

  // Logic for detecting when we need to switch circles
  const switchToNextCircle = useCallback(() => {
    if (circleSettings.length <= 1) return 0;
    
    // Calculate next circle index - ALWAYS proceed in sequential order
    const currentCircle = playingCircleRef.current;
    const nextCircle = (currentCircle + 1) % circleSettings.length;
    
    debugLog(`🔄 switchToNextCircle called: ${currentCircle} -> ${nextCircle} (ensuring sequential progression)`);
    
    // Block transitions during initial stabilization period
    if (!hasPlayedEnoughRef.current && currentCircle === 0) {
      debugLog(`Blocking manual transition during initial stabilization period`);
      return currentCircle;
    }
    
    // Prepare for transition (will be handled by scheduler)
    const transitionPrepared = prepareCircleTransition(currentCircle, nextCircle);
    
    // Only return the next circle index if transition was successfully prepared
    if (transitionPrepared) {
      debugLog(`Successfully prepared sequential transition to circle ${nextCircle}`);
      return nextCircle;
    } else {
      return currentCircle;
    }
  }, [circleSettings, prepareCircleTransition, hasPlayedEnoughRef]);
  
  // Function to reset to the first circle
  const resetToFirstCircle = useCallback(() => {
    debugLog("Direct reset to circle 0");
    playingCircleRef.current = 0;
    isFirstMeasurePlayedRef.current = false;
    // Reset the minBeatsBeforeTransitionRef to ensure full delay
    minBeatsBeforeTransitionRef.current = 0;
    // Reset the playStartTimeRef for time-based blocking
    playStartTimeRef.current = Date.now();
    if (onCircleChange) {
      onCircleChange(0);
    }
    return 0;
  }, [onCircleChange]);

  // Return the enhanced logic object
  return {
    currentSubdivision,
    actualBpm,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler,
    getBeatMultiplier, 
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    switchToNextCircle,
    isTransitioning,
    lastBeatTimeRef,
    updateBeatMultiplier,
    resetToFirstCircle,
    minBeatsBeforeTransitionRef,
    hasPlayedEnoughRef,
    playStartTimeRef,
    accentsRef,
    reloadSounds,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    audioCtxRef,
    safelyInitAudioContext,
    isAudioReady
  };
}