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
    actualBpm, setActualBpm,
    nodeRefs // Collection of active audio nodes for cleanup
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

  // 3) Audio initialization is deferred until user interaction.
  const initializeAudio = async () => {
    if (!audioCtxRef.current) {
      const audioCtx = initAudioContext();
      audioCtxRef.current = audioCtx;
      try {
        const soundSet = await getActiveSoundSet();
        console.log('Loaded sound set from API:', soundSet);
        await loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
      } catch (error) {
        console.error('Failed to load sound set from API:', error);
        await loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
      }
    } else if (audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
        console.log('AudioContext resumed successfully');
      } catch (err) {
        console.error('Failed to resume AudioContext:', err);
      }
    }
    return audioCtxRef.current;
  };

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

  // Move updateActualBpm into a useCallback to prevent it from changing on every render
  const updateActualBpm = useCallback(() => {
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
  }, [playedBeatTimesRef, setActualBpm]);

  // Wrap our scheduleSubdivision in a single function we can pass to runScheduler
  const scheduleSubFn = useCallback((subIndex, when, nodeRefs) => {
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
      updateActualBpm,
      nodeRefs
    });
  }, [
    macroMode, 
    muteProbability, 
    isSilencePhaseRef, 
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
    updateActualBpm, 
    playedBeatTimesRef,
    audioCtxRef
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
      multiCircleMode,
      nodeRefs
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
    multiCircleMode,
    nodeRefs
  ]);

  // 5) start/stop the scheduler
  function startScheduler() {
    if (schedulerRunningRef.current) return;
    stopScheduler();

    // Initialize audio if needed
    if (!audioCtxRef.current) {
      console.log('AudioContext not initialized, initializing now...');
      initializeAudio().then(audioCtx => {
        if (audioCtx) {
          console.log('AudioContext initialized, starting scheduler...');
          startSchedulerWithAudio(audioCtx);
        } else {
          console.error('Failed to initialize AudioContext');
        }
      }).catch(err => {
        console.error('Error initializing audio:', err);
      });
      return;
    }

    // Audio exists but might be suspended
    if (audioCtxRef.current.state === 'suspended') {
      console.log('AudioContext suspended, resuming...');
      audioCtxRef.current.resume().then(() => {
        console.log('AudioContext resumed, starting scheduler...');
        startSchedulerWithAudio(audioCtxRef.current);
      }).catch(err => {
        console.error('Error resuming AudioContext:', err);
      });
      return;
    }

    // Audio is ready, start scheduler
    startSchedulerWithAudio(audioCtxRef.current);
  }

  function startSchedulerWithAudio(audioCtx) {
    if (!audioCtx) {
      console.error('Cannot start scheduler without AudioContext');
      return;
    }
    
    // Make sure we have our sound buffers
    if (!normalBufferRef.current || !accentBufferRef.current || !firstBufferRef.current) {
      console.error('Sound buffers not loaded, cannot start scheduler');
      return;
    }

    console.log('Starting scheduler with audio:', audioCtx.state);
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
    console.log('[Scheduler] Stopping scheduler');
    
    // 1. Clear the scheduling lookahead interval
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    
    // 2. Reset running state
    schedulerRunningRef.current = false;
    
    // 3. Stop all active audio nodes
    if (nodeRefs.current && nodeRefs.current.length > 0) {
      console.log(`[Scheduler] Stopping ${nodeRefs.current.length} active audio nodes`);
      try {
        // Loop through all tracked audio nodes and stop them
        nodeRefs.current.forEach(node => {
          if (node && typeof node.stop === 'function') {
            try {
              node.stop(0);
            } catch (e) {
              // Ignore errors when stopping nodes that might already be done
            }
          }
        });
        // Clear the nodeRefs array
        nodeRefs.current = [];
      } catch (err) {
        console.error('[Scheduler] Error stopping audio nodes:', err);
      }
    }
    
    // 4. Reset timing references
    nextNoteTimeRef.current = 0;
    currentSubRef.current = 0;
    playedBeatTimesRef.current = [];
    
    // 5. Update visual state
    setCurrentSubdivision(0);
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