import { useState, useEffect, useRef, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { SCHEDULE_AHEAD_TIME } from '../../../hooks/useMetronomeLogic/constants';
import { shouldMuteThisBeat } from '../../../hooks/useMetronomeLogic/trainingLogic';

// Import the animation sync utilities
import { scheduleAnimationUpdate } from './PolyrhythmLogic/animationSync';

// Add these constants at the top
const TEMPO_MIN = 15;
const TEMPO_MAX = 240;
const MAX_TAP_INTERVAL = 2000;
const MIN_TAPS_REQUIRED = 2;

// Animation timing constants
const ANIMATION_TIMING = {
  UI_RENDER_DELAY: 0.016,    // 16ms - typical React render cycle
  ANIMATION_DURATION: 0.04,  // 40ms - very short animation for beats
  PREDICTION_OFFSET: 0.02    // 20ms - less offset for tighter sync
};

/**
 * Enhanced Polyrhythm hook that properly aligns the first beats of both circles.
 * 
 * - Both circles share the same measure duration derived from the global tempo
 * - The first beat of every measure is synchronized for both circles
 * - Inner circle divides the measure into 'innerBeats' equal parts
 * - Outer circle divides the measure into 'outerBeats' equal parts
 * - This creates true polyrhythm with a common downbeat but different subdivisions
 */
export default function usePolyrhythmLogic({
  tempo,
  innerBeats,          // e.g., 4
  outerBeats,          // e.g., 3
  innerAccents = [],   // accent patterns for circle 1
  outerAccents = [],   // accent patterns for circle 2
  isPaused,
  volume,
  swing = 0,           // not strictly used here if you want
  // New parameter for sound swapping
  soundsSwapped = false,
  // training mode:
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2,
  // callbacks for UI
  onInnerBeatTriggered = null,
  onOuterBeatTriggered = null,
  setTempo // Add setTempo to the parameter list
}) {
  // Audio
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Scheduler state
  const schedulerRunningRef = useRef(false);
  const lookaheadIntervalRef = useRef(null);
  const isStartingOrStoppingRef = useRef(false);
  const activeNodesRef = useRef([]);

  // measure-based approach
  // Removing unused state variable while keeping the setter for functionality
  const [_, setCurrentMeasure] = useState(0); // eslint-disable-line no-unused-vars
  const measureStartTimeRef = useRef(0);
  const startTimeRef = useRef(0);

  // track which subdivision is "playing" in each circle, for UI
  const [innerCurrentSub, setInnerCurrentSub] = useState(0);
  const [outerCurrentSub, setOuterCurrentSub] = useState(0);

  // Refs for training mode
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);

  const [actualBpm, setActualBpm] = useState(tempo);

  // keep local references updated
  const tempoRef = useRef(tempo);
  const volumeRef = useRef(volume);
  const innerBeatsRef = useRef(innerBeats);
  const outerBeatsRef = useRef(outerBeats);
  const isPausedRef = useRef(isPaused);
  const innerAccentsRef = useRef(innerAccents);
  const outerAccentsRef = useRef(outerAccents);
  // Add ref for sound swapping state
  const soundsSwappedRef = useRef(soundsSwapped);

  // Update refs when props change
  useEffect(() => { 
    tempoRef.current = tempo; 
    // Make tempo globally available for beat indicator
    if (typeof window !== 'undefined') {
      window.currentTempo = tempo;
    }
  }, [tempo]);
  
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  
  useEffect(() => { 
    innerBeatsRef.current = innerBeats; 
    // Make innerBeats globally available for beat indicator
    if (typeof window !== 'undefined') {
      window.currentInnerBeats = innerBeats;
    }
  }, [innerBeats]);
  
  useEffect(() => { outerBeatsRef.current = outerBeats; }, [outerBeats]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { innerAccentsRef.current = innerAccents; }, [innerAccents]);
  useEffect(() => { outerAccentsRef.current = outerAccents; }, [outerAccents]);
  useEffect(() => { soundsSwappedRef.current = soundsSwapped; }, [soundsSwapped]);

  // Add tap tempo state
  const tapTimesRef = useRef([]);

  /**
   * Improved tap tempo handler that works for polyrhythm mode
   */
  const tapTempo = useCallback(() => {
    console.log("[POLYRHYTHM] Tap tempo called");
    const now = performance.now();
    
    // Reset if it's been too long since the last tap
    if (tapTimesRef.current.length > 0 && 
        now - tapTimesRef.current[tapTimesRef.current.length - 1] > MAX_TAP_INTERVAL) {
      console.log("[POLYRHYTHM] Interval too long, resetting taps");
      tapTimesRef.current = [];
    }
    
    // Add this tap time
    tapTimesRef.current.push(now);
    console.log(`[POLYRHYTHM] Tap recorded: ${tapTimesRef.current.length} total taps`);
    
    // Limit to last 5 taps for better accuracy
    if (tapTimesRef.current.length > 5) {
      tapTimesRef.current.shift();
    }
    
    // Calculate tempo if we have enough taps
    if (tapTimesRef.current.length >= MIN_TAPS_REQUIRED) {
      // Calculate intervals between taps
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        const interval = tapTimesRef.current[i] - tapTimesRef.current[i - 1];
        intervals.push(interval);
        console.log(`[POLYRHYTHM] Interval ${i}: ${Math.round(interval)}ms`);
      }
      
      // Average the intervals
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      console.log(`[POLYRHYTHM] Average interval: ${Math.round(avgInterval)}ms`);
      
      // Convert to BPM and clamp to valid range
      const rawTempo = Math.round(60000 / avgInterval);
      const newTempo = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, rawTempo));
      
      console.log(`[POLYRHYTHM] Setting tempo to ${newTempo} BPM`);
      
      // Update tempo both locally and in parent component
      tempoRef.current = newTempo;
      if (setTempo) {
        setTempo(newTempo);
      }
      
      // Also dispatch a global event for additional integration
      window.dispatchEvent(new CustomEvent('metronome-set-tempo', {
        detail: { tempo: newTempo }
      }));
      
      return newTempo;
    }
    
    console.log(`[POLYRHYTHM] Need ${MIN_TAPS_REQUIRED - tapTimesRef.current.length} more tap(s)`);
    return null;
  }, [setTempo]);

  /**
   * Ensure training state changes are properly propagated to UI
   */
  const syncTrainingState = useCallback(() => {
    // Make silence phase ref globally available
    if (typeof window !== 'undefined') {
      window.isSilencePhaseRef = isSilencePhaseRef;
    }
    
    // Dispatch events for training container to detect state changes
    window.dispatchEvent(new CustomEvent('training-measure-update', {
      detail: {
        measureCount: measureCountRef.current,
        muteMeasureCount: muteMeasureCountRef.current,
        isSilencePhase: isSilencePhaseRef.current,
        timestamp: Date.now()
      }
    }));

    // Also dispatch document-level event for components that might be listening there
    document.dispatchEvent(new CustomEvent('training-state-changed', {
      bubbles: true,
      detail: {
        measureCount: measureCountRef.current,
        muteMeasureCount: muteMeasureCountRef.current,
        isSilencePhase: isSilencePhaseRef.current,
        timestamp: Date.now()
      }
    }));
  }, [isSilencePhaseRef, measureCountRef, muteMeasureCountRef]);

  // --------------------------------------------
  // load audio on mount
  // --------------------------------------------
  useEffect(() => {
    const ctx = initAudioContext();
    audioCtxRef.current = ctx;

    const load = async () => {
      try {
        const set = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx: ctx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet: set
        });
      } catch {
        // fallback
        await loadClickBuffers({
          audioCtx: ctx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
      }
    };
    load();

    return () => {
      stopScheduler();
      
      // Clean up audio context
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------
  // Calculate measure duration based on global tempo with precise LCM calculations
  // Optimized for complex polyrhythms like 8:9
  // --------------------------------------------
  const getMeasureDuration = useCallback(() => {
    // For polyrhythms, we need to use a mathematically precise measure duration
    // based on the global tempo and the least common multiple (LCM) of both beat counts
    const secondsPerBeat = 60 / tempoRef.current;
    
    // Helper function to find greatest common divisor (GCD) with more precision for large numbers
    const gcd = (a, b) => {
      a = Math.abs(a);
      b = Math.abs(b);
      
      if (b > a) {
        [a, b] = [b, a];
      }
      
      while (b > 0) {
        const temp = b;
        b = a % b;
        a = temp;
      }
      
      return a;
    };
    
    // Helper function to find least common multiple (LCM) with precision safeguards
    const lcm = (a, b) => {
      if (a === 0 || b === 0) return 0;
      return Math.abs(a * b) / gcd(a, b);
    };
    
    // Calculate LCM of inner and outer beats
    const inner = innerBeatsRef.current;
    const outer = outerBeatsRef.current;
    
    // Special handling for complex ratios like 8:9
    // For certain ratios that might cause floating point precision issues
    if ((inner === 8 && outer === 9) || (inner === 9 && outer === 8)) {
      // For 8:9 specifically, we know LCM = 72
      const cycleLCM = 72;
      
      // For 8:9, we want to use innerBeats tempo as the base
      // This ensures the visual indicator matches the audio perfectly
      const duration = (inner * secondsPerBeat);
      
      console.log(`Special polyrhythm 8:9 handling: ${inner}:${outer}, LCM=${cycleLCM}, duration=${duration.toFixed(6)}s`);
      return duration;
    }
    
    // Normal calculation for other ratios
    const cycleLCM = lcm(inner, outer);
    
    // For better precision in complex polyrhythms, we ensure the measure duration
    // is based on the inner circle beats, which our indicator follows
    const duration = inner * secondsPerBeat;
    
    console.log(`Polyrhythm precision: ${inner}:${outer}, LCM=${cycleLCM}, duration=${duration.toFixed(6)}s`);
    
    return duration;
  }, []);

  // Cache previously scheduled hits to avoid duplicates
  const lastHitTimeRef = useRef({
    inner: {},
    outer: {}
  });

  // --------------------------------------------
  // Schedule a single audio hit
  // --------------------------------------------
  const scheduleHit = useCallback((when, subIndex, circle, accentsArray) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !schedulerRunningRef.current) return 'no-audio-ctx'; // Skip if scheduler is no longer running

    // Check for silence mode BEFORE scheduling any sound
    const shouldMute = shouldMuteThisBeat({
      macroMode,
      muteProbability,
      isSilencePhaseRef
    });
    
    if (shouldMute) {
      // Still dispatch a UI event for animation during silence
      window.dispatchEvent(new CustomEvent('silent-beat-played', {
        detail: {
          timestamp: performance.now(),
          subIndex,
          circle,
          when
        }
      }));
      return 'muted';
    }

    // Capture currentTime *once* at the start
    const now = ctx.currentTime;

    // IMPROVEMENT: Higher precision rounding (microsecond)
    const safeTime = Math.round(when * 1000000) / 1000000;
    
    // Ensure we don't schedule in the past
    if (safeTime <= now) {
      // IMPROVEMENT: Smaller adjustment for tighter timing
      const adjustedTime = now + 0.001; 
      console.warn(`Had to adjust scheduling time for ${circle} beat ${subIndex} - was in the past`);
      return scheduleHit(adjustedTime, subIndex, circle, accentsArray);
    }
    
    // IMPROVEMENT: Prevent duplicate hits that are too close together (timing conflict resolution)
    const circleCache = lastHitTimeRef.current[circle];
    if (circleCache[subIndex] && Math.abs(safeTime - circleCache[subIndex]) < 0.05) {
      console.log(`Skipping duplicate ${circle} hit for subIndex=${subIndex} (too close to previous)`);
      return 'duplicate';
    }
    
    // Update our timestamp cache
    circleCache[subIndex] = safeTime;

    // Identify correct accent array (inner vs. outer)
    const accents = accentsArray || [];
    if (!Array.isArray(accents)) {
      console.warn(`No valid accents array for ${circle} circle.`);
      return 'no-accents';
    }
  
    // Determine accent for this subdivision: 0=muted, 1=normal, 2=accent, 3=first
    const accentValue = subIndex < accents.length ? accents[subIndex] : 1;
    if (accentValue === 0) {
      // A beat that is explicitly muted in the accent pattern
      return 'accent-muted';
    }
  
    // Pick the right buffer
    let buffer = normalBufferRef.current;
    if (accentValue === 3) buffer = firstBufferRef.current;
    else if (accentValue === 2) buffer = accentBufferRef.current;
    else if (accentValue === 1) buffer = normalBufferRef.current;
    
    if (!buffer) {
      console.error('No buffer available for this accentValue:', accentValue);
      return 'no-buffer';
    }
  
    // Create and configure audio nodes
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    
    // IMPROVEMENT: Apply slight ramp to avoid clicks
    gainNode.gain.setValueAtTime(0, safeTime);
    gainNode.gain.linearRampToValueAtTime(volumeRef.current, safeTime + 0.005);
    
    // FIXED CODE: Circle positions should always have the same sounds regardless of swap
    // Only modify non-first beats (accentValue !== 3)
    if (accentValue !== 3) {
      if (circle === 'inner') {
        source.detune.value = 300; // Inner circle always has higher pitch (300)
      } else if (circle === 'outer') {
        source.detune.value = -100; // Outer circle always has lower pitch (-100)
      }
    }
    
    // Connect the audio nodes
    source.connect(gainNode).connect(ctx.destination);

    try {
      source.start(safeTime);
    } catch (err) {
      console.error(`Error starting audio at time ${safeTime}:`, err);
      return 'start-error';
    }
    
    // Track active nodes for cleanup
    activeNodesRef.current.push({ source, gainNode });
    
    // Clean up when sound finishes
    source.onended = () => {
      try { 
        source.disconnect(); 
        gainNode.disconnect();
        
        // Remove from active nodes
        const idx = activeNodesRef.current.findIndex(n => n.source === source);
        if (idx !== -1) {
          activeNodesRef.current.splice(idx, 1);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };

    // Add detailed logging for debugging
    if (subIndex === 0) {
      // For first beats, log measure start
      console.log(`${circle.toUpperCase()} measure start => subIndex=${subIndex}, time=${safeTime.toFixed(3)}`);
    } else {
      // For other beats, just log basic info
      console.log(`${circle.toUpperCase()} beat ${subIndex} scheduled at ${safeTime.toFixed(3)}`);
    }

    // NEW: Use improved animation timing calculation
    scheduleAnimationUpdate({
      audioTime: safeTime,
      audioCtx: ctx,
      beatIndex: subIndex,
      isInnerCircle: circle === 'inner',
      setInnerCurrentSubFn: setInnerCurrentSub,
      setOuterCurrentSubFn: setOuterCurrentSub,
      onInnerBeatTriggeredFn: onInnerBeatTriggered,
      onOuterBeatTriggeredFn: onOuterBeatTriggered,
      uiAnimationDuration: ANIMATION_TIMING.ANIMATION_DURATION
    });

    return 'scheduled';
  }, [
    macroMode, 
    muteProbability, 
    isSilencePhaseRef,
    onInnerBeatTriggered,
    onOuterBeatTriggered
  ]);

  /**
   * Handle logic at measure boundaries (muting, tempo increases)
   */
  const handleMeasureBoundary = useCallback(() => {
    // Increment the measure counter
    measureCountRef.current++;
    
    console.log(`[Training] Measure count: ${measureCountRef.current}/${measuresUntilMute}, speedMode=${speedMode}`);
    
    // Macro Timing Mode - Handle silence phase
    if (macroMode === 1) {
      if (!isSilencePhaseRef.current) {
        // Check if we should enter silence phase
        if (measureCountRef.current >= measuresUntilMute) {
          console.log(`[Training] 🔇 STARTING SILENCE PHASE 🔇`);
          isSilencePhaseRef.current = true;
          muteMeasureCountRef.current = 0;
          
          // Make sure the global silence reference is updated
          window.isSilencePhaseRef = isSilencePhaseRef;
          
          // Sync state to UI immediately for this significant change
          syncTrainingState();
        }
      } else {
        // Already in silence phase, increment counter
        muteMeasureCountRef.current++;
        
        console.log(`[Training] Silence phase: ${muteMeasureCountRef.current}/${muteDurationMeasures}`);
        
        // Check if we should exit silence phase
        if (muteMeasureCountRef.current >= muteDurationMeasures) {
          console.log(`[Training] 🔊 ENDING SILENCE PHASE 🔊`);
          isSilencePhaseRef.current = false;
          window.isSilencePhaseRef = isSilencePhaseRef;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0; // Reset measure count after silence ends
          
          // Sync state to UI immediately for this significant change
          syncTrainingState();
        }
      }
    }
    
    // Speed Training Mode - Handle auto tempo increase
    if (speedMode === 1 && !isSilencePhaseRef.current) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        // Calculate new tempo with percentage increase
        const factor = 1 + tempoIncreasePercent / 100;
        const newTempo = Math.min(Math.round(tempoRef.current * factor), 240);
        
        // Only increase if it would change by at least 1 BPM
        if (newTempo > tempoRef.current) {
          console.log(`⏩ AUTO INCREASING TEMPO from ${tempoRef.current} to ${newTempo} BPM (${tempoIncreasePercent}%)`);
          
          // Set new tempo
          setActualBpm(newTempo);
          tempoRef.current = newTempo;
          
          // Ensure parent component knows about tempo change
          window.dispatchEvent(new CustomEvent('metronome-set-tempo', {
            detail: { tempo: newTempo }
          }));
          
          // Reset measure counter after tempo increase
          measureCountRef.current = 0;
          
          // Sync state to UI immediately for this significant change
          syncTrainingState();
        }
      }
    }

    // Regular sync for normal measure boundaries
    syncTrainingState();

    return true; // Continue scheduler
  }, [
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    syncTrainingState
  ]);

  // --------------------------------------------
  // Schedule one complete measure with both circles' beats
  // --------------------------------------------
  const scheduleOneMeasure = useCallback((measureIndex, measureStartTime) => {
    if (!schedulerRunningRef.current) return;

    const measureDuration = getMeasureDuration();
    console.log(`Scheduling measure #${measureIndex}, innerBeats=${innerBeatsRef.current}, outerBeats=${outerBeatsRef.current}`);

    // Get the mute status for this measure before scheduling anything
    const shouldMuteThisMeasure = shouldMuteThisBeat({
      macroMode,
      muteProbability,
      isSilencePhaseRef
    });

    // Schedule first beats for both circles at EXACTLY the same time
    // This is the most critical part for polyrhythms - the synchronized downbeat
    const firstBeatTime = measureStartTime;
    
    console.log(`UNIFIED DOWNBEAT: Scheduling both first beats at exactly ${firstBeatTime.toFixed(6)}`);
    
    // To ensure maximum precision, calculate both times once
    const now = audioCtxRef.current.currentTime;
    let safeFirstBeatTime = firstBeatTime;
    
    // Safety check to avoid scheduling in the past
    if (safeFirstBeatTime <= now) {
      safeFirstBeatTime = now + 0.002; // small buffer
      console.warn(`Had to adjust first beat time - was in the past`);
    }
    
    // Schedule both first beats with identical timestamps if not muted
    if (!shouldMuteThisMeasure) {
      // Inner circle first beat
      scheduleHit(
        safeFirstBeatTime,
        0,
        'inner',
        innerAccentsRef.current
      );
      
      // Outer circle first beat (using identical timestamp)
      scheduleHit(
        safeFirstBeatTime,
        0,
        'outer',
        outerAccentsRef.current
      );
    } else {
      // Dispatch events for UI animation during silence (first beats)
      window.dispatchEvent(new CustomEvent('silent-beat-played', {
        detail: {
          timestamp: performance.now(),
          subIndex: 0,
          circle: 'both',
          when: safeFirstBeatTime
        }
      }));
    }
    
    // Now schedule the remaining beats for inner circle
    for (let i = 1; i < innerBeatsRef.current; i++) {
      // Calculate precise timing for each subdivision
      const beatTime = measureStartTime + i * (measureDuration / innerBeatsRef.current);
      
      scheduleHit(
        beatTime, 
        i, 
        'inner',
        innerAccentsRef.current
      );
    }

    // Schedule remaining beats for outer circle
    for (let j = 1; j < outerBeatsRef.current; j++) {
      // Calculate precise timing for each subdivision
      const beatTime = measureStartTime + j * (measureDuration / outerBeatsRef.current);
      
      scheduleHit(
        beatTime,
        j,
        'outer',
        outerAccentsRef.current
      );
    }

    // Handle training mode boundaries at measure transitions
    handleMeasureBoundary();
  }, [
    getMeasureDuration,
    scheduleHit,
    macroMode,
    muteProbability,
    isSilencePhaseRef,
    handleMeasureBoundary
  ]);

  // Track last scheduled measure to ensure sequential scheduling
  const lastScheduledMeasureRef = useRef(-1);

  // --------------------------------------------
  // Main scheduling loop - continuously schedules upcoming measures
  // --------------------------------------------
  const schedulingLoop = useCallback(() => {
    if (!audioCtxRef.current || !schedulerRunningRef.current) return;
    
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const measureDuration = getMeasureDuration();
    
    // Look ahead window for scheduling
    const scheduleAhead = now + SCHEDULE_AHEAD_TIME;
    
    // Calculate the next measure to schedule
    const nextMeasureToSchedule = lastScheduledMeasureRef.current + 1;
    
    // Calculate when this measure should start
    const nextMeasureStart = startTimeRef.current + nextMeasureToSchedule * measureDuration;
    
    // Schedule this measure if it falls within our lookahead window
    if (nextMeasureStart < scheduleAhead) {
      console.log(`Scheduling measure #${nextMeasureToSchedule} at ${nextMeasureStart.toFixed(3)}`);
      
      // Update our tracking reference
      lastScheduledMeasureRef.current = nextMeasureToSchedule;
      
      // Schedule all beats for this measure
      scheduleOneMeasure(nextMeasureToSchedule, nextMeasureStart);
      
      // Update UI state
      setCurrentMeasure(prev => Math.max(prev, nextMeasureToSchedule + 1));
    }
  }, [getMeasureDuration, scheduleOneMeasure]);

  // --------------------------------------------
  // Stop all scheduled beats and clean up
  // --------------------------------------------
  const stopScheduler = useCallback(() => {
    if (isStartingOrStoppingRef.current || !schedulerRunningRef.current) return;
    
    isStartingOrStoppingRef.current = true;
    
    try {
      // Stop the lookahead interval
      if (lookaheadIntervalRef.current) {
        clearInterval(lookaheadIntervalRef.current);
        lookaheadIntervalRef.current = null;
      }
      
      // Update scheduler state
      schedulerRunningRef.current = false;
      
      // Stop all currently playing sounds with a small fadeout to avoid clicks
      activeNodesRef.current.forEach(({ source, gainNode }) => {
        try {
          // Apply a quick fade out to avoid clicks
          const now = audioCtxRef.current?.currentTime || 0;
          gainNode.gain.setValueAtTime(gainNode.gain.value, now);
          gainNode.gain.linearRampToValueAtTime(0, now + 0.03);
          
          // Schedule actual stop slightly after fade
          setTimeout(() => {
            try {
              source.stop();
              source.disconnect();
              gainNode.disconnect();
            } catch (err) {
              // Ignore errors, nodes might already be disconnected
            }
          }, 35);
        } catch (err) {
          // Ignore errors, nodes might already be disconnected
        }
      });
      
      // Clear active nodes
      activeNodesRef.current = [];
      
      // Make sure UI shows current state when stopping
      syncTrainingState();
      
      console.log("[PolyrhythmU] stopped scheduler");
    } finally {
      isStartingOrStoppingRef.current = false;
    }
  }, [syncTrainingState]);
  
  // --------------------------------------------
  // Start the scheduler and begin playing
  // --------------------------------------------
  const startScheduler = useCallback(async () => {
    if (isStartingOrStoppingRef.current || schedulerRunningRef.current) return;
    
    isStartingOrStoppingRef.current = true;
    
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) {
        isStartingOrStoppingRef.current = false;
        return;
      }
      
      // Resume audio context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Ensure audio buffers are loaded
      if (!normalBufferRef.current || !accentBufferRef.current || !firstBufferRef.current) {
        try {
          const set = await getActiveSoundSet();
          await loadClickBuffers({
            audioCtx: ctx,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef,
            soundSet: set
          });
        } catch (err) {
          // Fallback to default sounds
          await loadClickBuffers({
            audioCtx: ctx,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef
          });
        }
      }

      // Reset all state for a clean start
      schedulerRunningRef.current = true;
      setCurrentMeasure(0);
      
      // Reset training mode counters when starting
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
      window.isSilencePhaseRef = isSilencePhaseRef;
      syncTrainingState(); // Initial sync to ensure UI is updated
      
      // Reset beat scheduling cache
      lastHitTimeRef.current = { inner: {}, outer: {} };
      
      // Reset measure tracking
      lastScheduledMeasureRef.current = -1;
      
      // IMPROVEMENT: Clear any active audio nodes to prevent overlapping sounds
      activeNodesRef.current.forEach(({ source, gainNode }) => {
        try {
          source.stop();
          source.disconnect();
          gainNode.disconnect();
        } catch (err) {
          // Ignore errors during cleanup
        }
      });
      activeNodesRef.current = [];

      // Set starting time with a small offset for a clean start
      // IMPROVEMENT: Increased buffer time from 0.1s to 0.2s for smoother starts
      const now = ctx.currentTime;
      startTimeRef.current = now + 0.2;
      measureStartTimeRef.current = startTimeRef.current;
      
      // Clear any existing interval
      if (lookaheadIntervalRef.current) {
        clearInterval(lookaheadIntervalRef.current);
      }
      
      // Start the scheduling loop
      lookaheadIntervalRef.current = setInterval(() => {
        schedulingLoop();
      }, 20); // 20ms interval for precise timing

      console.log(`[PolyrhythmU] started at audioCtxTime=${now.toFixed(3)}, first measure at ${startTimeRef.current.toFixed(3)}`);
    } catch (err) {
      console.error("Error starting polyrhythm scheduler:", err);
    } finally {
      isStartingOrStoppingRef.current = false;
    }
  }, [schedulingLoop, syncTrainingState]); // Fix: Removed stopScheduler from dependencies

  // When beat counts change, we need to properly reset scheduling
  useEffect(() => {
    if (schedulerRunningRef.current && !isPausedRef.current) {
      // Store the current state
      const wasRunning = schedulerRunningRef.current;
      
      // Stop current scheduler cleanly
      stopScheduler();
      
      // Reset timing references
      lastHitTimeRef.current = { inner: {}, outer: {} };
      lastScheduledMeasureRef.current = -1;
      
      // Brief delay to ensure clean state
      setTimeout(() => {
        if (wasRunning) {
          startScheduler();
        }
      }, 50);
    }
  }, [innerBeats, outerBeats, stopScheduler, startScheduler]);

  // Respond to isPaused changes
  useEffect(() => {
    if (!audioCtxRef.current) return;
    
    const timer = setTimeout(() => {
      if (isPaused) {
        stopScheduler();
        audioCtxRef.current.suspend().catch(()=>{});
      } else {
        audioCtxRef.current.resume()
          .then(()=>startScheduler())
          .catch(()=>{});
      }
    }, 10); // Small debounce for state changes
    
    return () => clearTimeout(timer);
  }, [isPaused, startScheduler, stopScheduler]);

  // Handle tempo changes while playing
  const tempoChangeTimeoutRef = useRef(null);
  
  useEffect(() => {
    // Only handle tempo changes when playing
    if (!isPaused && schedulerRunningRef.current) {
      // Debounce tempo changes
      if (tempoChangeTimeoutRef.current) {
        clearTimeout(tempoChangeTimeoutRef.current);
      }
      
      tempoChangeTimeoutRef.current = setTimeout(() => {
        stopScheduler();
        
        // Short delay before restart
        setTimeout(() => {
          if (!isPausedRef.current) startScheduler();
          tempoChangeTimeoutRef.current = null;
        }, 50);
      }, 100); // 100ms debounce
    }
    
    return () => {
      if (tempoChangeTimeoutRef.current) {
        clearTimeout(tempoChangeTimeoutRef.current);
        tempoChangeTimeoutRef.current = null;
      }
    };
  }, [tempo, isPaused, startScheduler, stopScheduler]);
    
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Call stopScheduler directly instead of using it as a dependency
      if (schedulerRunningRef.current) {
        // Inline the necessary parts of stopScheduler to avoid the dependency
        if (lookaheadIntervalRef.current) {
          clearInterval(lookaheadIntervalRef.current);
          lookaheadIntervalRef.current = null;
        }
        
        schedulerRunningRef.current = false;
      }
      
      // Stop and disconnect all audio nodes
      activeNodesRef.current.forEach(({ source, gainNode }) => {
        try {
          source.stop();
          source.disconnect();
          gainNode.disconnect();
        } catch (err) {
          // Ignore errors during cleanup
        }
      });
      
      activeNodesRef.current = [];
    };
  }, []); // Fix: Removed unnecessary eslint-disable comment as it's no longer needed

  // When sound swapping state changes while playing, we need to restart
  useEffect(() => {
    if (schedulerRunningRef.current && !isPausedRef.current) {
      // Store the current state
      const wasRunning = schedulerRunningRef.current;
      
      // Stop current scheduler cleanly
      stopScheduler();
      
      // Brief delay to ensure clean state
      setTimeout(() => {
        if (wasRunning) {
          startScheduler();
        }
      }, 50);
    }
  }, [soundsSwapped, stopScheduler, startScheduler]);

  // Add this effect to properly integrate with the parent's training container refs
  useEffect(() => {
    // If parent component provides training refs through props, sync with them
    if (typeof window !== 'undefined') {
      // Update the global reference
      window.isSilencePhaseRef = isSilencePhaseRef;
      
      // Add polling interval for robust state synchronization
      const syncInterval = setInterval(() => {
        syncTrainingState();
      }, 300);
      
      return () => {
        clearInterval(syncInterval);
      };
    }
  }, [syncTrainingState]);

  /**
   * Utility function to reload sounds
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
    } catch (err) {
      console.error("Error reloading sounds:", err);
      try {
        // Fallback to default sounds
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
        return true;
      } catch (fallbackErr) {
        console.error("Failed to load fallback sounds:", fallbackErr);
        return false;
      }
    }
  }, []);

  // --------------------------------------------
  // Expose public API
  // --------------------------------------------
  return {
    // UI states
    innerCurrentSubdivision: innerCurrentSub,
    outerCurrentSubdivision: outerCurrentSub,
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    actualBpm,

    // Sound reload utility
    reloadSounds,
    
    // Audio context and controls
    audioCtx: audioCtxRef.current,
    startScheduler,
    stopScheduler,
    tapTempo // Now returning the implemented tapTempo function
  };
}