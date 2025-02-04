// src/components/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

/*
 * Comments in English as requested.
 * This hook interprets "tempo" as normal BPM (beats per minute).
 * Each beat is further subdivided by "subdivisions".
 * => time per subdivision = (60 / tempo) / subdivisions.
 */

const TEMPO_MIN = 30;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // schedule 50ms ahead

export default function useMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
  isPaused,
  setIsPaused,
  swing,
  volume,
  accents = [],
  setSubdivisions
}) {
  // State: which subdivision is currently active
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Audio references
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Scheduling references
  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const lookaheadRef = useRef(null);

  // For Tap Tempo
  const tapTimesRef = useRef([]);

  // --------------------------------
  // 1) Initialize AudioContext
  // --------------------------------
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.error('Web Audio API not supported:', err);
      return;
    }

    // Load audio samples
    loadSound('/assets/audio/click_new.mp3', (buffer) => {
      normalBufferRef.current = buffer;
    });
    loadSound('/assets/audio/click_new_accent.mp3', (buffer) => {
      accentBufferRef.current = buffer;
    });
    loadSound('/assets/audio/click_new_first.mp3', (buffer) => {
      firstBufferRef.current = buffer;
    });

    return () => {
      stopScheduler();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  function loadSound(url, callback) {
    if (!audioCtxRef.current) return;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arr) => audioCtxRef.current.decodeAudioData(arr))
      .then((decoded) => callback(decoded))
      .catch((err) => console.error(`Error loading ${url}:`, err));
  }

  // --------------------------------
  // 2) schedulePlay, scheduleSubdivision
  // --------------------------------
  const schedulePlay = useCallback(
    (buffer, when) => {
      if (!buffer || !audioCtxRef.current) return;
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      const gainNode = audioCtxRef.current.createGain();
      gainNode.gain.value = volume;
      source.connect(gainNode).connect(audioCtxRef.current.destination);
      source.start(when);
    },
    [volume]
  );

  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
      if (subIndex === 0) {
        schedulePlay(firstBufferRef.current, when); // first beat
      } else if (accents[subIndex]) {
        schedulePlay(accentBufferRef.current, when);
      } else {
        schedulePlay(normalBufferRef.current, when);
      }
    },
    [schedulePlay, accents]
  );

  // --------------------------------
  // 3) getCurrentSubIntervalSec
  // --------------------------------
  // time per beat = 60/tempo
  // time per sub  = (60/tempo)/subdivisions
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempo) return 1;
    const baseBeat = 60 / tempo; // seconds per beat
    const baseSub = baseBeat / Math.max(subdivisions, 1); // seconds per subdivision

    // If we have at least 2 subdivisions, apply swing for even/odd
    if (subdivisions >= 2) {
      if (currentSubRef.current % 2 === 0) {
        // "long" half
        return baseSub * (1 + swing);
      } else {
        // "short" half
        return baseSub * (1 - swing);
      }
    }

    return baseSub;
  }, [tempo, subdivisions, swing]);

  // --------------------------------
  // 4) scheduler
  // --------------------------------
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;

      // Schedule audio
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);

      // Update UI pointer
      setCurrentSubdivision(subIndex);

      // Prepare next
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();

      currentSubRef.current = (subIndex + 1) % Math.max(subdivisions, 1);
      nextNoteTimeRef.current += currentSubIntervalRef.current;
    }
  }, [
    scheduleSubdivision,
    getCurrentSubIntervalSec,
    subdivisions,
    setCurrentSubdivision
  ]);

  // --------------------------------
  // 5) Start / Stop
  // --------------------------------
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
  }, []);

  const startScheduler = useCallback(() => {
    stopScheduler();
    if (!audioCtxRef.current) return;

    // Reset counters
    currentSubRef.current = 0;
    setCurrentSubdivision(0);

    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();

    // start the "lookahead" loop
    lookaheadRef.current = setInterval(scheduler, 25);
  }, [stopScheduler, audioCtxRef, getCurrentSubIntervalSec, scheduler]);

  // --------------------------------
  // 6) Tap Tempo
  // --------------------------------
  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);
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
      setTempo(clamped);
    }
  }, [setTempo]);

  // --------------------------------
  // 7) Keyboard shortcuts (optional)
  // --------------------------------
  useEffect(() => {
    function handleKeydown(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (setIsPaused) {
          setIsPaused((prev) => !prev);
        }
      } else if (e.key >= '1' && e.key <= '9') {
        if (setSubdivisions) {
          setSubdivisions(parseInt(e.key, 10));
        }
      } else if (e.key.toLowerCase() === 't') {
        tapTempo();
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [setIsPaused, setSubdivisions, tapTempo]);

  // --------------------------------
  // 8) Start/Stop based on isPaused
  // --------------------------------
  useEffect(() => {
    if (isPaused) {
      stopScheduler();
      setCurrentSubdivision(0);
    } else {
      startScheduler();
    }
    return () => stopScheduler();
  }, [isPaused, startScheduler, stopScheduler]);

  // Return the needed references
  return {
    currentSubdivision,      // active index for the UI
    currentSubStartRef,
    currentSubIntervalRef,
    audioCtx: audioCtxRef.current,
    tapTempo
  };
}
