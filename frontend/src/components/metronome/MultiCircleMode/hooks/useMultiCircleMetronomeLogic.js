// src/components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../../hooks/useMetronomeLogic/audioBuffers';
import { useMetronomeRefs } from '../../../../hooks/useMetronomeLogic/references';
import { createTapTempoLogic } from '../../../../hooks/useMetronomeLogic/tapTempo';
import { 
  runScheduler, 
  scheduleSubdivision 
} from '../../../../hooks/useMetronomeLogic/scheduler';
import { handleMeasureBoundary, shouldMuteThisBeat } from '../../../../hooks/useMetronomeLogic/trainingLogic';
import { getActiveSoundSet } from '../../../../services/soundSetService';

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
  // We no longer need beatModeRef as we're using circleSettings directly
  
  // Track current and next circle data for smooth transitions
  const circleTransitionRef = useRef({
    isTransitioning: false,
    fromCircle: 0,
    toCircle: 0,
    nextCircleScheduled: false,
    lastBeatTime: 0,
    transitionStartTime: 0, // Add timestamp for transition start
    transitionLockout: false, // Add lockout to prevent rapid transitions
    measureCompleted: false,  // Add flag to track if we've completed one measure
    alreadySwitched: false // Add flag to track if we've already switched
  });
  
  // For calculating correct beat timing during transition
  const beatTimingRef = useRef({
    lastQuarterNote: 0,
    measureStartTime: 0
  });
  
  // Get the basic refs from useMetronomeRefs
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
    actualBpm, setActualBpm
  } = useMetronomeRefs();

  // Create our own refs for values not provided by useMetronomeRefs
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const accentsRef = useRef(accents);
  
  // For training mode refs
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);

  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Additional specialized refs for multi-circle
  const subdivisionsRef = useRef(subdivisions);
  const lastBeatTimeRef = useRef(0);

  // Training mode refs
  // Controls lastly when a circle switched
  // Commenting out unused ref but keeping for potential future use
  // const lastCircleSwitchTimeRef = useRef(0);
  
  // Keep local copies of changing values in refs
  const playingCircleRef = useRef(playingCircle);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { playingCircleRef.current = playingCircle; }, [playingCircle]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);

  useEffect(() => { 
    // Update accents array for different beat counts
    accentsRef.current = accents; 
  }, [accents]);

  useEffect(() => { 
    playingCircleRef.current = playingCircle;
    
    // Update subdivisions based on the currently playing circle's settings
    const currentCircleData = circleSettings[playingCircle];
    if (currentCircleData) {
      // Use the exact subdivision value from the current circle
      // Do NOT apply any beat mode multiplier here - that's handled in the scheduler
      const exactSubdivisions = currentCircleData.subdivisions || 4;
      
      console.log(`[MultiCircleLogic] Updating subdivisions: exact=${exactSubdivisions}`);
      subdivisionsRef.current = exactSubdivisions;
    } else {
      subdivisionsRef.current = 4; // Default to 4
    }
    
    // Update accents array for the new circle
    if (circleSettings[playingCircle] && circleSettings[playingCircle].subdivisions) {
      accentsRef.current = new Array(circleSettings[playingCircle].subdivisions).fill(1);
      accentsRef.current[0] = 3; // First beat is always '3' (first beat sound)
    }
  }, [playingCircle, circleSettings, playingCircleRef, subdivisionsRef]);

  useEffect(() => { 
    playingCircleRef.current = playingCircle;
    
    // When playing circle changes, update the subdivisions to match the new circle
    const currentCircleData = circleSettings[playingCircle];
    if (currentCircleData) {
      // Use the exact subdivision value from the current circle
      // Do NOT apply any beat mode multiplier here - that's handled in the scheduler
      const exactSubdivisions = currentCircleData.subdivisions || 4;
      
      console.log(`[MultiCircleLogic] Circle changed: updating subdivisions to exact=${exactSubdivisions}`);
      subdivisionsRef.current = exactSubdivisions;
      
      // Also update accents array length if needed
      if (currentCircleData.accents && currentCircleData.accents.length !== exactSubdivisions) {
        // Create or extend the accents array to match the exact subdivisions
        const newAccents = Array(exactSubdivisions).fill(1);
        for (let i = 0; i < Math.min(currentCircleData.accents.length, exactSubdivisions); i++) {
          newAccents[i] = currentCircleData.accents[i];
        }
        // First beat should be 3 (first beat) by default
        if (newAccents.length > 0 && newAccents[0] !== 3) {
          newAccents[0] = 3;
        }
        accentsRef.current = newAccents;
        console.log(`[MultiCircleLogic] Updated accents array to match ${exactSubdivisions} subdivisions:`, newAccents);
      } else {
        accentsRef.current = currentCircleData.accents || [3, 1, 1, 1];
      }
    }
  }, [playingCircle, circleSettings]);

  // Derive beatMultiplier from beatMode (1 for quarter, 2 for eighth)
  const getBeatMultiplier = useCallback(() => {
    const currentCircleIndex = playingCircleRef.current;
    const currentBeatMode = circleSettings[currentCircleIndex]?.beatMode;
    const multiplier = currentBeatMode === "eighth" ? 2 : 1;
    console.log(`[MultiCircleLogic] getBeatMultiplier: circle=${currentCircleIndex}, beatMode=${currentBeatMode}, multiplier=${multiplier}`);
    return multiplier;
  }, [circleSettings, playingCircleRef]);

  // Initialize audio context
  useEffect(() => {
    const audioCtx = initAudioContext();
    audioCtxRef.current = audioCtx;

    // Fetch the active sound set from the API and load it
    const loadSounds = async () => {
      try {
        // Get the active sound set from the API
        const soundSet = await getActiveSoundSet();
        console.log('MultiCircleMetronome: Loaded sound set from API:', soundSet);
        
        // Load the sound buffers with the sound set
        loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
      } catch (error) {
        console.error('MultiCircleMetronome: Failed to load sound set from API:', error);
        // Fallback to default sounds if the API call fails
        loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
      }
    };

    loadSounds();

    return () => {
      stopScheduler();
    };
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);

  // Define the stopScheduler function first, before any references to it
  const stopScheduler = useCallback(() => {
    // Clear the scheduling interval first
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    
    // Reset running state immediately to prevent more scheduling
    schedulerRunningRef.current = false;
    
    // Stop and disconnect all active audio nodes
    if (nodeRefs.current && nodeRefs.current.length > 0) {
      const nodesToCleanup = [...nodeRefs.current];
      nodeRefs.current = []; // Clear references immediately
      
      nodesToCleanup.forEach(node => {
        try {
          if (node.stop) node.stop(0);
          if (node.disconnect) node.disconnect();
        } catch (e) {
          // Silently ignore errors when cleaning up nodes
        }
      });
    }
    
    // Reset timing references
    nextNoteTimeRef.current = 0;
    currentSubRef.current = 0;
    playedBeatTimesRef.current = [];
    
    // Update visual state
    setCurrentSubdivision(0);
  }, [lookaheadRef, nextNoteTimeRef, currentSubRef, playedBeatTimesRef, nodeRefs, schedulerRunningRef]);

  // Update effect to clean up resources
  useEffect(() => {
    // Load click sound samples when component mounts
    async function loadSounds() {
      try {
        // Check if we need to initialize audio context
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = initAudioContext();
          console.log('[MultiCircleLogic] Created new AudioContext');
        }
        
        // Load sound buffers
        const soundSet = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
        console.log('[MultiCircleLogic] Sound buffers loaded');
      } catch (error) {
        console.log('[MultiCircleLogic] Error loading sounds, using defaults');
        if (audioCtxRef.current) {
          await loadClickBuffers({
            audioCtx: audioCtxRef.current,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef
          });
        }
      }
    }
    
    loadSounds();
    
    // Clean up function
    return () => {
      stopScheduler();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (e) {
          console.log("[MultiCircleLogic] Error closing AudioContext", e);
        }
      }
    };
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef, stopScheduler]);

  // Calculate the interval between beats, using dynamic beatMultiplier from beatMode
  const getCurrentSubIntervalSec = useCallback((subIndex) => {
    const localTempo = tempoRef.current;
    if (!localTempo) return 0.5;
    
    // Get the beat mode multiplier (1 for quarter, 2 for eighth)
    const beatMultiplier = getBeatMultiplier();
    
    // Standard calculation for quarter note duration at the given tempo
    // In standard metronome behavior, BPM directly corresponds to quarter notes
    const quarterNoteDuration = 60 / localTempo;
    
    // In quarter note mode, one subdivision equals one quarter note
    // In eighth note mode, one subdivision equals one eighth note (half as long)
    const basicBeatDuration = quarterNoteDuration / beatMultiplier;
    
    // For subdivisions, we need to divide the beat duration by the number of subdivisions per beat
    const totalSubs = subdivisionsRef.current;
    
    // In a standard 4/4 measure with quarter notes:
    // - Each beat is one quarter note
    // - If subdivisions = 4, we play one note per beat (4 notes per measure)
    // - If subdivisions = 8, we play two notes per beat (8 notes per measure)
    const subDivisionDuration = basicBeatDuration;
    
    console.log(`[MultiCircleLogic] getCurrentSubIntervalSec: subIndex=${subIndex}, tempo=${localTempo}, beatMode=${beatMultiplier === 2 ? 'eighth' : 'quarter'}, quarterNote=${quarterNoteDuration.toFixed(4)}, subDivision=${subDivisionDuration.toFixed(4)}`);

    // Handle swing timing if needed
    const sFactor = swingRef.current || 0;
    if (totalSubs >= 2 && sFactor > 0) {
      const isEvenSub = (subIndex % 2 === 0);
      return isEvenSub
        ? subDivisionDuration * (1 + sFactor)
        : subDivisionDuration * (1 - sFactor);
    }
    return subDivisionDuration;
  }, [getBeatMultiplier, tempoRef, swingRef, subdivisionsRef]);

  // Prepare circle transition - called when we detect we need to switch circles
  const prepareCircleTransition = useCallback((fromCircle, toCircle) => {
    const now = audioCtxRef.current?.currentTime || 0;
    
    // Prevent rapid transitions (must wait at least 500ms between transitions)
    if (circleTransitionRef.current.transitionLockout) {
      console.log(`[MultiCircleLogic] Transition blocked - lockout active`);
      return false;
    }
    
    // If we're already transitioning to this circle and the measure is completed, don't transition again
    if (circleTransitionRef.current.isTransitioning && 
        circleTransitionRef.current.toCircle === toCircle && 
        circleTransitionRef.current.measureCompleted &&
        circleTransitionRef.current.alreadySwitched) {
      console.log(`[MultiCircleLogic] Transition already in progress to circle ${toCircle} and measure completed`);
      return false;
    }
    
    // Set transition state
    circleTransitionRef.current = {
      isTransitioning: true,
      fromCircle,
      toCircle,
      nextCircleScheduled: false,
      lastBeatTime: now,
      transitionStartTime: now,
      transitionLockout: true,
      measureCompleted: false,
      alreadySwitched: false
    };
    
    console.log(`[MultiCircleLogic] Preparing transition from circle ${fromCircle} to ${toCircle}`);
    console.log(`[MultiCircleLogic] Beat mode changing from ${circleSettings[fromCircle]?.beatMode} to ${circleSettings[toCircle]?.beatMode}`);
    
    // Set a timeout to release the transition lockout
    setTimeout(() => {
      circleTransitionRef.current.transitionLockout = false;
    }, 500);
    
    return true;
  }, [circleSettings, audioCtxRef, circleTransitionRef]);

  // Add back the updateActualBpm function
  const updateActualBpm = useCallback(() => {
    const arr = playedBeatTimesRef.current;
    const MAX_BEATS = 16;
    if (arr.length > MAX_BEATS) {
      arr.shift();
    }
    if (arr.length < 2) return;
    
    let totalDiff = 0;
    for (let i = 1; i < arr.length; i++) {
      totalDiff += arr[i] - arr[i - 1];
    }
    const avgDiff = totalDiff / (arr.length - 1);
    const newBpm = 60000 / avgDiff;
    setActualBpm(newBpm);
  }, [playedBeatTimesRef, setActualBpm]);

  // Schedule subdivision function that handles transitions smoothly
  const scheduleSubFn = useCallback((subIndex, when) => {
    // Store the last beat time for stability
    lastBeatTimeRef.current = when;
    
    // For debugging - log every beat with its timing information
    const currentCircleIndex = playingCircleRef.current;
    const currentBeatMode = circleSettings[currentCircleIndex]?.beatMode;
    const totalSubs = subdivisionsRef.current;
    
    if (subIndex === 0) {
      // First beat of measure
      beatTimingRef.current.measureStartTime = when;
      beatTimingRef.current.lastQuarterNote = when;
      
      console.log(`[MultiCircleLogic] 🎵 Beat ${subIndex}/${totalSubs} scheduled at time ${when.toFixed(3)}, circle: ${currentCircleIndex}, beatMode: ${currentBeatMode}, transition: ${circleTransitionRef.current.isTransitioning ? 'transitioning' : 'stable'}`);
      
      // If we've already completed one measure of the current circle and we're still in transition
      if (circleTransitionRef.current.measureCompleted && 
          circleTransitionRef.current.isTransitioning && 
          !circleTransitionRef.current.alreadySwitched) {
        
        // Mark that we've already switched to prevent double switching
        circleTransitionRef.current.alreadySwitched = true;
        
        // Update the beat mode for the next circle
        const nextCircleIndex = circleTransitionRef.current.toCircle;
        if (circleSettings[nextCircleIndex]) {
          // We don't need to update beatModeRef anymore since we're using circleSettings directly
          console.log(`[MultiCircleLogic] 🔄 TRANSITION COMPLETE: Now using beatMode=${circleSettings[nextCircleIndex].beatMode} for circle ${nextCircleIndex}`);
          
          // Reset transition state to allow future transitions
          circleTransitionRef.current.isTransitioning = false;
          circleTransitionRef.current.nextCircleScheduled = false;
          circleTransitionRef.current.measureCompleted = false;
          circleTransitionRef.current.alreadySwitched = false;
          console.log(`[MultiCircleLogic] 🏁 Transition state reset, ready for next transition`);
        }
      } 
      // If this is the first measure after a transition was requested, mark it as completed
      else if (circleTransitionRef.current.isTransitioning && !circleTransitionRef.current.measureCompleted) {
        circleTransitionRef.current.measureCompleted = true;
        console.log(`[MultiCircleLogic] ✓ First measure after transition request completed`);
      }
      // If we've already switched and completed the next measure, reset transition state
      else if (circleTransitionRef.current.isTransitioning && 
               circleTransitionRef.current.measureCompleted && 
               circleTransitionRef.current.alreadySwitched) {
        
        // Reset transition state completely after we've played the next circle for one measure
        circleTransitionRef.current.isTransitioning = false;
        circleTransitionRef.current.nextCircleScheduled = false;
        circleTransitionRef.current.measureCompleted = false;
        circleTransitionRef.current.alreadySwitched = false;
        console.log(`[MultiCircleLogic] 🏁 Transition state fully reset`);
      }
      
      // Trigger auto-transition to the next circle
      if (circleSettings.length > 1) {
        const nextCircle = (currentCircleIndex + 1) % circleSettings.length;
        console.log(`[MultiCircleLogic] 🔄 Auto-transition triggered at start of measure: ${currentCircleIndex} -> ${nextCircle}`);
        
        // Prepare for transition
        prepareCircleTransition(currentCircleIndex, nextCircle);
        
        // Update playing circle ref for the next measure
        playingCircleRef.current = nextCircle;
        
        // Call the onCircleChange callback to sync the UI
        if (onCircleChange) {
          onCircleChange(nextCircle);
        }
      }
    } else {
      // Log other beats with less detail
      console.log(`[MultiCircleLogic] Beat ${subIndex}/${totalSubs} scheduled at time ${when.toFixed(3)}, circle: ${currentCircleIndex}`);
      
      // End of circle reached: deferring circle transition until beginning of next measure
      if (subIndex === totalSubs - 1) {
        console.log('End of circle reached: deferring circle transition until beginning of next measure.');
        // Remove this line as we don't need to reset beatModeRef anymore
        // beatModeRef.current = false;
        circleTransitionRef.current.isTransitioning = false;
      }
    }
    
    // Check mute status for training mode
    const muteThisBeat = shouldMuteThisBeat({
      macroMode,
      muteProbability,
      isSilencePhaseRef
    });

    // We always schedule the beat to maintain precise timing
    scheduleSubdivision({
      subIndex,
      when,
      audioCtx: audioCtxRef.current,
      analogMode,
      gridMode,
      multiCircleMode: true,
      volumeRef,
      onAnySubTrigger,
      normalBufferRef,
      accentBufferRef,
      firstBufferRef,
      beatConfigRef: null,
      accentsRef,
      shouldMute: muteThisBeat,
      playedBeatTimesRef,
      updateActualBpm,
      // Pass additional metadata for logging
      debugInfo: {
        currentCircle: currentCircleIndex,
        beatMode: currentBeatMode,
        isTransitioning: circleTransitionRef.current.isTransitioning
      }
    });
  }, [
    macroMode, 
    muteProbability, 
    analogMode, 
    gridMode, 
    volumeRef, 
    onAnySubTrigger,
    circleSettings,
    onCircleChange,
    playingCircleRef,
    subdivisionsRef,
    circleTransitionRef,
    beatTimingRef,
    lastBeatTimeRef,
    accentsRef,
    isSilencePhaseRef,
    prepareCircleTransition,
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    playedBeatTimesRef,
    updateActualBpm
  ]);

  // Detect when we need to switch circles - called from the component
  const switchToNextCircle = useCallback(() => {
    if (circleSettings.length <= 1) return 0;
    
    // Calculate next circle index
    const currentCircle = playingCircleRef.current;
    const nextCircle = (currentCircle + 1) % circleSettings.length;
    
    console.log(`[MultiCircleLogic] 🔄 switchToNextCircle called: ${currentCircle} -> ${nextCircle}`);
    
    // Prepare for transition (will be handled by scheduler)
    const transitionPrepared = prepareCircleTransition(currentCircle, nextCircle);
    
    // Only return the next circle index if transition was successfully prepared
    return transitionPrepared ? nextCircle : currentCircle;
  }, [circleSettings, prepareCircleTransition]);

  // Now define the doSchedulerLoop function
  const doSchedulerLoop = useCallback(() => {
    runScheduler({
      audioCtxRef,
      nextNoteTimeRef,
      currentSubRef,
      currentSubdivisionSetter: setCurrentSubdivision,
      getCurrentSubIntervalSec,
      handleMeasureBoundary: () => handleMeasureBoundary({
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
        tempoRef,
        setTempo
      }),
      scheduleSubFn,
      subdivisionsRef,
      multiCircleMode: true,
      nodeRefs,
      schedulerRunningRef
    });
  }, [
    audioCtxRef,
    nextNoteTimeRef,
    currentSubRef,
    getCurrentSubIntervalSec,
    scheduleSubFn,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    setTempo,
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    nodeRefs,
    schedulerRunningRef,
    tempoRef
  ]);

  const startScheduler = useCallback(() => {
    if (schedulerRunningRef.current) return;

    // Make sure we're starting clean
    stopScheduler();
    
    (async function() {
      try {
        // Create new audio context if it doesn't exist or is closed
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          const newCtx = initAudioContext();
          if (!newCtx) {
            console.error('Failed to create audio context');
            return;
          }
          audioCtxRef.current = newCtx;
          
          // Load sound buffers
          try {
            const soundSet = await getActiveSoundSet();
            await loadClickBuffers({
              audioCtx: audioCtxRef.current,
              normalBufferRef,
              accentBufferRef,
              firstBufferRef,
              soundSet
            });
          } catch (error) {
            console.log('Loading default sound set');
            await loadClickBuffers({
              audioCtx: audioCtxRef.current,
              normalBufferRef,
              accentBufferRef,
              firstBufferRef
            });
          }
        } 
        // Resume if suspended
        else if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        
        // Check if we have all needed components ready
        if (
          !audioCtxRef.current || 
          audioCtxRef.current.state !== 'running' ||
          !normalBufferRef.current || 
          !accentBufferRef.current || 
          !firstBufferRef.current
        ) {
          console.error('Audio context or buffers not ready');
          return;
        }
        
        // All checks passed, start scheduler
        schedulerRunningRef.current = true;
        const now = audioCtxRef.current.currentTime;
        
        // Reset scheduling state
        currentSubRef.current = 0;
        setCurrentSubdivision(0);
        nextNoteTimeRef.current = now;
        currentSubStartRef.current = now;
        currentSubIntervalRef.current = getCurrentSubIntervalSec(0);
        playedBeatTimesRef.current = [];
        
        // Start scheduling loop
        lookaheadRef.current = setInterval(doSchedulerLoop, 20);
        console.log('MultiCircle metronome started successfully');
      } catch (err) {
        console.error('Error starting metronome:', err);
      }
    })();
  }, [
    audioCtxRef, 
    stopScheduler, 
    doSchedulerLoop, 
    normalBufferRef, 
    accentBufferRef, 
    firstBufferRef, 
    schedulerRunningRef, 
    nextNoteTimeRef, 
    currentSubRef, 
    getCurrentSubIntervalSec, 
    currentSubStartRef, 
    currentSubIntervalRef, 
    playedBeatTimesRef, 
    lookaheadRef
  ]);

  // Tap Tempo handler
  const handleTapTempo = useCallback(
    createTapTempoLogic(setTempo),
    [setTempo]
  );

  // Function to check if we're currently in a transition
  const isTransitioning = useCallback(() => {
    return circleTransitionRef.current.isTransitioning;
  }, [circleTransitionRef]);

  // Auto-start/stop based on isPaused
  useEffect(() => {
    if (isPaused) {
      stopScheduler();
      
      // Suspend audio context if it exists
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(err => {
          console.error('Error suspending audio context:', err);
        });
      }
    } else {
      startScheduler();
    }
    
    return () => {
      // Clean up on component unmount
      if (!isPaused) {
        stopScheduler();
      }
      
      // Close audio context on unmount to prevent memory leaks
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(err => {
          console.error('Error closing audio context:', err);
        });
      }
    };
  }, [isPaused, startScheduler, stopScheduler, audioCtxRef]);

  // Restart scheduler when circleSettings change and we're not paused
  useEffect(() => {
    if (!isPaused && schedulerRunningRef.current) {
      console.log("[MultiCircleLogic] Restarting scheduler due to circleSettings change");
      stopScheduler();
      startScheduler();
    }
  }, [circleSettings, isPaused, startScheduler, stopScheduler, schedulerRunningRef]);

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
    getBeatMultiplier, // Expose function to get current beat multiplier
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    switchToNextCircle, // New function to trigger circle switch
    isTransitioning, // Expose function to check if we're in a transition
    lastBeatTimeRef // Expose last beat time for stability checks
  };
}