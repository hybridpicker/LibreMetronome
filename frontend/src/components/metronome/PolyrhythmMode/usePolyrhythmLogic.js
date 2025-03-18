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
 * - Maintains synchronized first beats (downbeats) across both circles
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
  
  // Track active nodes for cleanup
  const activeNodesRef = useRef([]);
  
  // For training mode
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const currentCycleStartTimeRef = useRef(0);
  const measureProcessedRef = useRef(false);
  
  // Flag to mark that the unified first beat has already been scheduled for this cycle.
  const firstBeatTriggeredRef = useRef(false);
  
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
   * Calculate the least common multiple (LCM) of two numbers.
   */
  const lcm = useCallback((a, b) => {
    const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
    const result = (a * b) / gcd(a, b);
    console.log(`LCM calculation: ${a}:${b} = ${result}`);
    return result;
  }, []);

  /**
   * Calculate timing information for both circles.
   */
  const getTimingInfo = useCallback(() => {
    const secondsPerBeat = 60 / tempoRef.current;
    const innerInterval = secondsPerBeat / innerBeatsRef.current;
    const outerInterval = secondsPerBeat / outerBeatsRef.current;
    const commonCycleLCM = lcm(innerBeatsRef.current, outerBeatsRef.current);
    const cycleDuration = (commonCycleLCM / innerBeatsRef.current) * innerInterval;
    console.log(`Polyrhythm timing:
      - Tempo: ${tempoRef.current} BPM
      - Inner beats: ${innerBeatsRef.current}, interval: ${innerInterval.toFixed(3)}s
      - Outer beats: ${outerBeatsRef.current}, interval: ${outerInterval.toFixed(3)}s
      - LCM: ${commonCycleLCM}, cycle duration: ${cycleDuration.toFixed(3)}s
      - Inner beats in cycle: ${commonCycleLCM / innerBeatsRef.current}
      - Outer beats in cycle: ${commonCycleLCM / outerBeatsRef.current}
    `);
    return { innerInterval, outerInterval, cycleDuration, commonCycleLCM };
  }, [lcm]);

  /**
   * Schedule audio playback for a beat.
   * If the requested time is in the past, play immediately.
   * When a first beat (beat index 0) is played, log the event.
   */
  const scheduleBeat = useCallback((time, beatIndex, isInnerCircle, mute = false, isFirstBeatOfBoth = false) => {
    if (!audioCtxRef.current || mute) return;
    const accents = isInnerCircle ? innerAccentsRef.current : outerAccentsRef.current;
    const accentValue = beatIndex < accents.length ? accents[beatIndex] : 1;
    if (accentValue === 0) return;
    let buffer = normalBufferRef.current;
    if (accentValue === 3) {
      buffer = firstBufferRef.current;
    } else if (accentValue === 2) {
      buffer = accentBufferRef.current;
    }
    if (!buffer) return;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volumeRef.current;
    source.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);
    if (beatIndex === 0 || isFirstBeatOfBoth) {
      const circleType = isInnerCircle ? 'INNER' : 'OUTER';
      console.log(`Scheduling ${circleType} FIRST BEAT at time ${time.toFixed(4)}s${isFirstBeatOfBoth ? ' (UNIFIED)' : ''}`);
    }
    const currentTime = audioCtxRef.current.currentTime;
    const safeTime = time < currentTime ? currentTime : time;
    source.start(safeTime);
    activeNodesRef.current.push({ source, gainNode });
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
      const index = activeNodesRef.current.findIndex(n => n.source === source);
      if (index !== -1) activeNodesRef.current.splice(index, 1);
    };
    const delayUntilBeat = Math.max(0, (safeTime - currentTime) * 1000);
    setTimeout(() => {
      if (!schedulerRunningRef.current) return;
      // Log first-beat playback only once for unified beats (log only for inner circle)
      if (beatIndex === 0 && (!isFirstBeatOfBoth || (isFirstBeatOfBoth && isInnerCircle))) {
        console.log(`PLAYED: FIRST BEAT at ${audioCtxRef.current.currentTime.toFixed(4)}s`);
      }
      if (isInnerCircle) {
        setInnerCurrentBeat(beatIndex);
        if (typeof onInnerBeatTriggered === 'function') onInnerBeatTriggered(beatIndex);
      } else {
        setOuterCurrentBeat(beatIndex);
        if (typeof onOuterBeatTriggered === 'function') onOuterBeatTriggered(beatIndex);
      }
    }, delayUntilBeat);
  }, [onInnerBeatTriggered, onOuterBeatTriggered]);

  /**
   * Schedule the unified first beat for both circles.
   * Sets the flag to avoid duplicate scheduling of beat 0 in the scheduler loop.
   */
  const scheduleUnifiedFirstBeat = useCallback((time, mute = false) => {
    console.log(`=== SCHEDULING UNIFIED FIRST BEAT at ${time.toFixed(4)}s ===`);
    firstBeatTriggeredRef.current = true;
    scheduleBeat(time, 0, true, mute, true);
    scheduleBeat(time, 0, false, mute, true);
    const delayUntilBeat = Math.max(0, (time - audioCtxRef.current.currentTime) * 1000);
    setTimeout(() => {
      if (!schedulerRunningRef.current) return;
      setInnerCurrentBeat(0);
      setOuterCurrentBeat(0);
      if (typeof onInnerBeatTriggered === 'function') onInnerBeatTriggered(0);
      if (typeof onOuterBeatTriggered === 'function') onOuterBeatTriggered(0);
    }, delayUntilBeat);
  }, [scheduleBeat, onInnerBeatTriggered, onOuterBeatTriggered]);

  /**
   * The main scheduler loop that repeatedly schedules beats.
   */
  const schedulerLoop = useCallback(() => {
    if (!audioCtxRef.current || !schedulerRunningRef.current) return;
    const now = audioCtxRef.current.currentTime;
    const { innerInterval, outerInterval, cycleDuration, commonCycleLCM } = getTimingInfo();
    const scheduleAheadTime = now + SCHEDULE_AHEAD_TIME;
    if (lastScheduleTimeRef.current >= scheduleAheadTime) return;
    const timeSinceStart = now - startTimeRef.current;
    const currentCycleStartTime = startTimeRef.current + (Math.floor(timeSinceStart / cycleDuration) * cycleDuration);
    const completedCycles = Math.floor(timeSinceStart / cycleDuration);
    if (currentCycleStartTime > currentCycleStartTimeRef.current) {
      console.log(`New polyrhythm cycle at ${now.toFixed(3)}s, cycle #${completedCycles}`);
      console.log(`Expected alignment: Inner beat ${(completedCycles * commonCycleLCM) % innerBeatsRef.current}, Outer beat ${(completedCycles * commonCycleLCM) % outerBeatsRef.current}`);
      currentCycleStartTimeRef.current = currentCycleStartTime;
      // Reset the first-beat flag and pointers for the new cycle.
      firstBeatTriggeredRef.current = false;
      nextInnerBeatRef.current = currentCycleStartTime;
      nextOuterBeatRef.current = currentCycleStartTime;
      if (!measureProcessedRef.current) {
        measureProcessedRef.current = true;
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
        if (tempoRef.current !== actualBpm) setActualBpm(tempoRef.current);
      }
    } else {
      measureProcessedRef.current = false;
    }
    const doMute = shouldMuteThisBeat({
      macroMode: macroModeRef.current,
      muteProbability,
      isSilencePhaseRef
    });
    const nextCycleStart = currentCycleStartTime + cycleDuration;
    const timeUntilNextCycle = nextCycleStart - now;
    // Only schedule the unified first beat once per cycle if the next cycle is not imminent (e.g., more than 20ms away)
    if (nextCycleStart < scheduleAheadTime && !firstBeatTriggeredRef.current && timeUntilNextCycle > 0.02) {
      scheduleUnifiedFirstBeat(nextCycleStart, doMute);
    }
    // Use a slightly relaxed threshold (0.01 s) to detect cycle start.
    const cycleStartThreshold = 0.01;
    while (nextInnerBeatRef.current < scheduleAheadTime) {
      const elapsedTime = nextInnerBeatRef.current - startTimeRef.current;
      const beatCount = Math.floor(elapsedTime / innerInterval);
      const beatIndex = beatCount % innerBeatsRef.current;
      const isCycleStart = Math.abs(nextInnerBeatRef.current - nextCycleStart) < cycleStartThreshold;
      if (isCycleStart && beatIndex === 0 && firstBeatTriggeredRef.current) {
        // Skip duplicate scheduling of the first beat.
      } else {
        if (beatIndex === 0) {
          console.log(`Scheduling inner first beat #${beatCount} at ${nextInnerBeatRef.current.toFixed(3)}s (beat index: ${beatIndex})`);
        }
        scheduleBeat(nextInnerBeatRef.current, beatIndex, true, doMute);
      }
      nextInnerBeatRef.current += innerInterval;
    }
    while (nextOuterBeatRef.current < scheduleAheadTime) {
      const elapsedTime = nextOuterBeatRef.current - startTimeRef.current;
      const beatCount = Math.floor(elapsedTime / outerInterval);
      const beatIndex = beatCount % outerBeatsRef.current;
      const isCycleStart = Math.abs(nextOuterBeatRef.current - nextCycleStart) < cycleStartThreshold;
      if (isCycleStart && beatIndex === 0 && firstBeatTriggeredRef.current) {
        // Skip duplicate scheduling of the first beat.
      } else {
        if (beatIndex === 0) {
          console.log(`Scheduling outer first beat #${beatCount} at ${nextOuterBeatRef.current.toFixed(3)}s (beat index: ${beatIndex})`);
        }
        scheduleBeat(nextOuterBeatRef.current, beatIndex, false, doMute);
      }
      nextOuterBeatRef.current += outerInterval;
    }
    lastScheduleTimeRef.current = scheduleAheadTime;
  }, [getTimingInfo, scheduleBeat, scheduleUnifiedFirstBeat, speedMode, measuresUntilMute, 
      muteDurationMeasures, muteProbability, measuresUntilSpeedUp, tempoIncreasePercent, actualBpm]);

  /**
   * Start the scheduler and begin playback.
   * The unified first beat is scheduled immediately using the current time.
   */
  const startScheduler = useCallback(async () => {
    if (schedulerRunningRef.current) return;
    try {
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
      const startDelay = 0; // Immediate playback
      startTimeRef.current = audioCtxRef.current.currentTime + startDelay;
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
UNIFIED FIRST BEAT: Both circles will trigger first beat immediately
========================================
      `);
      nextInnerBeatRef.current = startTimeRef.current;
      nextOuterBeatRef.current = startTimeRef.current;
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
      currentCycleStartTimeRef.current = startTimeRef.current;
      measureProcessedRef.current = false;
      lastScheduleTimeRef.current = 0;
      setInnerCurrentBeat(0);
      setOuterCurrentBeat(0);
      // Removed initial unified beat scheduling from startScheduler.
      // The scheduler loop will handle the unified first beat.
      schedulerRunningRef.current = true;
      lookaheadIntervalRef.current = setInterval(schedulerLoop, 25);
    } catch (err) {
      console.error('Error starting scheduler:', err);
    }
  }, [getTimingInfo, schedulerLoop, scheduleUnifiedFirstBeat]);

  /**
   * Stop the scheduler and all audio playback.
   */
  const stopScheduler = useCallback(() => {
    if (lookaheadIntervalRef.current) {
      clearInterval(lookaheadIntervalRef.current);
      lookaheadIntervalRef.current = null;
    }
    schedulerRunningRef.current = false;
    activeNodesRef.current.forEach(({ source, gainNode }) => {
      try {
        if (source.stop) source.stop(0);
        source.disconnect();
        gainNode.disconnect();
      } catch (e) {
        // ignore cleanup errors
      }
    });
    activeNodesRef.current = [];
    setInnerCurrentBeat(0);
    setOuterCurrentBeat(0);
  }, []);

  // Tap tempo and reloadSounds functions
  const tapTimesRef = useRef([]);
  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length < 2) return tempoRef.current;
    if (tapTimesRef.current.length > 4) {
      tapTimesRef.current = tapTimesRef.current.slice(-4);
    }
    let sum = 0, count = 0;
    for (let i = 1; i < tapTimesRef.current.length; i++) {
      const interval = tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      if (interval > 200 && interval < 2000) {
        sum += interval;
        count++;
      }
    }
    if (count > 0) {
      const avgMs = sum / count;
      const newTempo = Math.round(60000 / avgMs);
      const clampedTempo = Math.min(Math.max(newTempo, 30), 240);
      tempoRef.current = clampedTempo;
      setActualBpm(clampedTempo);
      return clampedTempo;
    }
    return tempoRef.current;
  }, []);

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

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused) {
      stopScheduler();
    } else {
      startScheduler();
    }
  }, [isPaused, startScheduler, stopScheduler]);

  useEffect(() => {
    if (!isPaused && schedulerRunningRef.current) {
      stopScheduler();
      setTimeout(() => {
        startScheduler();
      }, 50);
    }
  }, [innerBeats, outerBeats, isPaused, stopScheduler, startScheduler]);

  useEffect(() => {
    if (tempo !== tempoRef.current) {
      tempoRef.current = tempo;
      if (tempo !== actualBpm) setActualBpm(tempo);
    }
  }, [tempo, actualBpm]);

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
