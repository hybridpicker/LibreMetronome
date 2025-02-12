import { useEffect, useRef, useState, useCallback } from 'react';

const TEMPO_MIN = 30;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // Lookahead window in seconds (50ms)

export default function useMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
  isPaused,
  setIsPaused,
  swing,
  volume,
  accents = [],
  beatConfig, // In Grid mode: array where 1 = new_click, 2 = click_new_accent, 3 = click_new_first
  setSubdivisions,
  analogMode = false
}) {
  // State for current subdivision (used for visual synchronization)
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // AudioContext and buffer references
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
  const tapTimesRef = useRef([]);

  // Ref to indicate whether the scheduler is running
  const schedulerRunningRef = useRef(false);

  // Use a ref to always hold the latest beatConfig (Grid state)
  const beatConfigRef = useRef(beatConfig);
  useEffect(() => {
    beatConfigRef.current = beatConfig;
  }, [beatConfig]);

  // stopScheduler: Clears the scheduler interval and marks scheduler as stopped.
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
      schedulerRunningRef.current = false;
    }
  }, []);

  // Setup AudioContext and load audio files from public/assets/audio
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.error('Web Audio API not supported:', err);
      return;
    }

    // Helper: Load and decode an audio file
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

    // Load sound files:
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

  // schedulePlay: Schedules playback of a given audio buffer at time "when".
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

  // scheduleSubdivision: Chooses which sound to play based on the current beat configuration.
  // For Grid mode:
  // • 1 active square → play new_click (normalBuffer)
  // • 2 active squares → play click_new_accent (accentBuffer)
  // • 3 active squares → play click_new_first (firstBuffer)
  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
      if (analogMode) {
        schedulePlay(normalBufferRef.current, when);
      } else if (beatConfigRef.current && Array.isArray(beatConfigRef.current)) {
        const state = beatConfigRef.current[subIndex];
        if (state === 3) {
          schedulePlay(firstBufferRef.current, when);
        } else if (state === 2) {
          schedulePlay(accentBufferRef.current, when);
        } else {
          schedulePlay(normalBufferRef.current, when);
        }
      } else {
        // Fallback: if no beatConfig is provided, use accents array.
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

  // getEffectiveSubdivisions: Returns the number of subdivisions (overridden to 2 in analog mode)
  const getEffectiveSubdivisions = useCallback(() => {
    if (analogMode) {
      return 2;
    }
    return Math.max(subdivisions, 1);
  }, [analogMode, subdivisions]);

  // getCurrentSubIntervalSec: Calculates the interval (in seconds) for the current subdivision.
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempo) return 1;
    const beatSec = 60 / tempo;
    const effSubs = getEffectiveSubdivisions();
    const baseSubSec = beatSec / effSubs;
    if (!analogMode && effSubs >= 2) {
      // Apply swing: alternate the interval durations.
      if (currentSubRef.current % 2 === 0) {
        return baseSubSec * (1 + swing);
      } else {
        return baseSubSec * (1 - swing);
      }
    } else {
      return baseSubSec;
    }
  }, [tempo, swing, analogMode, getEffectiveSubdivisions]);

  // scheduler: Schedules all notes that must occur within the lookahead window.
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);
      // Update visual state.
      setCurrentSubdivision(subIndex);
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();
      const effSubs = getEffectiveSubdivisions();
      currentSubRef.current = (subIndex + 1) % effSubs;
      nextNoteTimeRef.current += currentSubIntervalRef.current;
    }
  }, [scheduleSubdivision, getCurrentSubIntervalSec, getEffectiveSubdivisions]);

  // startScheduler: Initializes scheduling parameters and starts the interval.
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
  }, [stopScheduler, getCurrentSubIntervalSec, scheduler]);

  // handleTapTempo: Adjusts the tempo based on user tap timings.
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

  // Add keyboard event listeners for Space (toggle play/pause), number keys (change subdivisions), and 't' (tap tempo)
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

  // Effect: Start or stop the scheduler based on the isPaused state.
  useEffect(() => {
    if (!audioCtxRef.current) return;
    if (!isPaused) {
      if (!schedulerRunningRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().then(() => {
            startScheduler();
          });
        } else {
          startScheduler();
        }
      }
    } else {
      if (schedulerRunningRef.current) {
        stopScheduler();
      }
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
