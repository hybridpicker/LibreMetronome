// File: src/components/useMetronomeLogic.js

import { useEffect, useRef, useState, useCallback } from 'react';

/*
 * English comments only:
 * This hook handles:
 * - Audio scheduling (Web Audio)
 * - currentSubdivision index
 * - Tap Tempo
 * - Start/Stop logic
 *
 * In analogMode, we override subdivisions to 2 and always use normalBufferRef.
 */

const TEMPO_MIN = 30;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // 50ms

export default function useMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
  isPaused,
  setIsPaused,
  swing,
  volume,
  accents = [],
  setSubdivisions,
  analogMode = false
}) {
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Audio references
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Scheduling references
  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);

  // We store the start time of the current subdivision
  // and the length of the interval (seconds) for the canvas to interpolate.
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);

  const lookaheadRef = useRef(null);

  // Tap Tempo
  const tapTimesRef = useRef([]);

  // Stop the scheduling
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
  }, []);

  // Setup audio context and load audio
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch (err) {
      console.error('Web Audio API not supported:', err);
      return;
    }

    function loadSound(url, callback) {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((arr) => audioCtxRef.current.decodeAudioData(arr))
        .then((decoded) => callback(decoded))
        .catch((err) => console.error(`Error loading ${url}:`, err));
    }

    // Load the audio files (paths must match your /public/assets/audio)
    loadSound('/assets/audio/click_new.mp3', (buf) => {
      normalBufferRef.current = buf;
    });
    loadSound('/assets/audio/click_new_accent.mp3', (buf) => {
      accentBufferRef.current = buf;
    });
    loadSound('/assets/audio/click_new_first.mp3', (buf) => {
      firstBufferRef.current = buf;
    });

    return () => {
      stopScheduler();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stopScheduler]);

  // schedulePlay: schedules audio playback
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

  // scheduleSubdivision: schedules the correct sound
  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
      if (analogMode) {
        // In analog mode, always normal click
        schedulePlay(normalBufferRef.current, when);
      } else {
        // Circle mode
        if (subIndex === 0) {
          schedulePlay(firstBufferRef.current, when);
        } else if (accents[subIndex]) {
          schedulePlay(accentBufferRef.current, when);
        } else {
          schedulePlay(normalBufferRef.current, when);
        }
      }
    },
    [analogMode, schedulePlay, accents]
  );

  // getEffectiveSubdivisions: either the user-chosen subdivisions or "2" in analog mode
  const getEffectiveSubdivisions = useCallback(() => {
    if (analogMode) {
      return 2; // override
    }
    return Math.max(subdivisions, 1);
  }, [analogMode, subdivisions]);

  // getCurrentSubIntervalSec: calculates time for the current sub
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempo) return 1;
    const beatSec = 60 / tempo;
    const effSubs = getEffectiveSubdivisions();
    const baseSubSec = beatSec / effSubs;

    // Only circle mode with >=2 subs uses swing
    if (!analogMode && effSubs >= 2) {
      if (currentSubRef.current % 2 === 0) {
        return baseSubSec * (1 + swing);
      } else {
        return baseSubSec * (1 - swing);
      }
    } else {
      return baseSubSec;
    }
  }, [tempo, swing, analogMode, getEffectiveSubdivisions]);

  // scheduler
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);

      // Update React state for current subdivision
      setCurrentSubdivision(subIndex);

      // Update references for the Canvas
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();

      const effSubs = getEffectiveSubdivisions();
      // Next subdivision
      currentSubRef.current = (subIndex + 1) % effSubs;
      nextNoteTimeRef.current += currentSubIntervalRef.current;
    }
  }, [
    scheduleSubdivision,
    getCurrentSubIntervalSec,
    getEffectiveSubdivisions,
    setCurrentSubdivision
  ]);

  // startScheduler
  const startScheduler = useCallback(() => {
    stopScheduler();
    if (!audioCtxRef.current) return;

    currentSubRef.current = 0;
    setCurrentSubdivision(0);

    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();

    lookaheadRef.current = setInterval(scheduler, 25);
  }, [stopScheduler, getCurrentSubIntervalSec, scheduler]);

  // handleTapTempo
  const handleTapTempo = useCallback(() => {
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
      if (setTempo) setTempo(clamped);
    }
  }, [setTempo]);

  // Optional keyboard shortcuts
  useEffect(() => {
    function handleKeydown(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (setIsPaused) {
          setIsPaused((prev) => !prev);
        }
      } else if (!analogMode && e.key >= '1' && e.key <= '9') {
        // In circle mode, let user select subdivisions
        const newSub = parseInt(e.key, 10);
        if (setSubdivisions) {
          setSubdivisions(newSub);
        }
      } else if (e.key.toLowerCase() === 't') {
        handleTapTempo();
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [setIsPaused, setSubdivisions, handleTapTempo, analogMode]);

  // Start/Stop logic
  useEffect(() => {
    if (!audioCtxRef.current) return;
    if (!isPaused) {
      audioCtxRef.current.resume();
      startScheduler();
    } else {
      stopScheduler();
      setCurrentSubdivision(0);
    }
  }, [isPaused, startScheduler, stopScheduler]);

  return {
    currentSubdivision,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    // Refs for the analog canvas
    currentSubStartRef,
    currentSubIntervalRef
  };
}
