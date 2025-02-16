// File: src/components/useMetronomeLogic.js
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
  // Training parameters
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2
}) {
  // State for current subdivision index (for UI synchronization)
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

  // Setup beat configuration for grid mode
  const beatConfigRef = useRef(null);
  useEffect(() => {
    if (gridMode) {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) =>
          i === 0 ? 3 : 1
        );
      }
    } else {
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

  const handleEndOfMeasure = useCallback(() => {
    measureCountRef.current += 1;
    if (macroMode === 1) {
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
    }
    if (speedMode === 1) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        setTempo(prev => Math.min(Math.round(prev * factor), TEMPO_MAX));
        measureCountRef.current = 0;
        console.log("[useMetronomeLogic] Speed Training: Tempo increased automatically.");
      }
    }
  }, [macroMode, speedMode, measuresUntilMute, muteDurationMeasures, measuresUntilSpeedUp, tempoIncreasePercent, setTempo]);

  const shouldMuteThisBeat = useCallback((subIndex) => {
    if (macroMode === 1 && isSilencePhaseRef.current) {
      return true;
    }
    if (macroMode === 2) {
      return Math.random() < muteProbability;
    }
    return false;
  }, [macroMode, muteProbability]);

  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
      schedulerRunningRef.current = false;
      console.log("[useMetronomeLogic] Scheduler stopped.");
    }
  }, []);

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

  const scheduleSubdivision = useCallback((subIndex, when) => {
    if (shouldMuteThisBeat(subIndex)) {
      console.log("[useMetronomeLogic] Beat muted due to training mode.");
      return;
    }
    if (analogMode) {
      schedulePlay(normalBufferRef.current, when);
    } else if (gridMode) {
      const state = beatConfigRef.current[subIndex];
      if (state === 3) {
        schedulePlay(firstBufferRef.current, when);
      } else if (state === 2) {
        schedulePlay(accentBufferRef.current, when);
      } else {
        schedulePlay(normalBufferRef.current, when);
      }
    } else {
      if (subIndex === 0) {
        schedulePlay(firstBufferRef.current, when);
      } else if (accents[subIndex]) {
        schedulePlay(accentBufferRef.current, when);
      } else {
        schedulePlay(normalBufferRef.current, when);
      }
    }
  }, [analogMode, gridMode, accents, schedulePlay, shouldMuteThisBeat]);

  const getEffectiveSubdivisions = useCallback(() => {
    if (analogMode) return 2;
    return Math.max(subdivisionsRef.current, 1);
  }, [analogMode]);

  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempoRef.current) return 1;
    const beatSec = 60 / tempoRef.current;
    if (gridMode) {
      const effSubs = getEffectiveSubdivisions();
      const baseInterval = beatSec / effSubs;
      const swungInterval = (currentSubRef.current % 2 === 0)
        ? baseInterval * (1 + swingRef.current)
        : baseInterval * (1 - swingRef.current);
      console.log("[useMetronomeLogic] Grid Mode interval with swing:", swungInterval);
      return swungInterval;
    }
    const effSubs = getEffectiveSubdivisions();
    const baseSubSec = beatSec / effSubs;
    if (!analogMode && effSubs >= 2) {
      const interval = (currentSubRef.current % 2 === 0)
        ? baseSubSec * (1 + swingRef.current)
        : baseSubSec * (1 - swingRef.current);
      console.log("[useMetronomeLogic] Calculated interval with swing:", interval);
      return interval;
    }
    return baseSubSec;
  }, [analogMode, gridMode, getEffectiveSubdivisions]);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);
      setCurrentSubdivision(subIndex);
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();
      const effSubs = getEffectiveSubdivisions();
      currentSubRef.current = (subIndex + 1) % effSubs;
      nextNoteTimeRef.current += currentSubIntervalRef.current;
      if (currentSubRef.current === 0) {
        handleEndOfMeasure();
      }
    }
  }, [scheduleSubdivision, getCurrentSubIntervalSec, getEffectiveSubdivisions, handleEndOfMeasure]);

  const startScheduler = useCallback(() => {
    if (schedulerRunningRef.current) {
      console.log("[useMetronomeLogic] Scheduler already running.");
      return;
    }
    stopScheduler();
    if (!audioCtxRef.current) return;
    currentSubRef.current = 0;
    setCurrentSubdivision(0);
    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();
    lookaheadRef.current = setInterval(scheduler, 25);
    schedulerRunningRef.current = true;
    console.log("[useMetronomeLogic] Scheduler started.");
  }, [stopScheduler, scheduler, getCurrentSubIntervalSec]);

  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 5) tapTimesRef.current.shift();
    if (tapTimesRef.current.length > 1) {
      let sum = 0;
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        sum += tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      }
      const avg = sum / (tapTimesRef.current.length - 1);
      const newTempo = Math.round(60000 / avg);
      const clamped = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
      if (setTempo) setTempo(clamped);
      console.log(`[useMetronomeLogic] New tempo from tap: ${clamped} BPM`);
    }
  }, [setTempo]);

  // Initialize AudioContext and load sounds only once.
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
        .then((arr) => audioCtxRef.current.decodeAudioData(arr))
        .then((decoded) => {
          callback(decoded);
          console.log(`[useMetronomeLogic] Sound loaded from ${url}`);
        })
        .catch((err) => console.error(`Error loading ${url}:`, err));
    };

    loadSound('/assets/audio/click_new.mp3', (buf) => { normalBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_accent.mp3', (buf) => { accentBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_first.mp3', (buf) => { firstBufferRef.current = buf; });

    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  // Prevent auto-start on initial mount.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      console.log("[useMetronomeLogic] Initial mount – scheduler not auto-started.");
      return;
    }
  }, []);

  return {
    currentSubdivision,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler, // To be called by the play/pause handler
    stopScheduler   // To be called by the play/pause handler
  };
}
