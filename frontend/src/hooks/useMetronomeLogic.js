// File: src/hooks/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

let globalAudioCtx = null;
const TEMPO_MIN = 15;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // 50 ms lookahead

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
  multiCircleMode = false // New flag to indicate multi circle mode
}) {
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const [actualBpm, setActualBpm] = useState(0);

  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const lookaheadRef = useRef(null);
  const schedulerRunningRef = useRef(false);
  const playedBeatTimesRef = useRef([]);

  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const subdivisionsRef = useRef(subdivisions);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);

  const accentsRef = useRef(accents);
  useEffect(() => { accentsRef.current = accents; }, [accents]);

  const beatConfigRef = useRef(null);
  useEffect(() => {
    if (gridMode) {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      }
    } else {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      }
    }
  }, [beatConfig, subdivisions, gridMode]);

  const measureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const muteMeasureCountRef = useRef(0);

  const handleEndOfMeasure = useCallback(() => {
    measureCountRef.current += 1;
    if (macroMode === 1) {
      if (!isSilencePhaseRef.current) {
        if (measureCountRef.current >= measuresUntilMute) {
          isSilencePhaseRef.current = true;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0;
        }
      } else {
        muteMeasureCountRef.current += 1;
        if (muteMeasureCountRef.current >= muteDurationMeasures) {
          isSilencePhaseRef.current = false;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0;
        }
      }
    } else if (macroMode === 2) {
      // random silence logic if needed
    }
    if (speedMode === 1) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        setTempo(prev => Math.min(Math.round(prev * factor), TEMPO_MAX));
        measureCountRef.current = 0;
      }
    }
  }, [macroMode, speedMode, measuresUntilMute, muteDurationMeasures, measuresUntilSpeedUp, tempoIncreasePercent, setTempo]);

  const shouldMuteThisBeat = useCallback((subIndex) => {
    if (macroMode === 1 && isSilencePhaseRef.current) return true;
    if (macroMode === 2) return Math.random() < muteProbability;
    return false;
  }, [macroMode, muteProbability]);

  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
      schedulerRunningRef.current = false;
    }
  }, []);

  const schedulePlay = useCallback((buffer, when) => {
    if (!buffer || !audioCtxRef.current) return;
    
    // Get current time for validation
    const now = audioCtxRef.current.currentTime;
    
    // Ensure the scheduled time is in the future
    if (when <= now) {
      console.log(`[useMetronomeLogic] Warning: Attempted to schedule sound in the past. Adjusting time from ${when} to ${now + 0.01}`);
      when = now + 0.01; // Ensure at least 10ms in the future
    }
    
    // Create a new buffer source for this sound
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    
    // Create a gain node to control volume
    const gainNode = audioCtxRef.current.createGain();
    
    // Apply volume with a slight ramp to avoid clicks
    gainNode.gain.setValueAtTime(0, when - 0.005);
    gainNode.gain.linearRampToValueAtTime(volumeRef.current, when);
    
    // Connect the source to the gain node and then to the output
    source.connect(gainNode).connect(audioCtxRef.current.destination);
    
    // Start the sound at the precise scheduled time
    source.start(when);
    
    // Add error handling
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
    
    // Return the source in case we need to stop it later
    return source;
  }, []);

  const updateActualBpm = useCallback(() => {
    const MAX_BEATS_TO_TRACK = 16;
    const arr = playedBeatTimesRef.current;
    if (arr.length > MAX_BEATS_TO_TRACK) arr.shift();
    if (arr.length < 2) return;
    let totalDiff = 0;
    for (let i = 1; i < arr.length; i++) totalDiff += (arr[i] - arr[i - 1]);
    const avgDiff = totalDiff / (arr.length - 1);
    const newBpm = 60000 / avgDiff;
    setActualBpm(newBpm);
  }, []);

  // New reference to track the last played beat
  const lastPlayedBeatRef = useRef({ time: 0, subIndex: -1 });
// Track the last time we played each subdivision index
const lastPlayedTimesByIndexRef = useRef({});

