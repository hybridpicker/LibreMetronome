// src/components/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

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
  beatConfig, // Optional parameter for grid mode: an array with values 1,2,3
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

  // Refs for timing interpolation (e.g., for pendulum animation)
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);

  const lookaheadRef = useRef(null);
  const tapTimesRef = useRef([]);

  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
  }, []);

  // Set up audio context and load audio files
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
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

    // Load sound files (make sure the paths match your /public/assets/audio directory)
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

  // schedulePlay: Schedules playback of the given sound buffer at time "when"
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

  // scheduleSubdivision: Chooses which sound to play based on beatConfig.
  // In grid mode, beatConfig values are:
  // 1 = normal, 2 = accent, 3 = first.
  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
      if (analogMode) {
        schedulePlay(normalBufferRef.current, when);
      } else if (beatConfig && Array.isArray(beatConfig)) {
        const state = beatConfig[subIndex];
        if (state === 3) {
          schedulePlay(firstBufferRef.current, when);
        } else if (state === 2) {
          schedulePlay(accentBufferRef.current, when);
        } else {
          schedulePlay(normalBufferRef.current, when);
        }
      } else {
        // Fallback: use accents boolean array
        if (subIndex === 0) {
          schedulePlay(firstBufferRef.current, when);
        } else if (accents[subIndex]) {
          schedulePlay(accentBufferRef.current, when);
        } else {
          schedulePlay(normalBufferRef.current, when);
        }
      }
    },
    [analogMode, beatConfig, accents, schedulePlay]
  );

  // Returns the effective subdivisions; override to 2 if in analog mode.
  const getEffectiveSubdivisions = useCallback(() => {
    if (analogMode) {
      return 2;
    }
    return Math.max(subdivisions, 1);
  }, [analogMode, subdivisions]);

  // Calculate the interval (in seconds) for the current subdivision.
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempo) return 1;
    const beatSec = 60 / tempo;
    const effSubs = getEffectiveSubdivisions();
    const baseSubSec = beatSec / effSubs;
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

  // Modified scheduler: schedules one note per invocation to avoid simultaneous playback.
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    if (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);
      setCurrentSubdivision(subIndex);
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();
      const effSubs = getEffectiveSubdivisions();
      currentSubRef.current = (subIndex + 1) % effSubs;
      nextNoteTimeRef.current += currentSubIntervalRef.current;
    }
  }, [
    scheduleSubdivision,
    getCurrentSubIntervalSec,
    getEffectiveSubdivisions,
    setCurrentSubdivision
  ]);

  // Start the scheduler using setInterval to repeatedly call scheduler.
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

  // Handle tap tempo input.
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

  // Add keyboard event listeners for space, number keys, and tap tempo (T key)
  useEffect(() => {
    function handleKeydown(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (!analogMode && e.key >= '1' && e.key <= '9') {
        const newSub = parseInt(e.key, 10);
        if (setSubdivisions) {
          setSubdivisions(newSub);
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
    currentSubStartRef,
    currentSubIntervalRef
  };
}
