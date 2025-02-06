// src/components/useMetronomeLogic.js

import { useEffect, useRef, useState, useCallback } from 'react';

/*
 * This hook handles:
 * - Audio scheduling (Web Audio)
 * - currentSubdivision index
 * - Tap Tempo
 * - Start/Stop logic
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
  setSubdivisions
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
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const lookaheadRef = useRef(null);

  // Tap Tempo
  const tapTimesRef = useRef([]);

  // stopScheduler: stops the scheduling interval
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
  }, []);

  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.error("Web Audio API not supported:", err);
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

    // Replace with your actual audio file paths
    loadSound("/assets/audio/click_new.mp3", (buf) => {
      normalBufferRef.current = buf;
    });
    loadSound("/assets/audio/click_new_accent.mp3", (buf) => {
      accentBufferRef.current = buf;
    });
    loadSound("/assets/audio/click_new_first.mp3", (buf) => {
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

  // scheduleSubdivision: schedules the appropriate sound for the current subdivision
  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
      // first beat
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

  // getCurrentSubIntervalSec: calculates the time interval for the current subdivision
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempo) return 1;
    const beatSec = 60 / tempo;
    const baseSubSec = beatSec / Math.max(subdivisions, 1);

    if (subdivisions >= 2) {
      // Apply swing/shuffle:
      // For even indices (first note in pair): use (1 + swing) => longer, dotted
      // For odd indices (second note in pair): use (1 - swing) => shorter, sixteenth-like
      if (currentSubRef.current % 2 === 0) {
        return baseSubSec * (1 + swing);
      } else {
        return baseSubSec * (1 - swing);
      }
    }
    return baseSubSec;
  }, [tempo, subdivisions, swing]);

  // scheduler: schedules notes ahead of time
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);
      setCurrentSubdivision(subIndex);

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

  // startScheduler: initializes the scheduling
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

  // handleTapTempo: calculates new tempo based on tap timings
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
      } else if (e.key >= '1' && e.key <= '9') {
        if (setSubdivisions) {
          setSubdivisions(parseInt(e.key, 10));
        }
      } else if (e.key.toLowerCase() === 't') {
        handleTapTempo();
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [setIsPaused, setSubdivisions, handleTapTempo]);

  // Start/stop scheduler based on isPaused
  useEffect(() => {
    if (isPaused) {
      stopScheduler();
      setCurrentSubdivision(0);
    } else {
      startScheduler();
    }
    return () => stopScheduler();
  }, [isPaused, startScheduler, stopScheduler]);

  return {
    currentSubdivision,
    tapTempo: handleTapTempo,
    audioCtx: audioCtxRef.current
  };
}