const scheduleSubdivision = useCallback((subIndex, when) => {
  // Get current time for timing calculations
  const now = audioCtxRef.current ? audioCtxRef.current.currentTime : 0;
  
  // Ensure the scheduled time is in the future with a larger buffer
  // This prevents scheduling sounds in the past which can cause timing issues
  if (when < now) {
    console.log(`[useMetronomeLogic] Adjusting scheduled time from ${when} to ${now + 0.02} (current: ${now})`);
    when = now + 0.02; // Ensure at least 20ms in the future (increased from 10ms)
  }
  
  // CRITICAL: More robust duplicate beat prevention, especially for first beats
  const minTimeBetweenBeats = subIndex === 0 ? 0.2 : 0.05; // 200ms for first beat, 50ms for others
  const lastPlayedTime = lastPlayedTimesByIndexRef.current[subIndex] || 0;
  
  // Check if this specific subdivision was played too recently
  if (now - lastPlayedTime < minTimeBetweenBeats) {
    console.log(`[useMetronomeLogic] Preventing duplicate beat for subdivision ${subIndex} (too soon)`);
    return; // Skip playing this beat
  }
  
  // Update the timestamp for this specific subdivision index
  lastPlayedTimesByIndexRef.current[subIndex] = now;
  
  // Also update the general last played beat reference
  lastPlayedBeatRef.current = { time: now, subIndex };
  
  // Track timing for BPM calculation
  if (!shouldMuteThisBeat(subIndex)) {
    playedBeatTimesRef.current.push(performance.now());
    updateActualBpm();
  }
  
  // Skip playing if this beat should be muted
  if (shouldMuteThisBeat(subIndex)) return;
  
  // Determine which sound to play based on the mode and beat type
  let buffer = null;
  
  if (analogMode) {
    // Analog mode always uses the normal click
    buffer = normalBufferRef.current;
  } else if (gridMode) {
    // Grid mode uses the beat configuration
    const state = beatConfigRef.current[subIndex];
    if (state === 3) buffer = firstBufferRef.current;
    else if (state === 2) buffer = accentBufferRef.current;
    else if (state === 1) buffer = normalBufferRef.current;
  } else {
    // Standard mode uses first beat or accents
    if (subIndex === 0) {
      buffer = firstBufferRef.current;
    } else {
      const state = accentsRef.current[subIndex];
      if (state === 2) buffer = accentBufferRef.current;
      else if (state === 1) buffer = normalBufferRef.current;
    }
  }
  
  // Schedule the sound to play at the precise time
  if (buffer) {
    schedulePlay(buffer, when);
    
    // Log scheduling for debugging in multi circle mode
    if (multiCircleMode && subIndex === 0) {
      console.log(`[useMetronomeLogic] Scheduled first beat at ${when}, current time: ${now}, delta: ${when - now}`);
    }
  }
}, [analogMode, gridMode, multiCircleMode, schedulePlay, shouldMuteThisBeat, updateActualBpm]);

  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempoRef.current) return 0.5;
    const secPerHit = 60 / (tempoRef.current * beatMultiplier);
    if (subdivisionsRef.current >= 2) {
      const isEvenSub = (currentSubRef.current % 2 === 0);
      const swingFactor = swingRef.current || 0;
      if (swingFactor > 0) return isEvenSub ? secPerHit * (1 + swingFactor) : secPerHit * (1 - swingFactor);
    }
    return secPerHit;
  }, [beatMultiplier]);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    
    const now = audioCtxRef.current.currentTime;
    
    // Use a slightly longer lookahead time for multi circle mode to ensure smooth transitions
    const effectiveScheduleAheadTime = multiCircleMode ? SCHEDULE_AHEAD_TIME * 1.2 : SCHEDULE_AHEAD_TIME;
    
    // Schedule notes until we're ahead of the current time by the lookahead amount
    while (nextNoteTimeRef.current < now + effectiveScheduleAheadTime) {
      const subIndex = currentSubRef.current;
      
      // Schedule this subdivision at the precise time
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);
      
      // Update UI state
      setCurrentSubdivision(subIndex);
      
      // Store the start time of this subdivision
      currentSubStartRef.current = nextNoteTimeRef.current;
      
      // Calculate the duration of this subdivision
      currentSubIntervalRef.current = getCurrentSubIntervalSec();
      
      // Move to the next subdivision
      currentSubRef.current = (subIndex + 1) % subdivisionsRef.current;
      
      // Calculate the precise time for the next subdivision
      nextNoteTimeRef.current += currentSubIntervalRef.current;
      
      // If we've completed a measure, handle any measure-level logic
      if (currentSubRef.current === 0) {
        handleEndOfMeasure();
      }
    }
  }, [scheduleSubdivision, getCurrentSubIntervalSec, handleEndOfMeasure, multiCircleMode]);

  const startScheduler = useCallback((startTime = null) => {
    if (schedulerRunningRef.current) return;
    stopScheduler();
    if (!audioCtxRef.current) return;
    
    // Reset subdivision to 0
    currentSubRef.current = 0;
    setCurrentSubdivision(0);
    
    // In multi circle mode, we need to ensure we start with a clean state
    if (multiCircleMode) {
      // Reset the last played beat reference to avoid duplicate beat prevention on start
      lastPlayedBeatRef.current = { time: 0, subIndex: -1 };
    }
    
    // Use provided start time or current time
    const now = audioCtxRef.current.currentTime;
    nextNoteTimeRef.current = startTime !== null ? startTime : now;
    
    // Ensure we're starting with a clean timing reference
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();
    playedBeatTimesRef.current = [];
    
    // Use a more precise lookahead interval for better timing
    lookaheadRef.current = setInterval(scheduler, 20); // Reduced from 25ms to 20ms for better precision
    schedulerRunningRef.current = true;
    
    console.log(`[useMetronomeLogic] Scheduler started at time: ${nextNoteTimeRef.current}, current time: ${now}`);
  }, [stopScheduler, scheduler, getCurrentSubIntervalSec, multiCircleMode]);

  const tapTimesRef = useRef([]);
  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 5) tapTimesRef.current.shift();
    if (tapTimesRef.current.length > 1) {
      let sum = 0;
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        sum += tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      }
      const avgMs = sum / (tapTimesRef.current.length - 1);
      const newTempo = Math.round(60000 / avgMs);
      const clamped = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
      if (setTempo) setTempo(clamped);
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
    }
  }, [setTempo]);

  useEffect(() => {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      try {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        console.error("Web Audio API not supported:", err);
        return;
      }
    }
    audioCtxRef.current = globalAudioCtx;
    const loadSound = (url, callback) => {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((arrBuffer) => audioCtxRef.current.decodeAudioData(arrBuffer))
        .then(decoded => callback(decoded))
        .catch(err => console.error(`Error loading ${url}:`, err));
    };
    loadSound('/assets/audio/click_new.mp3', (buf) => { normalBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_accent.mp3', (buf) => { accentBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_first.mp3', (buf) => { firstBufferRef.current = buf; });
    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; }
  }, []);

  useEffect(() => {
    if (!isPaused) {
      stopScheduler();
      startScheduler();
    } else {
      stopScheduler();
    }
  }, [isPaused, stopScheduler, startScheduler]);

  return {
    currentSubdivision,
    actualBpm,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler,
    lookaheadRef // Expose the lookahead reference so we can track and stop it globally
  };
}