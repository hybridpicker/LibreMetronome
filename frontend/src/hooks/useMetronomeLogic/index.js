import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { initAudioContext, loadClickBuffers, resumeAudioContext } from './audioBuffers';
import { useMetronomeRefs } from './references';
import { createTapTempoLogic } from './tapTempo';
import { handleMeasureBoundary, shouldMuteThisBeat } from './trainingLogic';
import { runScheduler, scheduleSubdivision } from './scheduler';
import { TEMPO_MIN, TEMPO_MAX, SCHEDULER_INTERVAL } from './constants';
import { getActiveSoundSet } from '../../services/soundSetService';

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
  // Refs and state for metronome scheduling and audio handling
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
    nodeRefs,
    // Removed unused ref
  } = useMetronomeRefs();

  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // For training mode
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  
  useEffect(() => {
    if (speedMode === 0 && macroMode === 0) {
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
      
      // Also update the global reference to ensure UI consistency
      if (typeof window !== 'undefined') {
        window.isSilencePhaseRef = isSilencePhaseRef;
      }
    }
    
    // Only reset counters when starting from paused to playing
    // Don't reset when going from playing to paused
    if (isPaused) {
      // Don't change the silence phase when paused
      // Just stop counting
    }
  }, [speedMode, macroMode, isPaused, measuresUntilSpeedUp]);

  // Local copies of dynamic values
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
  
  const doSchedulerLoopRef = useRef(null);
  
  const getCurrentSubIntervalSec = useCallback((subIndex) => {
    const localTempo = tempoRef.current;
    if (!localTempo) return 0.5;
    
    const currentMultiplier = beatMultiplierRef.current;
    const secPerBeat = 60 / localTempo;
    const secPerHit = secPerBeat / currentMultiplier;

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
  
  const updateActualBpm = useCallback(() => {
    const times = playedBeatTimesRef.current;
    if (times.length < 2) return;
    
    const recentTimes = times.slice(-8);
    let totalDiff = 0;
    let numDiffs = 0;
    let diffsSquared = 0;
    
    if (highResTimingsRef && highResTimingsRef.current) {
      if (highResTimingsRef.current.length > 50) {
        highResTimingsRef.current = highResTimingsRef.current.slice(-50);
      }
      if (recentTimes.length >= 2) {
        highResTimingsRef.current.push({
          time: performance.now(),
          interval: recentTimes[recentTimes.length-1] - recentTimes[recentTimes.length-2]
        });
      }
    }
    
    for (let i = 1; i < recentTimes.length; i++) {
      const diff = recentTimes[i] - recentTimes[i-1];
      totalDiff += diff;
      numDiffs++;
    }
    
    if (numDiffs === 0) return;
    const avgTimeBetweenBeats = totalDiff / numDiffs;
    
    for (let i = 1; i < recentTimes.length; i++) {
      const diff = recentTimes[i] - recentTimes[i-1];
      const deviation = diff - avgTimeBetweenBeats;
      diffsSquared += deviation * deviation;
    }
    
    const variance = diffsSquared / numDiffs;
    const standardDeviation = Math.sqrt(variance);
    
    if (setTimingPrecision) {
      setTimingPrecision(standardDeviation.toFixed(2));
    }
    
    const beatsPerSec = 1000 / avgTimeBetweenBeats;
    const beatsPerMin = beatsPerSec * 60;
    const newBpm = Math.round(beatsPerMin * 10) / 10;
    setActualBpm(newBpm);
  }, [playedBeatTimesRef, highResTimingsRef, setActualBpm, setTimingPrecision]);
  
  const handleTrainingModeTempoAdjustments = useCallback(() => {
    let adjustedTempo = tempoRef.current;
    if (
      speedMode === 1 && 
      measureCountRef.current > 0 && 
      measureCountRef.current % measuresUntilSpeedUp === 0
    ) {
      const newTempo = adjustedTempo * (1 + tempoIncreasePercent / 100);
      adjustedTempo = Math.min(newTempo, TEMPO_MAX);
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
  
  const doSchedulerLoop = useCallback(() => {
    if (!audioCtxRef.current) return;
    const adjustedTempo = handleTrainingModeTempoAdjustments();
    
    // Make isSilencePhaseRef available globally for UI components
    if (typeof window !== 'undefined') {
      window.isSilencePhaseRef = isSilencePhaseRef;
    }
    
    runScheduler({
      audioCtxRef,
      nextNoteTimeRef,
      currentSubRef,
      currentSubdivisionSetter: setCurrentSubdivision,
      getCurrentSubIntervalSec,
      tempo: adjustedTempo,
      handleMeasureBoundary: () => {
        // Create event for measure boundary transitions
        window.dispatchEvent(new CustomEvent('metronome-measure-boundary', {
          detail: {
            timestamp: performance.now(),
            isSilencePhase: isSilencePhaseRef?.current,
            measureCount: measureCountRef?.current,
            muteMeasureCount: muteMeasureCountRef?.current
          }
        }));
        
        return handleMeasureBoundary({
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
      scheduleSubFn: (subIndex, when, nodeRefs) => {
        // Get mute status before scheduling
        const shouldMuteCurrentBeat = shouldMuteThisBeat({
          macroMode,
          muteProbability,
          isSilencePhaseRef
        });
        
        // Always dispatch event for training UI sync
        window.dispatchEvent(new CustomEvent('metronome-beat', {
          detail: {
            timestamp: performance.now(),
            subIndex,
            when,
            isSilencePhase: isSilencePhaseRef?.current,
            isMuted: shouldMuteCurrentBeat
          }
        }));
        
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
          shouldMute: shouldMuteCurrentBeat,
          playedBeatTimesRef,
          updateActualBpm,
          nodeRefs
        });
      },
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

  useEffect(() => {
    doSchedulerLoopRef.current = doSchedulerLoop;
  }, [doSchedulerLoop]);

  useEffect(() => { 
    beatMultiplierRef.current = beatMultiplier; 
    if (schedulerRunningRef.current && audioCtxRef.current) {
      currentSubIntervalRef.current = getCurrentSubIntervalSec(currentSubRef.current);
      if (!isPaused && lookaheadRef.current) {
        clearInterval(lookaheadRef.current);
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

  const stopScheduler = useCallback(function() {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    schedulerRunningRef.current = false;
    for (const node of nodeRefs.current) {
      try {
        if (node.stop) {
          node.stop();
        } else if (node.disconnect) {
          node.disconnect();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    nodeRefs.current = [];
  }, [lookaheadRef, nodeRefs, schedulerRunningRef]);

  const startScheduler = useCallback(function() {
    if (schedulerRunningRef.current) return;
    stopScheduler();
    (async function() {
      try {
        // Initialize audio context if it doesn't exist or is closed
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          console.log('Creating new audio context');
          const newCtx = initAudioContext();
          if (!newCtx) {
            console.error('Failed to create audio context');
            return;
          }
          audioCtxRef.current = newCtx;
        }
        
        // Resume if suspended - using our dedicated helper function
        if (audioCtxRef.current.state === 'suspended') {
          console.log('Resuming suspended audio context');
          const resumed = await resumeAudioContext(audioCtxRef.current);
          if (!resumed) {
            console.error('Failed to resume audio context - user interaction may be required');
            // Continue anyway and try to load sounds - the UI should handle resuming properly
          }
        }
        
        // We'll check the context state again after loading sounds
        
        // Load sound buffers if they don't exist
        if (!normalBufferRef.current || !accentBufferRef.current || !firstBufferRef.current) {
          console.log('Loading sound buffers');
          try {
            // Try to load the active sound set
            const soundSet = await getActiveSoundSet();
            await loadClickBuffers({
              audioCtx: audioCtxRef.current,
              normalBufferRef,
              accentBufferRef,
              firstBufferRef,
              soundSet
            });
            console.log('Sound buffers loaded successfully with active sound set');
          } catch (error) {
            console.log('Loading default sound set', error);
            await loadClickBuffers({
              audioCtx: audioCtxRef.current,
              normalBufferRef,
              accentBufferRef,
              firstBufferRef
            });
            console.log('Default sound buffers loaded successfully');
          }
        }
        
        // Double-check that all buffers are ready before starting
        if (!normalBufferRef.current || !accentBufferRef.current || !firstBufferRef.current) {
          console.error('Sound buffers still not ready after load attempt');
          return;
        }
        
        // Final check of audio context state
        if (audioCtxRef.current.state !== 'running') {
          console.error('Audio context still not in running state after setup. Current state:', audioCtxRef.current.state);
          
          // If the context is closed, we need to create a new one - can't resume closed contexts
          if (audioCtxRef.current.state === 'closed') {
            console.log('Creating new audio context to replace closed one');
            const newCtx = initAudioContext();
            if (!newCtx) {
              console.error('Failed to create replacement audio context');
              return;
            }
            audioCtxRef.current = newCtx;
            
            // Need to reload sounds with the new context
            console.log('Reloading sounds for new audio context');
            try {
              const soundSet = await getActiveSoundSet();
              await loadClickBuffers({
                audioCtx: audioCtxRef.current,
                normalBufferRef,
                accentBufferRef,
                firstBufferRef,
                soundSet
              });
              console.log('Sounds reloaded successfully with new audio context');
            } catch (error) {
              console.error('Failed to reload sounds with new audio context:', error);
              return;
            }
          } else {
            // For suspended contexts, try to resume one more time
            console.log('Will try to resume one more time...');
            try {
              await audioCtxRef.current.resume();
              console.log('Final resume attempt result:', audioCtxRef.current.state);
            } catch (e) {
              console.error('Final resume attempt failed:', e);
              return; // Don't proceed if we can't resume
            }
          }
          
          // Final check to ensure audio context is running
          if (audioCtxRef.current.state !== 'running') {
            console.error('Audio context still not running after all attempts. Aborting scheduler start.');
            return;
          }
        }
        
        schedulerRunningRef.current = true;
        const now = audioCtxRef.current.currentTime;
        currentSubRef.current = 0;
        setCurrentSubdivision(0);
        nextNoteTimeRef.current = now;
        currentSubStartRef.current = now;
        currentSubIntervalRef.current = getCurrentSubIntervalSec(0);
        playedBeatTimesRef.current = [];
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
    stopScheduler
  ]);

  // Use useMemo to create the tapTempo handler only once so that its internal state (tapTimes) persists
  const tapTempoHandler = useMemo(() => {
    return createTapTempoLogic({
      setTempo: (newTempo) => {
        const clampedTempo = Math.min(Math.max(newTempo, TEMPO_MIN), TEMPO_MAX);
        if (setTempo) {
          setTempo(clampedTempo);
        }
      }
    });
  }, [setTempo]);

  const reloadSounds = useCallback(async function() {
    try {
      // Save the current playing state
      const wasPlaying = schedulerRunningRef.current;
      console.log(`Reloading sounds (current state: ${wasPlaying ? 'playing' : 'paused'})`);
      
      // If we're currently playing, don't stop the scheduler to avoid interruption
      // We'll swap out the sound buffers while the metronome continues running
      
      // If we have no audio context or it's closed, create a new one
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        console.log('Creating new audio context during reloadSounds');
        const newCtx = initAudioContext();
        if (!newCtx) {
          console.error('Failed to create audio context during reloadSounds');
          return false;
        }
        audioCtxRef.current = newCtx;
        
        // Try to start the audio context immediately
        if (audioCtxRef.current.state === 'suspended') {
          try {
            // This may fail without user interaction, which is OK
            await audioCtxRef.current.resume();
            console.log('Audio context resumed during reloadSounds, state:', audioCtxRef.current.state);
          } catch (err) {
            console.warn('Could not resume audio context immediately:', err);
            // Continue anyway - the UI will handle this later with user interaction
          }
        }
      }
      
      // If there's no audio context at this point, we can't continue
      if (!audioCtxRef.current) {
        console.error('No audio context available after initialization attempts');
        return false;
      }
      
      // Try to get active sound set
      let soundSet;
      try {
        soundSet = await getActiveSoundSet();
        console.log('Retrieved active sound set:', soundSet ? soundSet.name : 'default');
      } catch (err) {
        console.warn('Could not get active sound set, using default:', err);
        // Continue without a soundSet - loadClickBuffers will use defaults
      }
      
      // Load the sound buffers
      const loadResult = await loadClickBuffers({
        audioCtx: audioCtxRef.current,
        normalBufferRef,
        accentBufferRef,
        firstBufferRef,
        soundSet
      });
      
      if (!loadResult) {
        console.error('Failed to load audio buffers');
        return false;
      }
      
      console.log('Successfully reloaded all sounds');
      
      // Notify that sound buffers have changed
      window.dispatchEvent(new CustomEvent('metronome-sounds-reloaded', { 
        detail: { timestamp: performance.now() } 
      }));
      
      return true;
    } catch (error) {
      console.error('Error in reloadSounds:', error);
      return false;
    }
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef, schedulerRunningRef]);

  useEffect(() => {
    if (isPaused) {
      stopScheduler();
    } else {
      startScheduler();
    }
  }, [isPaused, startScheduler, stopScheduler]);
  
  useEffect(() => {
    return () => {
      stopScheduler();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, [audioCtxRef, stopScheduler]);

  return {
    currentSubdivision,
    actualBpm,
    timingPrecision,
    audioCtx: audioCtxRef.current,
    tapTempo: tapTempoHandler,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler,
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    reloadSounds,
    updateBeatMultiplier: (newMultiplier) => {
      beatMultiplierRef.current = newMultiplier;
      if (schedulerRunningRef.current && audioCtxRef.current) {
        currentSubIntervalRef.current = getCurrentSubIntervalSec(currentSubRef.current);
      }
      return newMultiplier;
    },
    getTimingStats: () => {
      if (!highResTimingsRef.current || highResTimingsRef.current.length < 2) {
        return { average: 0, min: 0, max: 0, stdDev: 0 };
      }
      const intervals = highResTimingsRef.current.map(t => t.interval);
      const sum = intervals.reduce((a, b) => a + b, 0);
      const avg = sum / intervals.length;
      const min = Math.min(...intervals);
      const max = Math.max(...intervals);
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
