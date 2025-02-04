// src/components/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

/*
 * Comments in English, as requested.
 * This custom hook manages audio scheduling, swing logic, and tap tempo.
 */

const TEMPO_MIN = 30;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // How far ahead to schedule in seconds

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
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const lookaheadRef = useRef(null);

  const tapTimesRef = useRef([]);

  // ----------------------------------
  // 1) LOAD AUDIO BUFFERS ON INIT
  // ----------------------------------
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.error('Web Audio API not supported:', err);
      return;
    }

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
      stopScheduler(); // clean up intervals
      if (audioCtxRef.current) {
        audioCtxRef.current.close(); // close audio context
      }
    };
  }, []); // runs once on mount

  // Helper for loading audio files
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

  // ----------------------------------
  // 2) SCHEDULE AUDIO PLAYBACK
  // ----------------------------------
  // Wrap schedulePlay in useCallback, depending on volume
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

  // Wrap scheduleSubdivision so that it depends on schedulePlay + accents
  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
      if (subIndex === 0) {
        schedulePlay(firstBufferRef.current, when);
      } else if (accents[subIndex]) {
        schedulePlay(accentBufferRef.current, when);
      } else {
        schedulePlay(normalBufferRef.current, when);
      }
    },
    [schedulePlay, accents]
  );

  // ----------------------------------
  // 3) CALCULATE SUBDIVISION DURATIONS (SWING)
  // ----------------------------------
  const getCurrentSubIntervalSec = useCallback(() => {
    // base time for one subdivision if straight
    const baseSec = (60 / tempo) / Math.max(subdivisions, 1);

    // typical "jazz swing": first sub is longer, second is shorter
    if (subdivisions >= 2) {
      if (currentSubRef.current % 2 === 0) {
        // longer portion
        return baseSec * (1 + swing);
      } else {
        // shorter portion
        return baseSec * (1 - swing);
      }
    }
    // If only 1 subdivision, just return baseSec
    return baseSec;
  }, [tempo, subdivisions, swing]);

  // ----------------------------------
  // 4) SCHEDULER: SCHEDULE WHILE AHEAD
  // ----------------------------------
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    // keep scheduling ahead
    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      // schedule the current subdivision
      scheduleSubdivision(currentSubRef.current, nextNoteTimeRef.current);
      // update React state for the UI pointer
      setCurrentSubdivision(currentSubRef.current);

      // update references for animation
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();

      // increment subdivision
      currentSubRef.current =
        (currentSubRef.current + 1) % Math.max(subdivisions, 1);

      // next note time
      nextNoteTimeRef.current += currentSubIntervalRef.current;
    }
  }, [
    scheduleSubdivision,
    getCurrentSubIntervalSec,
    subdivisions,          // because we use it in the mod operation
    setCurrentSubdivision  // state setter
  ]);

  // ----------------------------------
  // 5) SCHEDULER CONTROL
  // ----------------------------------
  // UseCallback for stopScheduler (no dependencies)
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
  }, []);

  // Also wrap startScheduler, referencing scheduler & getCurrentSubIntervalSec
  const startScheduler = useCallback(() => {
    stopScheduler(); // ensure no old interval is running
    if (!audioCtxRef.current) return;
    currentSubRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();
    lookaheadRef.current = setInterval(scheduler, 25);
  }, [stopScheduler, audioCtxRef, getCurrentSubIntervalSec, scheduler]);

  // ----------------------------------
  // 6) TAP TEMPO
  // ----------------------------------
  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);

    // keep only last 5 taps
    if (tapTimesRef.current.length > 5) {
      tapTimesRef.current.shift();
    }
    // compute average and set new tempo
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

  // ----------------------------------
  // 7) KEYBOARD SHORTCUTS
  // ----------------------------------
  useEffect(() => {
    function handleKeydown(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (setIsPaused) {
          setIsPaused(prev => !prev);
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

  // ----------------------------------
  // 8) START / STOP WHEN isPaused CHANGES
  // ----------------------------------
  useEffect(() => {
    if (isPaused) {
      stopScheduler();
    } else {
      startScheduler();
    }
    return () => stopScheduler();
  }, [isPaused, startScheduler, stopScheduler]);

  // ----------------------------------
  // RETURN OBJECT
  // ----------------------------------
  return {
    currentSubdivision,
    currentSubStartRef,
    currentSubIntervalRef,
    audioCtx: audioCtxRef.current,
    tapTempo
  };
}
