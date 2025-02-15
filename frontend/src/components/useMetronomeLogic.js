// src/components/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

const TEMPO_MIN = 30;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // 50ms lookahead window

export default function useMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
  isPaused,
  setIsPaused,
  swing,
  volume,
  accents = [],
  beatConfig, // optional, falls nicht vorhanden, wird standardmäßig ein Array voller 1er genutzt
  setSubdivisions,
  analogMode = false,
  gridMode = false // true, wenn Grid Mode aktiv ist
}) {
  // State for current subdivision (for visual synchronization)
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // AudioContext and sound buffers
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

  // Dynamic parameter Refs for immediate updates
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const subdivisionsRef = useRef(subdivisions);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);

  // beatConfig handling: For Grid Mode, if no beatConfig is provided, default to [3, 1, 1, …]
  const beatConfigRef = useRef(null);
  useEffect(() => {
    if (gridMode) {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      }
    } else {
      if (beatConfig && beatConfig.length > 0) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, () => 1);
      }
    }
    console.log("useMetronomeLogic - beatConfig updated:", beatConfigRef.current);
  }, [beatConfig, subdivisions, gridMode]);

  // -------------------------------
  // Definition von stopScheduler (muss vor allen Verwendungen stehen)
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
      schedulerRunningRef.current = false;
      console.log("useMetronomeLogic - Scheduler stopped.");
    }
  }, []);
  // -------------------------------

  // Create AudioContext and load sounds
  useEffect(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log("useMetronomeLogic - AudioContext created.");
      } catch (err) {
        console.error("Web Audio API not supported:", err);
        return;
      }
    }
    function loadSound(url, callback) {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((arr) => audioCtxRef.current.decodeAudioData(arr))
        .then((decoded) => {
          callback(decoded);
          console.log(`useMetronomeLogic - Sound loaded from ${url}`);
        })
        .catch((err) => console.error(`Error loading ${url}:`, err));
    }
    loadSound('/assets/audio/click_new.mp3', (buf) => { normalBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_accent.mp3', (buf) => { accentBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_first.mp3', (buf) => { firstBufferRef.current = buf; });
    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  // schedulePlay: Schedules playback of a given buffer at time "when"
  const schedulePlay = useCallback((buffer, when) => {
    if (!buffer || !audioCtxRef.current) return;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volumeRef.current;
    source.connect(gainNode).connect(audioCtxRef.current.destination);
    source.start(when);
    console.log(`useMetronomeLogic - Scheduled sound at ${when.toFixed(3)}s`);
  }, []);

  // scheduleSubdivision: Determines which sound to play based on mode and accent settings.
  const scheduleSubdivision = useCallback((subIndex, when) => {
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
  }, [analogMode, gridMode, accents, schedulePlay]);

  // getEffectiveSubdivisions: Returns the effective number of subdivisions (Analog Mode always returns 2)
  const getEffectiveSubdivisions = useCallback(() => {
    if (analogMode) return 2;
    return Math.max(subdivisionsRef.current, 1);
  }, [analogMode]);

  // getCurrentSubIntervalSec: Calculates the interval (in seconds) for the current subdivision, applying swing.
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempoRef.current) return 1;
    const beatSec = 60 / tempoRef.current;
    if (gridMode) {
      const effSubs = getEffectiveSubdivisions();
      const baseInterval = beatSec / effSubs;
      const swungInterval = (currentSubRef.current % 2 === 0)
        ? baseInterval * (1 + swingRef.current)
        : baseInterval * (1 - swingRef.current);
      console.log("useMetronomeLogic - Grid Mode active with swing, interval:", swungInterval);
      return swungInterval;
    }
    const effSubs = getEffectiveSubdivisions();
    const baseSubSec = beatSec / effSubs;
    if (!analogMode && effSubs >= 2) {
      const interval = (currentSubRef.current % 2 === 0)
        ? baseSubSec * (1 + swingRef.current)
        : baseSubSec * (1 - swingRef.current);
      console.log("useMetronomeLogic - Calculated interval with swing:", interval);
      return interval;
    }
    return baseSubSec;
  }, [analogMode, gridMode, getEffectiveSubdivisions]);

  // scheduler: Schedules all subdivisions within the lookahead window.
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
    }
  }, [scheduleSubdivision, getCurrentSubIntervalSec, getEffectiveSubdivisions]);

  // startScheduler: Initializes parameters and starts the scheduler.
  const startScheduler = useCallback(() => {
    if (schedulerRunningRef.current) return;
    stopScheduler();
    if (!audioCtxRef.current) return;
    currentSubRef.current = 0;
    setCurrentSubdivision(0);
    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();
    lookaheadRef.current = setInterval(scheduler, 25);
    schedulerRunningRef.current = true;
    console.log("useMetronomeLogic - Scheduler started.");
  }, [stopScheduler, getCurrentSubIntervalSec, scheduler]);

  // handleTapTempo: Computes a new tempo based on tap timings.
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
      console.log(`useMetronomeLogic - New tempo calculated: ${clamped} BPM`);
    }
  }, [setTempo]);

  // Global keyboard listener for Space, number keys and "t" (tap tempo)
  useEffect(() => {
    function handleKeydown(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      } else if (!analogMode && e.key >= '1' && e.key <= '9') {
        const newSub = parseInt(e.key, 10);
        if (setSubdivisions) {
          setSubdivisions(newSub);
          console.log(`useMetronomeLogic - Key pressed: setting subdivisions to ${newSub}`);
        }
      } else if (e.key.toLowerCase() === 't') {
        handleTapTempo();
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [setIsPaused, setSubdivisions, handleTapTempo, analogMode]);

  // Start/stop scheduler based on isPaused
  useEffect(() => {
    if (!audioCtxRef.current) return;
    if (audioCtxRef.current.state === 'closed') {
      console.warn("useMetronomeLogic - AudioContext is closed; cannot resume or schedule.");
      return;
    }
    if (!isPaused) {
      if (!schedulerRunningRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().then(() => {
            console.log("useMetronomeLogic - AudioContext resumed.");
            startScheduler();
          }).catch(err => {
            console.warn("useMetronomeLogic - Error resuming AudioContext:", err);
          });
        } else {
          startScheduler();
        }
      }
    } else {
      if (schedulerRunningRef.current) stopScheduler();
      setCurrentSubdivision(0);
    }
  }, [isPaused, startScheduler, stopScheduler]);

  // In Circle Mode: Wenn sich die Accent-Einstellungen ändern, Scheduler neu starten.
  useEffect(() => {
    if (gridMode) return; // Nur in Circle Mode
    if (!isPaused && audioCtxRef.current && schedulerRunningRef.current) {
      console.log("useMetronomeLogic - Accents changed, restarting scheduler.");
      stopScheduler();
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      startScheduler();
    }
  }, [accents, gridMode, isPaused, stopScheduler, startScheduler]);

  return {
    currentSubdivision,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef
  };
}
