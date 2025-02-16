// File: src/hooks/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

// Global AudioContext persists across mounts
let globalAudioCtx = null;

const TEMPO_MIN = 30;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // 50ms lookahead

export default function useMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
  setSubdivisions,
  isPaused,
  setIsPaused,
  swing,
  volume,
  accents = [],
  beatConfig,
  analogMode = false,
  gridMode = false,
  // Training mode parameters
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2
}) {
  // State for current subdivision index (for UI sync)
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Audio context and sound buffers
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Scheduler references
  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const lookaheadRef = useRef(null);
  const tapTimesRef = useRef([]);
  const schedulerRunningRef = useRef(false);

  // Dynamic refs for parameters
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const subdivisionsRef = useRef(subdivisions);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);

  // Setup beat configuration for grid mode or circle mode
  const beatConfigRef = useRef(null);
  useEffect(() => {
    if (gridMode) {
      // If a beatConfig (i.e., grid states) is provided, use it. Otherwise, default to [3,1,1,...].
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      }
    } else {
      // For analog or circle mode, we might store a default or rely on accents array
      if (beatConfig && beatConfig.length > 0) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, () => 1);
      }
    }
    console.log("[useMetronomeLogic] beatConfig updated:", beatConfigRef.current);
  }, [beatConfig, subdivisions, gridMode]);

  // Training mode counters
  const measureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const muteMeasureCountRef = useRef(0);

  // Called whenever we finish a measure (i.e., we loop back to subIndex=0)
  const handleEndOfMeasure = useCallback(() => {
    measureCountRef.current += 1;

    // Macro Mode: handle fixed or random silence
    if (macroMode === 1) {
      // Fixed Silence
      if (!isSilencePhaseRef.current) {
        if (measureCountRef.current >= measuresUntilMute) {
          isSilencePhaseRef.current = true;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0;
          console.log("[useMetronomeLogic] Macro Timing: Entering silence phase.");
        }
      } else {
        muteMeasureCountRef.current += 1;
        if (muteMeasureCountRef.current >= muteDurationMeasures) {
          isSilencePhaseRef.current = false;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0;
          console.log("[useMetronomeLogic] Macro Timing: Exiting silence phase.");
        }
      }
    } else if (macroMode === 2) {
      // Random Silence doesn't depend on measure boundaries for toggling states,
      // but we could track something here if needed.
    }

    // Speed Mode: auto-increment tempo after a certain number of measures
    if (speedMode === 1) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        setTempo(prev => Math.min(Math.round(prev * factor), TEMPO_MAX));
        measureCountRef.current = 0;
        console.log("[useMetronomeLogic] Speed Training: Tempo increased automatically.");
      }
    }
  }, [
    macroMode, speedMode,
    measuresUntilMute, muteDurationMeasures, measuresUntilSpeedUp, tempoIncreasePercent,
    setTempo
  ]);

  // Decide whether a beat should be muted according to macroMode
  const shouldMuteThisBeat = useCallback((subIndex) => {
    // For fixed silence (macroMode=1), we mute if isSilencePhaseRef is true
    if (macroMode === 1 && isSilencePhaseRef.current) {
      return true;
    }
    // For random silence (macroMode=2), we do a random check
    if (macroMode === 2) {
      return Math.random() < muteProbability;
    }
    return false;
  }, [macroMode, muteProbability]);

  // Stop the scheduler
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
      schedulerRunningRef.current = false;
      console.log("[useMetronomeLogic] Scheduler stopped.");
    }
  }, []);

  // Actually schedule a sample to play at time 'when'
  const schedulePlay = useCallback((buffer, when) => {
    if (!buffer || !audioCtxRef.current) return;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volumeRef.current;
    source.connect(gainNode).connect(audioCtxRef.current.destination);
    source.start(when);
    console.log(`[useMetronomeLogic] Scheduled sound at ${when.toFixed(3)}s`);
  }, []);

  // Decide which sample to play for the given subdivision
  const scheduleSubdivision = useCallback((subIndex, when) => {
    // 1) Check training mode silence
    if (shouldMuteThisBeat(subIndex)) {
      console.log("[useMetronomeLogic] Beat muted due to training mode.");
      return;
    }

    // 2) Check which mode is active
    if (analogMode) {
      // In analog mode, we always use the normal buffer
      schedulePlay(normalBufferRef.current, when);

    } else if (gridMode) {
      // In Grid Mode, use the beatConfig states: 1 = normal, 2 = accent, 3 = first
      const state = beatConfigRef.current[subIndex];
      console.log(`[useMetronomeLogic] Grid Mode -> subIndex:${subIndex}, state:${state}`);
      if (state === 3) {
        // 3 squares -> first-beat sound
        schedulePlay(firstBufferRef.current, when);
      } else if (state === 2) {
        // 2 squares -> accent sound
        schedulePlay(accentBufferRef.current, when);
      } else {
        // 1 square -> normal sound
        schedulePlay(normalBufferRef.current, when);
      }

    } else {
      // Circle Mode -> subIndex=0 => first beat, otherwise check accents array
      if (subIndex === 0) {
        schedulePlay(firstBufferRef.current, when);
      } else if (accents[subIndex]) {
        schedulePlay(accentBufferRef.current, when);
      } else {
        schedulePlay(normalBufferRef.current, when);
      }
    }
  }, [analogMode, gridMode, accents, schedulePlay, shouldMuteThisBeat]);

  // For analog or circle mode with swing, we might have a "2-sub" approach, etc.
  const getEffectiveSubdivisions = useCallback(() => {
    if (analogMode) return 2; // analog mode uses a 2-subdivision pattern (tick-tock)
    return Math.max(subdivisionsRef.current, 1);
  }, [analogMode]);

  // The length of the current subdivision in seconds, taking swing into account
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempoRef.current) return 1;
    const beatSec = 60 / tempoRef.current;
    const effSubs = getEffectiveSubdivisions();
    const baseSubSec = beatSec / effSubs;

    // If we have at least 2 subdivisions and not in purely analog mode,
    // we apply swing to the even/odd subdivisions
    if (!analogMode && effSubs >= 2) {
      const isEvenSub = (currentSubRef.current % 2 === 0);
      const interval = isEvenSub
        ? baseSubSec * (1 + swingRef.current)
        : baseSubSec * (1 - swingRef.current);
      return interval;
    }

    return baseSubSec;
  }, [analogMode, getEffectiveSubdivisions]);

  // The main scheduler
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    // Loop while the next note is within the schedule-ahead time
    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);

      // Update UI state
      setCurrentSubdivision(subIndex);

      // Save these for optional animations
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();

      // Move to next subdivision
      const effSubs = getEffectiveSubdivisions();
      currentSubRef.current = (subIndex + 1) % effSubs;

      // Advance nextNoteTime
      nextNoteTimeRef.current += currentSubIntervalRef.current;

      // If we loop back to 0, we have completed a measure
      if (currentSubRef.current === 0) {
        handleEndOfMeasure();
      }
    }
  }, [
    scheduleSubdivision,
    getCurrentSubIntervalSec,
    getEffectiveSubdivisions,
    handleEndOfMeasure
  ]);

  // Start the scheduler
  const startScheduler = useCallback(() => {
    if (schedulerRunningRef.current) {
      console.log("[useMetronomeLogic] Scheduler already running.");
      return;
    }
    stopScheduler();
    if (!audioCtxRef.current) return;

    // Reset counters
    currentSubRef.current = 0;
    setCurrentSubdivision(0);

    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();

    lookaheadRef.current = setInterval(scheduler, 25);
    schedulerRunningRef.current = true;
    console.log("[useMetronomeLogic] Scheduler started.");
  }, [stopScheduler, scheduler, getCurrentSubIntervalSec]);

  // Handle tap-tempo
  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);

    // Only keep the last 5 taps
    if (tapTimesRef.current.length > 5) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length > 1) {
      let sum = 0;
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        sum += tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      }
      const avg = sum / (tapTimesRef.current.length - 1);
      const newTempo = Math.round(60000 / avg);
      const clamped = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
      if (setTempo) setTempo(clamped);

      // Reset training counters to avoid interfering
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
      console.log(`[useMetronomeLogic] New tempo from tap: ${clamped} BPM`);
    }
  }, [setTempo]);

  // Initialize AudioContext and load click sounds once
  useEffect(() => {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      try {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("[useMetronomeLogic] AudioContext created.");
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
        .then((decoded) => {
          callback(decoded);
          console.log(`[useMetronomeLogic] Sound loaded from ${url}`);
        })
        .catch((err) => console.error(`Error loading ${url}:`, err));
    };

    // Adjust these paths to match your actual audio file locations:
    loadSound('/assets/audio/click_new.mp3', (buf) => { normalBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_accent.mp3', (buf) => { accentBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_first.mp3', (buf) => { firstBufferRef.current = buf; });

    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  // Prevent auto-start on mount
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      console.log("[useMetronomeLogic] Initial mount - not auto-starting scheduler.");
      return;
    }
  }, []);

  return {
    currentSubdivision,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler
  };
}
