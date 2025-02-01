// src/components/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

// Define tempo boundaries and scheduling parameters
const TEMPO_MIN = 30;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // Seconds to schedule ahead

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

  // For tap tempo functionality
  const tapTimesRef = useRef([]);

  // Initialize AudioContext and load audio buffers
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
      stopScheduler();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to load and decode an audio file
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

  // Schedule playback for a given audio buffer
  function schedulePlay(buffer, when) {
    if (!buffer || !audioCtxRef.current) return;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode).connect(audioCtxRef.current.destination);
    source.start(when);
  }

  // Calculate the duration of the current subdivision (applying swing)
  const getCurrentSubIntervalSec = useCallback(() => {
    const baseSec = (60 / tempo) / Math.max(subdivisions, 1);
    if (subdivisions > 1) {
      return currentSubRef.current % 2 === 0
        ? baseSec * (1 + swing)
        : baseSec * (1 - swing);
    }
    return baseSec;
  }, [tempo, subdivisions, swing]);

  // Schedule a subdivision sound based on accent settings
  const scheduleSubdivision = useCallback((subIndex, when) => {
    if (subIndex === 0) {
      schedulePlay(firstBufferRef.current, when);
    } else if (accents[subIndex]) {
      schedulePlay(accentBufferRef.current, when);
    } else {
      schedulePlay(normalBufferRef.current, when);
    }
  }, [accents, volume]);

  // Scheduler function to schedule upcoming subdivision sounds
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      scheduleSubdivision(currentSubRef.current, nextNoteTimeRef.current);
      setCurrentSubdivision(currentSubRef.current);

      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();

      currentSubRef.current = (currentSubRef.current + 1) % Math.max(subdivisions, 1);
      nextNoteTimeRef.current += currentSubIntervalRef.current;
    }
  }, [tempo, subdivisions, swing, volume, accents, getCurrentSubIntervalSec, scheduleSubdivision]);

  // Tap tempo: calculates the average interval between taps and adjusts the tempo accordingly
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

  // Start the metronome scheduler
  function startScheduler() {
    stopScheduler(); // Clear any existing scheduler
    if (!audioCtxRef.current) return;
    currentSubRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();
    lookaheadRef.current = setInterval(scheduler, 25);
  }

  // Stop the metronome scheduler
  function stopScheduler() {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
  }

  // Handle keyboard events: Space to toggle play/pause, 1-9 to change subdivisions, T for tap tempo
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

  // Start or stop the scheduler based on the isPaused state
  useEffect(() => {
    if (isPaused) {
      stopScheduler();
    } else {
      startScheduler();
    }
    return () => stopScheduler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, scheduler]);

  return {
    currentSubdivision,
    currentSubStartRef,
    currentSubIntervalRef,
    audioCtx: audioCtxRef.current
  };
}
