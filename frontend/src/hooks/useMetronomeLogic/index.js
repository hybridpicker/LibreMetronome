// src/hooks/useMetronomeLogic/index.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from './audioBuffers';
import { useMetronomeRefs } from './references';
import { createTapTempoLogic } from './tapTempo';
import { handleMeasureBoundary, shouldMuteThisBeat } from './trainingLogic';
import { runScheduler, scheduleSubdivision } from './scheduler';
import { TEMPO_MIN, TEMPO_MAX, SCHEDULER_INTERVAL } from './constants';
import { getActiveSoundSet } from '../../services/soundSetService';

/**
 * A simplified main hook that ties everything together.
 */
export default function useMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
  setSubdivisions,
  isPaused,
  setIsPaused,
  swing,
  setSwing,
  volume,
  setVolume,
  accents = [],
  beatConfig = null,
  analogMode = false,
  gridMode = false,
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2,
  beatMultiplier = 1,
  multiCircleMode = false,
  onAnySubTrigger = null
}) {
  // 1) Refs & state
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
    highResTimingsRef,
    schedulerRunningRef,
    lookaheadRef,
    actualBpm, setActualBpm,
    timingPrecision, setTimingPrecision,
    nodeRefs, // Collection of active audio nodes for cleanup
    audioWorkletRef
  } = useMetronomeRefs();

  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // For measure-based training logic:
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  
  // Reset training counters when mode changes
  useEffect(() => {
    // Reset counters when training mode is turned off
    if (speedMode === 0 && macroMode === 0) {
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
    }
    
    // Reset counters when metronome is paused
    if (isPaused) {
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      
      // Don't reset silence phase when paused, as we want to resume in the same state
      
    }
  }, [speedMode, macroMode, isPaused, measuresUntilSpeedUp]);

  // 2) Keep local copies of changing values in refs for the scheduling loop
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const subdivisionsRef = useRef(subdivisions);
  const accentsRef = useRef(accents);
  const beatConfigRef = useRef(beatConfig);
  const beatMultiplierRef = useRef(beatMultiplier);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);
  useEffect(() => { accentsRef.current = accents; }, [accents]);
  useEffect(() => { beatConfigRef.current = beatConfig; }, [beatConfig]);
  
  // Keep a reference to the doSchedulerLoop function to avoid circular dependencies
  const doSchedulerLoopRef = useRef(null);
  
  // 4) The scheduling logic
  const getCurrentSubIntervalSec = useCallback((subIndex) => {
    const localTempo = tempoRef.current;
    if (!localTempo) return 0.5;
    
    // Important: get the latest beatMultiplier value to ensure it's current
    const currentMultiplier = beatMultiplierRef.current;
    
    // Calculate base interval (seconds per hit) using the current beat multiplier
    const secPerBeat = 60 / localTempo;
    const secPerHit = secPerBeat / currentMultiplier;

    // If we have >=2 subs + a swing factor:
    const totalSubs = subdivisionsRef.current;
    const sFactor = swingRef.current || 0;
    if (totalSubs >= 2 && sFactor > 0) {
      const isEvenSub = (subIndex % 2 === 0);
      return isEvenSub
        ? secPerHit * (1 + sFactor)
        : secPerHit * (1 - sFactor);
    }
    return secPerHit;
  }, []);
  
  // Move updateActualBpm into a useCallback to prevent it from changing on every render
  const updateActualBpm = useCallback(() => {
    const times = playedBeatTimesRef.current;
    // Need at least 2 times to calculate BPM
    if (times.length < 2) return;
    
    // Calculate average time between beats
    // Use more recent beats (8 instead of 4) for more accurate averaging
    const recentTimes = times.slice(-8); // Last 8 beats for better statistical sample
    let totalDiff = 0;
    let numDiffs = 0;
    let diffsSquared = 0; // For calculating timing precision (variance)
    
    // Record high-resolution timings for expert analysis
    if (highResTimingsRef && highResTimingsRef.current) {
      // Keep only most recent 50 timing records to avoid memory growth
      if (highResTimingsRef.current.length > 50) {
        highResTimingsRef.current = highResTimingsRef.current.slice(-50);
      }
      
      // Add most recent timing
      if (recentTimes.length >= 2) {
        highResTimingsRef.current.push({
          time: performance.now(),
          interval: recentTimes[recentTimes.length-1] - recentTimes[recentTimes.length-2]
        });
      }
    }
    
    // Calculate precise average and variance
    for (let i = 1; i < recentTimes.length; i++) {
      const diff = recentTimes[i] - recentTimes[i-1];
      totalDiff += diff;
      numDiffs++;
    }
    
    if (numDiffs === 0) return;
    const avgTimeBetweenBeats = totalDiff / numDiffs;
    
    // Calculate variance for timing precision measurement
    for (let i = 1; i < recentTimes.length; i++) {
      const diff = recentTimes[i] - recentTimes[i-1];
      const deviation = diff - avgTimeBetweenBeats;
      diffsSquared += deviation * deviation;
    }
    
    // Calculate standard deviation in milliseconds for timing precision
    const variance = diffsSquared / numDiffs;
    const standardDeviation = Math.sqrt(variance);
    
    // Update timing precision (variance) - lower is better
    if (setTimingPrecision) {
      setTimingPrecision(standardDeviation.toFixed(2));
    }
    
    // Calculate BPM with higher precision
    const beatsPerSec = 1000 / avgTimeBetweenBeats; // Convert ms to seconds
    const beatsPerMin = beatsPerSec * 60;
    
    // Use more precise BPM with one decimal place for expert musicians
    const newBpm = Math.round(beatsPerMin * 10) / 10;
    setActualBpm(newBpm);
  }, [playedBeatTimesRef, highResTimingsRef, setActualBpm, setTimingPrecision]);
  
  // Handle tempo adjustments for training mode
  const handleTrainingModeTempoAdjustments = useCallback(() => {
    let adjustedTempo = tempoRef.current;
    
    // Only adjust if speedMode is on & we've reached the measure target
    if (
      speedMode === 1 && 
      measureCountRef.current > 0 && 
      measureCountRef.current % measuresUntilSpeedUp === 0
    ) {
      // Calculate the new tempo with percentage increase
      const newTempo = adjustedTempo * (1 + tempoIncreasePercent / 100);
      
      // Clamp to max tempo
      adjustedTempo = Math.min(newTempo, TEMPO_MAX);
      
      // Update the external tempo state
      if (setTempo && adjustedTempo !== tempoRef.current) {
        setTempo(adjustedTempo);
      }
    }
    
    return adjustedTempo;
  }, [
    speedMode, 
    measureCountRef, 
    measuresUntilSpeedUp, 
    tempoIncreasePercent, 
    tempoRef, 
    setTempo
  ]);
  
  // The main scheduler loop that schedules notes and runs on each clock tick
  const doSchedulerLoop = useCallback(() => {
    // Only run if we have a valid audio context
    if (!audioCtxRef.current) return;
    
    // 1. Adjustments for speed training mode - use the result properly
    const adjustedTempo = handleTrainingModeTempoAdjustments();
    
    // 2. Run the scheduler with all deps
    runScheduler({
      audioCtxRef,
      nextNoteTimeRef,
      currentSubRef,
      currentSubdivisionSetter: setCurrentSubdivision,
      getCurrentSubIntervalSec,
      tempo: adjustedTempo, // Pass the adjusted tempo to use it properly
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
      scheduleSubFn: (subIndex, when, nodeRefs) => scheduleSubdivision({
        subIndex,
        when,
        audioCtx: audioCtxRef.current,
        analogMode,
        gridMode,
        multiCircleMode,
        volumeRef,
        onAnySubTrigger,
        normalBufferRef,
        accentBufferRef,
        firstBufferRef,
        beatConfigRef,
        accentsRef,
        shouldMute: shouldMuteThisBeat({
          macroMode,
          muteProbability,
          isSilencePhaseRef
        }),
        playedBeatTimesRef,
        updateActualBpm,
        nodeRefs
      }),
      subdivisionsRef,
      multiCircleMode,
      nodeRefs,
      schedulerRunningRef
    });
  }, [
    audioCtxRef,
    nextNoteTimeRef,
    currentSubRef,
    getCurrentSubIntervalSec,
    handleTrainingModeTempoAdjustments,
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
    setTempo,
    analogMode,
    gridMode,
    multiCircleMode,
    volumeRef,
    onAnySubTrigger,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    beatConfigRef,
    accentsRef,
    playedBeatTimesRef,
    updateActualBpm,
    subdivisionsRef,
    nodeRefs,
    schedulerRunningRef
  ]);

  // Store the doSchedulerLoop function in a ref to avoid recreating it
  useEffect(() => {
    doSchedulerLoopRef.current = doSchedulerLoop;
  }, [doSchedulerLoop]);

  // Update beatMultiplier ref and recalculate interval if needed
  useEffect(() => { 
    // Make sure to immediately update the beatMultiplier reference
    beatMultiplierRef.current = beatMultiplier; 
    
    // If we're already running, force an update to the current interval
    if (schedulerRunningRef.current && audioCtxRef.current) {
      // Update the current subdivision interval
      currentSubIntervalRef.current = getCurrentSubIntervalSec(currentSubRef.current);
      
      // If the scheduler is running, restart it to apply the new interval
      if (!isPaused && lookaheadRef.current) {
        // Clear existing interval
        clearInterval(lookaheadRef.current);
        
        // Restart with a new interval to ensure timing is updated
        lookaheadRef.current = setInterval(
          () => doSchedulerLoopRef.current && doSchedulerLoopRef.current(),
          SCHEDULER_INTERVAL
        );
      }
    }
  }, [
    beatMultiplier, 
    getCurrentSubIntervalSec, 
    isPaused,
    audioCtxRef,
    currentSubIntervalRef,
    currentSubRef,
    lookaheadRef,
    schedulerRunningRef
  ]);

  // Define stopScheduler first to avoid circular dependency
  const stopScheduler = useCallback(function() {
    // Clear interval & mark as not running
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    schedulerRunningRef.current = false;
    
    // Clean up any active audio nodes
    for (const node of nodeRefs.current) {
      try {
        if (node.stop) {
          node.stop();
        } else if (node.disconnect) {
          node.disconnect();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    nodeRefs.current = [];
  }, [lookaheadRef, nodeRefs, schedulerRunningRef]);

  // Then define startScheduler with stopScheduler in its dependencies
  const startScheduler = useCallback(function() {
    // If already running, don't restart
    if (schedulerRunningRef.current) return;
    
    // Make sure the scheduler is fully stopped
    stopScheduler();
    
    // Simplified approach to audio context initialization
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
        
        // Start scheduling loop with doSchedulerLoopRef to ensure we use the latest version
        // Use the SCHEDULER_INTERVAL constant for more precise and frequent updates
        lookaheadRef.current = setInterval(
          () => doSchedulerLoopRef.current && doSchedulerLoopRef.current(),
          SCHEDULER_INTERVAL
        );
      } catch (err) {
        console.error('Error starting metronome:', err);
      }
    })();
  }, [
    audioCtxRef,
    currentSubIntervalRef,
    currentSubRef,
    currentSubStartRef,
    doSchedulerLoopRef,
    firstBufferRef,
    getCurrentSubIntervalSec,
    lookaheadRef,
    nextNoteTimeRef,
    normalBufferRef,
    accentBufferRef,
    playedBeatTimesRef,
    schedulerRunningRef,
    stopScheduler // Add this dependency
  ]);

  // 7) Create tap tempo logic
  const { handleTapTempo } = createTapTempoLogic({
    setTempo: (newTempo) => {
      // Clamp tempo to min/max
      const clampedTempo = Math.min(Math.max(newTempo, TEMPO_MIN), TEMPO_MAX);
      if (setTempo) {
        setTempo(clampedTempo);
      }
    }
  });
  
  // 8) Handle reloading sounds (added in your previous code)
  const reloadSounds = useCallback(async function() {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = initAudioContext();
      }
      
      const soundSet = await getActiveSoundSet();
      await loadClickBuffers({
        audioCtx: audioCtxRef.current,
        normalBufferRef,
        accentBufferRef,
        firstBufferRef,
        soundSet
      });
      return true;
    } catch (error) {
      console.error('Error reloading sounds:', error);
      return false;
    }
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);

  // 9) Effects to start/stop scheduler based on isPaused state
  useEffect(() => {
    if (isPaused) {
      stopScheduler();
    } else {
      startScheduler();
    }
  }, [isPaused, startScheduler, stopScheduler]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScheduler();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, [audioCtxRef, stopScheduler]);

  // Return the entire logic object
  return {
    currentSubdivision,
    actualBpm,
    timingPrecision, // Now exposing timing precision for expert musicians
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler,
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    reloadSounds,
    // Add a function to directly update the beatMultiplier reference
    updateBeatMultiplier: (newMultiplier) => {
      beatMultiplierRef.current = newMultiplier;
      
      // If we're actively playing, also update the current subdivision interval
      if (schedulerRunningRef.current && audioCtxRef.current) {
        currentSubIntervalRef.current = getCurrentSubIntervalSec(currentSubRef.current);
      }
      
      return newMultiplier;
    },
    // Add high-resolution timing data access for experts
    getTimingStats: () => {
      if (!highResTimingsRef.current || highResTimingsRef.current.length < 2) {
        return { average: 0, min: 0, max: 0, stdDev: 0 };
      }
      
      const intervals = highResTimingsRef.current.map(t => t.interval);
      const sum = intervals.reduce((a, b) => a + b, 0);
      const avg = sum / intervals.length;
      const min = Math.min(...intervals);
      const max = Math.max(...intervals);
      
      // Calculate standard deviation
      const squareDiffs = intervals.map(value => {
        const diff = value - avg;
        return diff * diff;
      });
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / intervals.length;
      const stdDev = Math.sqrt(avgSquareDiff);
      
      return { average: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2), stdDev: stdDev.toFixed(2) };
    }
  };
}