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
  // For circle/grid mode: if beatConfig is not provided, default to an array of 1's.
  beatConfig = Array.from({ length: subdivisions }, () => 1),
  setSubdivisions,
  analogMode = false,
  gridMode = false // New prop: true when Grid Mode is active
}) {
  // State for current subdivision (for visual synchronization)
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Persist the AudioContext and sound buffers.
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Scheduling references.
  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const lookaheadRef = useRef(null);
  const tapTimesRef = useRef([]);

  const schedulerRunningRef = useRef(false);

  // Ensure beatConfig is up-to-date; if empty, use default array of 1's.
  const beatConfigRef = useRef(beatConfig);
  useEffect(() => {
    if (!beatConfig || beatConfig.length === 0) {
      beatConfigRef.current = Array.from({ length: subdivisions }, () => 1);
    } else {
      beatConfigRef.current = beatConfig;
    }
    console.log("useMetronomeLogic - beatConfig updated:", beatConfigRef.current);
  }, [beatConfig, subdivisions]);

  // Function to stop the scheduler.
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
      schedulerRunningRef.current = false;
      console.log("useMetronomeLogic - Scheduler stopped.");
    }
  }, []);

  // Create the AudioContext (or re-create if closed) and load sounds (once).
  useEffect(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log("useMetronomeLogic - AudioContext created.");
      } catch (err) {
        console.error('Web Audio API not supported:', err);
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
      // On cleanup, only stop the scheduler (do not close AudioContext)
      stopScheduler();
    };
  }, [stopScheduler]);

  // schedulePlay: schedules playback of the given buffer at time "when".
  const schedulePlay = useCallback(
    (buffer, when) => {
      if (!buffer || !audioCtxRef.current) return;
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      const gainNode = audioCtxRef.current.createGain();
      gainNode.gain.value = volume;
      source.connect(gainNode).connect(audioCtxRef.current.destination);
      source.start(when);
      console.log(`useMetronomeLogic - Scheduled sound at ${when.toFixed(3)}s`);
    },
    [volume]
  );

  // scheduleSubdivision: selects which sound to play.
  // In Circle Mode:
  // - If in Grid Mode, use the beatConfig state:
  //   * If state === 3, play first beat sound.
  //   * If state === 2, play accented sound.
  //   * Otherwise, play normal sound.
  // - In non-Grid (Circle) Mode:
  //   * If subIndex === 0, play first beat sound.
  //   * Else if the beat is accented, play accented sound.
  //   * Otherwise, play normal sound.
  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
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
    },
    [analogMode, gridMode, schedulePlay, accents]
  );

  // getEffectiveSubdivisions: returns subdivisions (or 2 in analog mode)
  const getEffectiveSubdivisions = useCallback(() => {
    if (analogMode) return 2;
    return Math.max(subdivisions, 1);
  }, [analogMode, subdivisions]);

  // getCurrentSubIntervalSec:
  // - In Grid Mode: interval = (60 / tempo) / subdivisions, with swing applied.
  // - In non-Grid (Circle/Analog) Mode: interval is calculated with swing modulation.
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempo) return 1;
    const beatSec = 60 / tempo;
    if (gridMode) {
      const effSubs = getEffectiveSubdivisions();
      const baseInterval = beatSec / effSubs;
      // Apply swing modulation: alternate intervals.
      const swungInterval = (currentSubRef.current % 2 === 0)
        ? baseInterval * (1 + swing)
        : baseInterval * (1 - swing);
      console.log("useMetronomeLogic - Grid Mode active with swing, interval:", swungInterval);
      return swungInterval;
    }
    const effSubs = getEffectiveSubdivisions();
    const baseSubSec = beatSec / effSubs;
    if (!analogMode && effSubs >= 2) {
      const interval = (currentSubRef.current % 2 === 0)
        ? baseSubSec * (1 + swing)
        : baseSubSec * (1 - swing);
      console.log("useMetronomeLogic - Calculated interval with swing:", interval);
      return interval;
    }
    return baseSubSec;
  }, [tempo, swing, analogMode, gridMode, getEffectiveSubdivisions]);

  // Scheduler: schedules all subdivisions within the lookahead window.
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

  // startScheduler: initializes parameters and starts the scheduler.
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

  // handleTapTempo: computes a new tempo based on tap timings.
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

  // Keyboard listener for Space, number keys, and "t" (tap tempo).
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

  // Start or stop the scheduler based on isPaused.
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
          }).catch((err) => {
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

  // In analog (or circle) mode, restart scheduler when swing changes.
  useEffect(() => {
    if (analogMode && !isPaused && schedulerRunningRef.current && audioCtxRef.current) {
      console.log("useMetronomeLogic - Swing value changed, restarting scheduler.");
      stopScheduler();
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      startScheduler();
    }
  }, [swing, isPaused, startScheduler, stopScheduler, analogMode]);

  // Immediately restart scheduler when accents change,
  // but only in Circle Mode (i.e., when gridMode is false)
  useEffect(() => {
    if (gridMode) return; // Do not restart scheduler for Grid Mode
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
