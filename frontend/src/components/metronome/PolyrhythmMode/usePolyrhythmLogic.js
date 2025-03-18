// src/components/metronome/PolyrhythmMode/usePolyrhythmLogic.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { SCHEDULE_AHEAD_TIME } from '../../../hooks/useMetronomeLogic/constants';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { shouldMuteThisBeat, handleMeasureBoundary } from '../../../hooks/useMetronomeLogic/trainingLogic';

/**
 * Custom hook for handling polyrhythm-specific scheduling logic.
 * 
 * Key concepts:
 * - Uses a single Web Audio API timer for precise timing
 * - Maintains synchronized first beats across both circles
 * - Calculates separate intervals for each circle based on subdivisions
 * - Integrates with training mode features
 * 
 * @param {Object} props Configuration options
 * @returns {Object} Beat states and control functions
 */
export default function usePolyrhythmLogic({
  tempo,
  innerBeats,
  outerBeats,
  innerAccents = [],
  outerAccents = [],
  isPaused,
  volume,
  swing,
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1, 
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2,
  onInnerBeatTriggered = null,
  onOuterBeatTriggered = null
}) {
  // Audio context and buffers
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Scheduler state
  const schedulerRunningRef = useRef(false);
  const lookaheadIntervalRef = useRef(null);
  const lastScheduleTimeRef = useRef(0);
  
  // Current audio context time when the sequence was started
  const startTimeRef = useRef(0);
  
  // Beat tracking for UI updates
  const [innerCurrentBeat, setInnerCurrentBeat] = useState(0);
  const [outerCurrentBeat, setOuterCurrentBeat] = useState(0);
  
  // Next scheduled beats (internal use only)
  const nextInnerBeatRef = useRef(0);
  const nextOuterBeatRef = useRef(0);
  
  // For training mode
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const currentCycleStartTimeRef = useRef(0);
  const measureProcessedRef = useRef(false);
  
  // Track active nodes for cleanup
  const activeNodesRef = useRef([]);
  
  // State for actual BPM (might change during training)
  const [actualBpm, setActualBpm] = useState(tempo);
  
  // Store props in refs to avoid stale closures in timers
  const tempoRef = useRef(tempo);
  const volumeRef = useRef(volume);
  const innerBeatsRef = useRef(innerBeats);
  const outerBeatsRef = useRef(outerBeats);
  const innerAccentsRef = useRef(innerAccents);
  const outerAccentsRef = useRef(outerAccents);
  const isPausedRef = useRef(isPaused);
  const swingRef = useRef(swing);
  const macroModeRef = useRef(macroMode);
  
  // Update refs when props change
  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { innerBeatsRef.current = innerBeats; }, [innerBeats]);
  useEffect(() => { outerBeatsRef.current = outerBeats; }, [outerBeats]);
  useEffect(() => { innerAccentsRef.current = innerAccents; }, [innerAccents]);
  useEffect(() => { outerAccentsRef.current = outerAccents; }, [outerAccents]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { macroModeRef.current = macroMode; }, [macroMode]);

  // Initialize audio context and load sound buffers
  useEffect(() => {
    const audioCtx = initAudioContext();
    audioCtxRef.current = audioCtx;

    const loadSounds = async () => {
      try {
        const soundSet = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
      } catch (err) {
        console.error('Error loading sound set:', err);
        await loadClickBuffers({
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
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, []);

  /**
   * Calculate the least common multiple (LCM) of two numbers
   * Used to determine when both rhythms will realign
   */
  const lcm = useCallback((a, b) => {
    // Helper to find greatest common divisor
    const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
    const result = (a * b) / gcd(a, b);
    
    // Debug logging for LCM calculation
    console.log(`LCM calculation: ${a}:${b} = ${result}`);
    
    return result;
  }, []);

  /**
   * Calculate timing information for both circles
   * - Calculates interval for each circle based on global BPM
   * - Determines the common cycle length (when both patterns realign)
   */
  const getTimingInfo = useCallback(() => {
    // Convert BPM to seconds per beat
    const secondsPerBeat = 60 / tempoRef.current;
    
    // Calculate intervals for each circle
    // Formula: interval = (60 / BPM) / numberOfBeats
    const innerInterval = secondsPerBeat / innerBeatsRef.current;
    const outerInterval = secondsPerBeat / outerBeatsRef.current;
    
    // Calculate when both patterns will realign (complete polyrhythm cycle)
    const commonCycleLCM = lcm(innerBeatsRef.current, outerBeatsRef.current);
    
    // Duration of complete cycle in seconds
    const cycleDuration = (commonCycleLCM / innerBeatsRef.current) * innerInterval;
    
    // Debug logging for polyrhythm timing
    console.log(`Polyrhythm timing:
      - Tempo: ${tempoRef.current} BPM
      - Inner beats: ${innerBeatsRef.current}, interval: ${innerInterval.toFixed(3)}s
      - Outer beats: ${outerBeatsRef.current}, interval: ${outerInterval.toFixed(3)}s
      - LCM: ${commonCycleLCM}, cycle duration: ${cycleDuration.toFixed(3)}s
      - Inner beats in cycle: ${commonCycleLCM / innerBeatsRef.current}
      - Outer beats in cycle: ${commonCycleLCM / outerBeatsRef.current}
    `);
    
    return {
      innerInterval,
      outerInterval,
      cycleDuration,
      commonCycleLCM
    };
  }, [lcm]);

  /**
   * Schedule audio playback for a beat
   * @param {number} time Precise time when the beat should play
   * @param {number} beatIndex Which beat in the pattern (0-indexed)
   * @param {boolean} isInnerCircle Whether this is for inner or outer circle
   * @param {boolean} mute Whether audio should be muted (for training mode)
   * @param {boolean} isFirstBeatOfBoth Optional flag to indicate this is the synchronized first beat of both circles
   */
  const scheduleBeat = useCallback((time, beatIndex, isInnerCircle, mute = false, isFirstBeatOfBoth = false) => {
    if (!audioCtxRef.current || mute) return;
    
    // Get the right accent array for this circle
    const accents = isInnerCircle ? innerAccentsRef.current : outerAccentsRef.current;
    
    // Determine which accent value to use (0=muted, 1=normal, 2=accent, 3=first) 
    const accentValue = beatIndex < accents.length ? accents[beatIndex] : 1;
    
    // Skip if explicitly muted in accent pattern
    if (accentValue === 0) return;
    
    // Select the right buffer based on accent value
    let buffer = normalBufferRef.current;
    if (accentValue === 3) {
      buffer = firstBufferRef.current;
    } else if (accentValue === 2) {
      buffer = accentBufferRef.current;
    }
    
    if (!buffer) return;
    
    // Create and configure audio source
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    
    // Create volume node
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volumeRef.current;
    
    // Connect audio nodes
    source.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);
    
    // Log when scheduling a first beat (for debugging)
    if (beatIndex === 0 || isFirstBeatOfBoth) {
      const circleType = isInnerCircle ? 'INNER' : 'OUTER';
      console.log(`Scheduling ${circleType} FIRST BEAT at time ${time.toFixed(4)}s${isFirstBeatOfBoth ? ' (UNIFIED)' : ''}`);
    }
    
    // Schedule precise playback
    source.start(time);
    
    // Store for cleanup
    activeNodesRef.current.push({ source, gainNode });
    
    // Set up cleanup once audio is done playing
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
      const index = activeNodesRef.current.findIndex(n => n.source === source);
      if (index !== -1) {
        activeNodesRef.current.splice(index, 1);
      }
    };
    
    // Create visual UI updates scheduled for the same time
    // We need to schedule these relative to current time
    const delayUntilBeat = Math.max(0, (time - audioCtxRef.current.currentTime) * 1000);
    
    setTimeout(() => {
      // Only update if we're still running (avoid stale updates if stopped)
      if (!schedulerRunningRef.current) return;
      
      // Update UI state
      if (isInnerCircle) {
        setInnerCurrentBeat(beatIndex);
        if (typeof onInnerBeatTriggered === 'function') {
          onInnerBeatTriggered(beatIndex);
        }
      } else {
        setOuterCurrentBeat(beatIndex);
        if (typeof onOuterBeatTriggered === 'function') {
          onOuterBeatTriggered(beatIndex);
        }
      }
    }, delayUntilBeat);
  }, [onInnerBeatTriggered, onOuterBeatTriggered]);

  /**
   * This function specifically schedules the unified first beat for both circles
   * Ensures that both inner and outer first beats occur at the exact same time
   * @param {number} time Precise time when the unified first beat should play
   * @param {boolean} mute Whether audio should be muted (for training mode)
   */
  const scheduleUnifiedFirstBeat = useCallback((time, mute = false) => {
    // Log unified first beat scheduling
    console.log(`=== SCHEDULING UNIFIED FIRST BEAT at ${time.toFixed(4)}s ===`);
    
    // Schedule the inner circle first beat with special flag
    scheduleBeat(time, 0, true, mute, true);
    
    // Schedule the outer circle first beat with special flag
    scheduleBeat(time, 0, false, mute, true);
    
    // Update UI states immediately for both circles
    const delayUntilBeat = Math.max(0, (time - audioCtxRef.current.currentTime) * 1000);
    setTimeout(() => {
      if (!schedulerRunningRef.current) return;
      
      setInnerCurrentBeat(0);
      setOuterCurrentBeat(0);
      
      if (typeof onInnerBeatTriggered === 'function') {
        onInnerBeatTriggered(0);
      }
      
      if (typeof onOuterBeatTriggered === 'function') {
        onOuterBeatTriggered(0);
      }
    }, delayUntilBeat);
  }, [scheduleBeat, onInnerBeatTriggered, onOuterBeatTriggered]);

  /**
   * The main scheduler loop that runs repeatedly
   * Schedules beats ahead of time for precise timing
   */
  const schedulerLoop = useCallback(() => {
    if (!audioCtxRef.current || !schedulerRunningRef.current) return;
    
    const now = audioCtxRef.current.currentTime;
    const { innerInterval, outerInterval, cycleDuration, commonCycleLCM } = getTimingInfo();
    
    // Schedule ahead window (how far into the future we schedule beats)
    const scheduleAheadTime = now + SCHEDULE_AHEAD_TIME;
    
    // Only schedule new beats if necessary
    if (lastScheduleTimeRef.current >= scheduleAheadTime) return;
    
    // First, check if we need to process measure boundaries for training mode
    // This happens at the start of each common cycle
    const timeSinceStart = now - startTimeRef.current;
    const currentCycleStartTime = startTimeRef.current + 
      (Math.floor(timeSinceStart / cycleDuration) * cycleDuration);
    
    // Calculate number of completed cycles since start
    const completedCycles = Math.floor(timeSinceStart / cycleDuration);
    
    // Detect new measure/cycle boundaries for training mode
    if (currentCycleStartTime > currentCycleStartTimeRef.current) {
      // Log cycle boundaries for debugging
      console.log(`New polyrhythm cycle at ${now.toFixed(3)}s, cycle #${completedCycles}`);
      console.log(`Expected alignment: Inner beat ${(completedCycles * commonCycleLCM) % innerBeatsRef.current}, Outer beat ${(completedCycles * commonCycleLCM) % outerBeatsRef.current}`);
      
      // New cycle detected - handle training logic
      currentCycleStartTimeRef.current = currentCycleStartTime;
      
      if (!measureProcessedRef.current) {
        measureProcessedRef.current = true;
        
        // Handle training mode logic at measure boundaries
        handleMeasureBoundary({
          measureCountRef,
          muteMeasureCountRef,
          isSilencePhaseRef,
          macroMode: macroModeRef.current,
          speedMode,
          measuresUntilMute,
          muteDurationMeasures,
          muteProbability,
          tempoRef,
          measuresUntilSpeedUp,
          tempoIncreasePercent
        });
        
        // Update UI if tempo changed
        if (tempoRef.current !== actualBpm) {
          setActualBpm(tempoRef.current);
        }
      }
    } else {
      measureProcessedRef.current = false;
    }
    
    // Determine if we should mute audio based on training mode
    const doMute = shouldMuteThisBeat({
      macroMode: macroModeRef.current,
      muteProbability,
      isSilencePhaseRef
    });
    
    // Calculate the next cycle start that falls within our scheduling window
    const nextCycleStart = currentCycleStartTime + cycleDuration;
    
    // If the next cycle start is within our scheduling window, we need to schedule
    // a unified first beat for both circles
    if (nextCycleStart < scheduleAheadTime) {
      // Schedule unified first beat for both circles at the exact same time
      scheduleUnifiedFirstBeat(nextCycleStart, doMute);
    }
    
    // Schedule inner circle beats, but skip scheduling at cycle start points (those are handled by scheduleUnifiedFirstBeat)
    while (nextInnerBeatRef.current < scheduleAheadTime) {
      // Calculate elapsed time since start
      const elapsedTime = nextInnerBeatRef.current - startTimeRef.current;
      
      // Calculate which beat this is (0-indexed) within the pattern
      const beatCount = Math.floor(elapsedTime / innerInterval);
      const beatIndex = beatCount % innerBeatsRef.current;
      
      // Only schedule if this isn't a cycle start (unified beat) or if it's not the first beat
      const isCycleStart = Math.abs(nextInnerBeatRef.current - nextCycleStart) < 0.001;
      
      if (!isCycleStart || beatIndex !== 0) {
        // Debug logging for inner beat scheduling (but not too verbose)
        if (beatIndex === 0) {
          console.log(`Scheduling inner first beat #${beatCount} at ${nextInnerBeatRef.current.toFixed(3)}s (beat index: ${beatIndex})`);
        }
        
        // Schedule the beat audio and UI update
        scheduleBeat(
          nextInnerBeatRef.current,
          beatIndex,
          true, // isInnerCircle = true
          doMute
        );
      }
      
      // Move to next beat time
      nextInnerBeatRef.current += innerInterval;
    }
    
    // Schedule outer circle beats, but skip scheduling at cycle start points (those are handled by scheduleUnifiedFirstBeat)
    while (nextOuterBeatRef.current < scheduleAheadTime) {
      // Calculate elapsed time since start
      const elapsedTime = nextOuterBeatRef.current - startTimeRef.current;
      
      // Calculate which beat this is (0-indexed) within the pattern
      const beatCount = Math.floor(elapsedTime / outerInterval);
      const beatIndex = beatCount % outerBeatsRef.current;
      
      // Only schedule if this isn't a cycle start (unified beat) or if it's not the first beat
      const isCycleStart = Math.abs(nextOuterBeatRef.current - nextCycleStart) < 0.001;
      
      if (!isCycleStart || beatIndex !== 0) {
        // Debug logging for outer beat scheduling (but not too verbose)
        if (beatIndex === 0) {
          console.log(`Scheduling outer first beat #${beatCount} at ${nextOuterBeatRef.current.toFixed(3)}s (beat index: ${beatIndex})`);
        }
        
        // Schedule the beat audio and UI update
        scheduleBeat(
          nextOuterBeatRef.current,
          beatIndex,
          false, // isInnerCircle = false
          doMute
        );
      }
      
      // Move to next beat time
      nextOuterBeatRef.current += outerInterval;
    }
    
    // Update last schedule time
    lastScheduleTimeRef.current = scheduleAheadTime;
  }, [getTimingInfo, scheduleBeat, scheduleUnifiedFirstBeat, speedMode, measuresUntilMute, 
      muteDurationMeasures, muteProbability, measuresUntilSpeedUp, 
      tempoIncreasePercent, actualBpm]);

  /**
   * Start the scheduler and begin playback
   * Both circles start synchronized at the first beat
   */
  const startScheduler = useCallback(async () => {
    if (schedulerRunningRef.current) {
      return; // Already running
    }

    try {
      // Initialize or resume audio context
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = initAudioContext();
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
      } else if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      // Add a small delay before starting to ensure audio context is ready
      const startDelay = 0.1; // 100ms buffer
      
      // CRITICAL: Both circles must start at the SAME time for first beat sync
      // This is the key to ensuring the first beats (downbeats) stay synchronized throughout
      startTimeRef.current = audioCtxRef.current.currentTime + startDelay;
      
      // Log polyrhythm setup
      const { innerInterval, outerInterval, cycleDuration, commonCycleLCM } = getTimingInfo();
      console.log(`
========================================
STARTING POLYRHYTHM: ${innerBeatsRef.current}:${outerBeatsRef.current}
----------------------------------------
BPM: ${tempoRef.current}
Inner beats: ${innerBeatsRef.current}, interval: ${innerInterval.toFixed(3)}s
Outer beats: ${outerBeatsRef.current}, interval: ${outerInterval.toFixed(3)}s
LCM: ${commonCycleLCM} beats, cycle duration: ${cycleDuration.toFixed(3)}s
----------------------------------------
Start time: ${startTimeRef.current.toFixed(3)}s
UNIFIED FIRST BEAT: Both circles will trigger first beat at the same time
========================================
      `);
      
      // Set initial beat times to the start time so both circles begin together
      nextInnerBeatRef.current = startTimeRef.current;
      nextOuterBeatRef.current = startTimeRef.current;
      
      // Reset training mode state
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
      currentCycleStartTimeRef.current = startTimeRef.current;
      measureProcessedRef.current = false;
      
      // Reset the last scheduled time
      lastScheduleTimeRef.current = 0;

      // Reset UI position to the first beat
      setInnerCurrentBeat(0);
      setOuterCurrentBeat(0);
      
      // Start with a unified first beat for both circles
      // This is critical for ensuring the downbeats stay synchronized
      scheduleUnifiedFirstBeat(startTimeRef.current, false);
      
      // Start the scheduler loop
      schedulerRunningRef.current = true;
      lookaheadIntervalRef.current = setInterval(schedulerLoop, 25); // 40Hz update rate
    } catch (err) {
      console.error('Error starting scheduler:', err);
    }
  }, [getTimingInfo, schedulerLoop, scheduleUnifiedFirstBeat]);

  /**
   * Stop the scheduler and all audio playback
   */
  const stopScheduler = useCallback(() => {
    if (lookaheadIntervalRef.current) {
      clearInterval(lookaheadIntervalRef.current);
      lookaheadIntervalRef.current = null;
    }

    schedulerRunningRef.current = false;

    // Stop and disconnect all active audio nodes
    activeNodesRef.current.forEach(({ source, gainNode }) => {
      try {
        if (source.stop) source.stop(0);
        source.disconnect();
        gainNode.disconnect();
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    
    activeNodesRef.current = [];
    
    // Reset beat positions in UI
    setInnerCurrentBeat(0);
    setOuterCurrentBeat(0);
  }, []);

  // Reference for storing tap timestamps
  const tapTimesRef = useRef([]);
  
  /**
   * Tap tempo implementation for tempo detection
   * Calculates tempo based on recent tap intervals
   */
  const tapTempo = useCallback(() => {
    const now = performance.now();
    
    // Add this tap to the history
    tapTimesRef.current.push(now);
    
    // Need at least 2 taps to calculate tempo
    if (tapTimesRef.current.length < 2) return tempoRef.current;
    
    // Only use the most recent taps (sliding window)
    if (tapTimesRef.current.length > 4) {
      tapTimesRef.current = tapTimesRef.current.slice(-4);
    }
    
    // Calculate average interval between taps
    let sum = 0;
    let count = 0;
    
    for (let i = 1; i < tapTimesRef.current.length; i++) {
      const interval = tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      
      // Filter out unreasonable intervals (too fast or too slow)
      if (interval > 200 && interval < 2000) {
        sum += interval;
        count++;
      }
    }
    
    if (count > 0) {
      // Convert average interval to BPM
      const avgMs = sum / count;
      const newTempo = Math.round(60000 / avgMs);
      
      // Clamp to reasonable BPM range
      const clampedTempo = Math.min(Math.max(newTempo, 30), 240);
      
      // Update tempo
      tempoRef.current = clampedTempo;
      setActualBpm(clampedTempo);
      
      return clampedTempo;
    }
    
    return tempoRef.current;
  }, []);

  /**
   * Reload sound buffers (e.g. after a settings change)
   */
  const reloadSounds = useCallback(async () => {
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
  }, []);

  // Start/stop based on isPaused prop
  useEffect(() => {
    isPausedRef.current = isPaused;
    
    if (isPaused) {
      stopScheduler();
    } else {
      startScheduler();
    }
  }, [isPaused, startScheduler, stopScheduler]);

  // Restart when beat counts change
  useEffect(() => {
    if (!isPaused && schedulerRunningRef.current) {
      stopScheduler();
      // Small delay to ensure clean restart
      setTimeout(() => {
        startScheduler();
      }, 50);
    }
  }, [innerBeats, outerBeats, isPaused, stopScheduler, startScheduler]);

  // Update tempo when it changes
  useEffect(() => {
    if (tempo !== tempoRef.current) {
      tempoRef.current = tempo;
      
      if (tempo !== actualBpm) {
        setActualBpm(tempo);
      }
    }
  }, [tempo, actualBpm]);

  // Return values and functions for component use
  return {
    innerCurrentSubdivision: innerCurrentBeat,
    outerCurrentSubdivision: outerCurrentBeat,
    isSilencePhaseRef,
    measureCountRef,
    muteMeasureCountRef,
    actualBpm,
    tapTempo,
    startScheduler,
    stopScheduler,
    reloadSounds,
    audioCtx: audioCtxRef.current
  };
}