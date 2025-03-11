// src/hooks/useMetronomeLogic/index.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from './audioBuffers';
import { useMetronomeRefs } from './references';
import { createTapTempoLogic } from './tapTempo';
import { handleMeasureBoundary, shouldMuteThisBeat } from './trainingLogic';
import { runScheduler, scheduleSubdivision } from './scheduler';
import { TEMPO_MIN, TEMPO_MAX } from './constants';
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
    schedulerRunningRef,
    lookaheadRef,
    actualBpm, setActualBpm
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

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);
  useEffect(() => { accentsRef.current = accents; }, [accents]);
  useEffect(() => { beatConfigRef.current = beatConfig; }, [beatConfig]);

  // 3) AudioContext and buffers
  useEffect(() => {
    const audioCtx = initAudioContext();
    audioCtxRef.current = audioCtx;

    // Fetch the active sound set from the API and load it
    const loadSounds = async () => {
      try {
        // Get the active sound set from the API
        const soundSet = await getActiveSoundSet();
        console.log('Loaded sound set from API:', soundSet);
        
        // Load the sound buffers with the sound set
        loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
      } catch (error) {
        console.error('Failed to load sound set from API:', error);
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

    // On unmount, stop the scheduler
    return () => {
      stopScheduler();
    };
  }, []);

  // 4) The scheduling logic
  const getCurrentSubIntervalSec = useCallback((subIndex) => {
    const localTempo = tempoRef.current;
    if (!localTempo) return 0.5;
    const secPerHit = 60 / (localTempo * beatMultiplier);

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
  }, [beatMultiplier]);

  function updateActualBpm() {
    // average the last few intervals in playedBeatTimesRef
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

  // Wrap our scheduleSubdivision in a single function we can pass to runScheduler
  const scheduleSubFn = useCallback((subIndex, when) => {
    // Should we mute?
    const muteThisBeat = shouldMuteThisBeat({
      macroMode,
      muteProbability,
      isSilencePhaseRef
    });

    scheduleSubdivision({
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
      shouldMute: muteThisBeat,
      playedBeatTimesRef,
      updateActualBpm
    });
  }, [
    macroMode, 
    muteProbability, 
    isSilencePhaseRef, 
    analogMode, 
    gridMode, 
    multiCircleMode, 
    volumeRef, 
    onAnySubTrigger
  ]);

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
      multiCircleMode
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
    setTempo,
    multiCircleMode
  ]);

  // 5) start/stop the scheduler
  function startScheduler() {
    if (schedulerRunningRef.current) return;
    stopScheduler();

    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    schedulerRunningRef.current = true;
    currentSubRef.current = 0;
    setCurrentSubdivision(0);

    const now = audioCtx.currentTime;
    nextNoteTimeRef.current = now;
    currentSubStartRef.current = now;
    currentSubIntervalRef.current = getCurrentSubIntervalSec(0);
    playedBeatTimesRef.current = [];

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

  // 6) Toggling play/pause from external
  useEffect(() => {
    if (!isPaused) {
      if (!schedulerRunningRef.current) {
        startScheduler();
      }
    } else {
      stopScheduler();
    }
  }, [isPaused]);

  // 7) Tap Tempo
  const handleTapTempo = useCallback(
    createTapTempoLogic(setTempo),
    [setTempo]
  );

  // Add a new reloadSounds function that can be called to reload sound buffers
  const reloadSounds = useCallback(async () => {
    if (!audioCtxRef.current) {
      console.error("No audio context available for reloading sounds");
      return false;
    }

    try {
      // Get the active sound set
      const soundSet = await getActiveSoundSet();
      console.log('Reloading sounds with sound set:', soundSet);
      
      // Load the buffers
      await loadClickBuffers({
        audioCtx: audioCtxRef.current,
        normalBufferRef,
        accentBufferRef,
        firstBufferRef,
        soundSet
      });
      
      console.log('Audio buffers reloaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to reload sound buffers:', error);
      return false;
    }
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);

  // Return the entire logic object
  return {
    currentSubdivision,
    actualBpm,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler,
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    reloadSounds // Add this new function
  };
}