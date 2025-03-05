// src/components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../../hooks/useMetronomeLogic/audioBuffers';
import { useMetronomeRefs } from '../../../../hooks/useMetronomeLogic/references';
import { createTapTempoLogic } from '../../../../hooks/useMetronomeLogic/tapTempo';
import { handleMeasureBoundary, shouldMuteThisBeat } from '../../../../hooks/useMetronomeLogic/trainingLogic';
import { runScheduler, scheduleSubdivision } from '../../../../hooks/useMetronomeLogic/scheduler';
import { TEMPO_MIN, TEMPO_MAX, SCHEDULE_AHEAD_TIME } from '../../../../hooks/useMetronomeLogic/constants';

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
  playingCircle = 0 // Index of currently playing circle
}) {
  // Create a ref to track the current beatMode for interval calculations
  const beatModeRef = useRef(beatMode);
  
  // Track current and next circle data for smooth transitions
  const circleTransitionRef = useRef({
    isTransitioning: false,
    fromCircle: 0,
    toCircle: 0,
    nextCircleScheduled: false,
    lastBeatTime: 0
  });
  
  // For calculating correct beat timing during transition
  const beatTimingRef = useRef({
    lastQuarterNote: 0,
    measureStartTime: 0
  });
  
  // Update beatModeRef when beatMode prop changes
  useEffect(() => {
    beatModeRef.current = beatMode;
    console.log(`[MultiCircleLogic] Using beatMode: ${beatMode}`);
  }, [beatMode]);

  // Derive beatMultiplier from beatMode (1 for quarter, 2 for eighth)
  const getBeatMultiplier = useCallback(() => {
    return beatModeRef.current === "eighth" ? 2 : 1;
  }, []);

  // Same refs as regular metronome logic
  const {
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    nextNoteTimeRef,
    currentSubRef,
    currentSubStartRef,
    currentSubIntervalRef,
    playedBeatTimesRef,
    schedulerRunningRef,
    lookaheadRef,
    actualBpm, setActualBpm
  } = useMetronomeRefs();

  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Training mode refs
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const lastCircleSwitchTimeRef = useRef(0);

  // Keep local copies of changing values in refs
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const subdivisionsRef = useRef(subdivisions);
  const accentsRef = useRef(accents);
  const playingCircleRef = useRef(playingCircle);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);
  useEffect(() => { accentsRef.current = accents; }, [accents]);
  useEffect(() => { playingCircleRef.current = playingCircle; }, [playingCircle]);

  // Initialize audio context
  useEffect(() => {
    const audioCtx = initAudioContext();
    audioCtxRef.current = audioCtx;

    loadClickBuffers({
      audioCtx,
      normalBufferRef,
      accentBufferRef,
      firstBufferRef
    });

    return () => {
      stopScheduler();
    };
  }, []);

  // Calculate the interval between beats, using dynamic beatMultiplier from beatMode
  const getCurrentSubIntervalSec = useCallback((subIndex) => {
    const localTempo = tempoRef.current;
    if (!localTempo) return 0.5;
    
    // Calculate using the CURRENT beatMode from the ref, not the initial value
    const beatMultiplier = getBeatMultiplier();
    const secPerHit = 60 / (localTempo * beatMultiplier);

    // Handle swing timing if needed
    const totalSubs = subdivisionsRef.current;
    const sFactor = swingRef.current || 0;
    if (totalSubs >= 2 && sFactor > 0) {
      const isEvenSub = (subIndex % 2 === 0);
      return isEvenSub
        ? secPerHit * (1 + sFactor)
        : secPerHit * (1 - sFactor);
    }
    return secPerHit;
  }, [getBeatMultiplier]); // Only depend on getBeatMultiplier function

  function updateActualBpm() {
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
  }

  // Prepare circle transition - called when we detect we need to switch circles
  const prepareCircleTransition = useCallback((fromCircle, toCircle) => {
    circleTransitionRef.current = {
      isTransitioning: true,
      fromCircle,
      toCircle,
      nextCircleScheduled: false,
      lastBeatTime: audioCtxRef.current?.currentTime || 0
    };
    
    console.log(`[MultiCircleLogic] Preparing transition from circle ${fromCircle} to ${toCircle}`);
    console.log(`[MultiCircleLogic] Beat mode changing from ${circleSettings[fromCircle]?.beatMode} to ${circleSettings[toCircle]?.beatMode}`);
  }, [circleSettings]);

  // Schedule subdivision function that handles transitions smoothly
  const scheduleSubFn = useCallback((subIndex, when) => {
    // For debugging
    if (subIndex === 0) {
      beatTimingRef.current.measureStartTime = when;
      beatTimingRef.current.lastQuarterNote = when;
    }
    
    // Check if we need to change circles
    if (subIndex === 0 && circleTransitionRef.current.isTransitioning) {
      // Measure boundary - perfect time to apply the new beat mode
      if (!circleTransitionRef.current.nextCircleScheduled) {
        // Update the beat mode for the next circle
        const nextCircleIndex = circleTransitionRef.current.toCircle;
        if (circleSettings[nextCircleIndex]) {
          beatModeRef.current = circleSettings[nextCircleIndex].beatMode;
          console.log(`[MultiCircleLogic] Transition complete: now using beatMode=${beatModeRef.current}`);
          
          // Mark the transition as scheduled
          circleTransitionRef.current.nextCircleScheduled = true;
        }
      } else {
        // This is the first beat of the next measure after the transition
        // Reset transition state
        circleTransitionRef.current.isTransitioning = false;
        circleTransitionRef.current.nextCircleScheduled = false;
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
      updateActualBpm
    });
  }, [
    macroMode, 
    muteProbability, 
    analogMode, 
    gridMode, 
    volumeRef, 
    onAnySubTrigger,
    circleSettings
  ]);

  // Detect when we need to switch circles - called from the component
  const switchToNextCircle = useCallback(() => {
    if (circleSettings.length <= 1) return;
    
    // Calculate next circle index
    const currentCircle = playingCircleRef.current;
    const nextCircle = (currentCircle + 1) % circleSettings.length;
    
    // Prepare for transition (will be handled by scheduler)
    prepareCircleTransition(currentCircle, nextCircle);
    
    // Return the next circle index so component can update its state
    return nextCircle;
  }, [circleSettings, prepareCircleTransition]);

  // Main scheduler loop
  const doSchedulerLoop = useCallback(() => {
    runScheduler({
      audioCtxRef,
      nextNoteTimeRef,
      currentSubRef,
      currentSubdivisionSetter: setCurrentSubdivision,
      getCurrentSubIntervalSec,
      handleMeasureBoundary: () => {
        // Handle measure boundary (training logic)
        handleMeasureBoundary({
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
        });
      },
      scheduleSubFn,
      subdivisionsRef,
      multiCircleMode: true
    });
  }, [
    getCurrentSubIntervalSec,
    scheduleSubFn,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    setTempo
  ]);

  // Start scheduler with optional start time
  function startScheduler(startTime) {
    if (schedulerRunningRef.current) return;
    stopScheduler();

    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    schedulerRunningRef.current = true;
    currentSubRef.current = 0;
    setCurrentSubdivision(0);

    const now = startTime || audioCtx.currentTime;
    nextNoteTimeRef.current = now;
    currentSubStartRef.current = now;
    currentSubIntervalRef.current = getCurrentSubIntervalSec(0);
    playedBeatTimesRef.current = [];
    
    // Reset transition state
    circleTransitionRef.current.isTransitioning = false;
    circleTransitionRef.current.nextCircleScheduled = false;

    // Log the current settings for debugging
    console.log(`[MultiCircleLogic] Starting scheduler with beatMode=${beatModeRef.current}, multiplier=${getBeatMultiplier()}`);

    // Start the scheduling loop
    lookaheadRef.current = setInterval(doSchedulerLoop, 20);
  }

  function stopScheduler() {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    schedulerRunningRef.current = false;
  }

  // Auto-start/stop based on isPaused
  useEffect(() => {
    if (!isPaused) {
      if (!schedulerRunningRef.current) {
        startScheduler();
      }
    } else {
      stopScheduler();
    }
  }, [isPaused]);

  // Tap Tempo handler
  const handleTapTempo = useCallback(
    createTapTempoLogic(setTempo),
    [setTempo]
  );

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
    beatModeRef, // Expose beatModeRef for circle transitions
    getBeatMultiplier, // Expose function to get current beat multiplier
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    switchToNextCircle, // New function to trigger circle switch
    isTransitioning: () => circleTransitionRef.current.isTransitioning
  };
}