import { useState, useEffect, useRef, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { SCHEDULE_AHEAD_TIME } from '../../../hooks/useMetronomeLogic/constants';
import { shouldMuteThisBeat, handleMeasureBoundary } from '../../../hooks/useMetronomeLogic/trainingLogic';

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
  onOuterBeatTriggered = null
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
  const [currentMeasure, setCurrentMeasure] = useState(0);
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

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { innerBeatsRef.current = innerBeats; }, [innerBeats]);
  useEffect(() => { outerBeatsRef.current = outerBeats; }, [outerBeats]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { innerAccentsRef.current = innerAccents; }, [innerAccents]);
  useEffect(() => { outerAccentsRef.current = outerAccents; }, [outerAccents]);

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
  // Calculate measure duration based on global tempo
  // --------------------------------------------
  const getMeasureDuration = useCallback(() => {
    // For polyrhythms, we need to use a mathematically precise measure duration
    // based on the global tempo and the least common multiple (LCM) of both beat counts
    const secondsPerBeat = 60 / tempoRef.current;
    
    // Helper function to find greatest common divisor (GCD)
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    
    // Helper function to find least common multiple (LCM)
    const lcm = (a, b) => (a * b) / gcd(a, b);
    
    // Calculate LCM of inner and outer beats
    const cycleLCM = lcm(innerBeatsRef.current, outerBeatsRef.current);
    
    // Calculate how many "global beats" it takes to complete one full polyrhythm cycle
    // This ensures that both patterns perfectly align after exactly one measure
    const beatsPerMeasure = Math.max(
      innerBeatsRef.current, 
      outerBeatsRef.current
    );
    
    // For additional precision, we can use the LCM approach instead
    // const beatsPerMeasure = cycleLCM / Math.min(innerBeatsRef.current, outerBeatsRef.current);
    
    // The measure duration in seconds
    const duration = beatsPerMeasure * secondsPerBeat;
    
    console.log(`Polyrhythm precision: ${innerBeatsRef.current}:${outerBeatsRef.current}, LCM=${cycleLCM}, duration=${duration.toFixed(6)}s`);
    
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
    if (!ctx || !schedulerRunningRef.current) return; // Skip if scheduler is no longer running

    const now = ctx.currentTime;
    let safeTime = when;
    
    // IMPROVEMENT: Higher precision rounding (microsecond)
    safeTime = Math.round(safeTime * 1000000) / 1000000;
    
    // Ensure we don't schedule in the past
    if (safeTime <= now) {
      // IMPROVEMENT: Smaller adjustment for tighter timing
      safeTime = now + 0.001; 
      console.warn(`Had to adjust scheduling time for ${circle} beat ${subIndex} - was in the past`);
    }
    
    // IMPROVEMENT: Prevent duplicate hits that are too close together (timing conflict resolution)
    const circleCache = lastHitTimeRef.current[circle];
    if (circleCache[subIndex] && Math.abs(safeTime - circleCache[subIndex]) < 0.05) {
      console.log(`Skipping duplicate ${circle} hit for subIndex=${subIndex} (too close to previous)`);
      return;
    }
    
    // Update our timestamp cache
    circleCache[subIndex] = safeTime;

    // Determine accent level
    const accentVal = (accentsArray && accentsArray[subIndex]) || 1;
    if (accentVal === 0) return; // muted beat

    // Choose buffer based on accent value
    let chosenBuf = normalBufferRef.current;
    if (accentVal === 3) {
      chosenBuf = firstBufferRef.current; // First beat sound
    } else if (accentVal === 2) {
      chosenBuf = accentBufferRef.current; // Accent sound
    }
    
    if (!chosenBuf) return;

    // Create and configure audio nodes
    const source = ctx.createBufferSource();
    source.buffer = chosenBuf;

    const gainNode = ctx.createGain();
    
    // IMPROVEMENT: Apply slight ramp to avoid clicks
    gainNode.gain.setValueAtTime(0, safeTime);
    gainNode.gain.linearRampToValueAtTime(volumeRef.current, safeTime + 0.005);
    
    // Connect the audio nodes
    source.connect(gainNode).connect(ctx.destination);

    try {
      source.start(safeTime);
    } catch (err) {
      console.error(`Error starting audio at time ${safeTime}:`, err);
      return;
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

    // Schedule UI update callback
    const delayMs = Math.max(0, (safeTime - now) * 1000);
    setTimeout(() => {
      if (!schedulerRunningRef.current) return;
      
      // Update UI state based on which circle triggered
      if (circle === 'inner') {
        setInnerCurrentSub(subIndex);
        onInnerBeatTriggered?.(subIndex);
      } else {
        setOuterCurrentSub(subIndex);
        onOuterBeatTriggered?.(subIndex);
      }
    }, delayMs);

  }, [onInnerBeatTriggered, onOuterBeatTriggered]);

  // --------------------------------------------
  // Schedule one complete measure with both circles' beats
  // --------------------------------------------
  const scheduleOneMeasure = useCallback((measureIndex, measureStartTime) => {
    if (!schedulerRunningRef.current) return;

    const measureDuration = getMeasureDuration();
    console.log(`Scheduling measure #${measureIndex}, innerBeats=${innerBeatsRef.current}, outerBeats=${outerBeatsRef.current}`);

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
    
    // Schedule both first beats with identical timestamps
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
    
    // Now schedule the remaining beats for inner circle
    for (let i = 1; i < innerBeatsRef.current; i++) {
      const doMute = shouldMuteThisBeat({
        macroMode,
        muteProbability,
        isSilencePhaseRef
      });
      
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
      const doMute = shouldMuteThisBeat({
        macroMode,
        muteProbability,
        isSilencePhaseRef
      });
      
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
    handleMeasureBoundary({
      measureCountRef,
      muteMeasureCountRef,
      isSilencePhaseRef,
      macroMode,
      speedMode,
      measuresUntilMute,
      muteDurationMeasures,
      muteProbability,
      tempoRef,
      measuresUntilSpeedUp,
      tempoIncreasePercent,
      setTempo: (t) => setActualBpm(t),
    });
  }, [
    getMeasureDuration,
    scheduleHit,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    measuresUntilSpeedUp,
    tempoIncreasePercent
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
      
      console.log("[PolyrhythmU] stopped scheduler");
    } finally {
      isStartingOrStoppingRef.current = false;
    }
  }, []);
  
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
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
      
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
  }, [schedulingLoop, stopScheduler]);

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
      }
    };
  }, [tempo, isPaused, startScheduler, stopScheduler]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScheduler();
      
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
  }, [stopScheduler]);

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
    reloadSounds: async () => {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state==='closed') {
          audioCtxRef.current = initAudioContext();
        }
        const s = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet: s
        });
        return true;
      } catch (err) {
        console.error("Error reloading sounds:", err);
        return false;
      }
    },
    
    // Audio context and controls
    audioCtx: audioCtxRef.current,
    startScheduler,
    stopScheduler,
    tapTempo: () => {} // Placeholder - you can implement tap tempo if needed
  };
}