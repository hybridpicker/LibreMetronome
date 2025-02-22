// File: src/hooks/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

// We keep one global AudioContext across mounts
let globalAudioCtx = null;

const TEMPO_MIN = 15;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // 50 ms lookahead

export default function useMetronomeLogic({
  // Main props
  tempo,              // e.g. 120 => each beat occurs 120 times per minute
  setTempo,
  subdivisions,       // e.g. 4 => 4 hits per measure
  setSubdivisions,
  isPaused,
  setIsPaused,
  swing,
  setSwing,
  volume,
  setVolume,
  accents = [],
  beatConfig = null,
  analogMode = false,
  gridMode = false,
  // Training mode parameters
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2
}) {
  // Which "subdivision index" are we currently playing? (0..subdivisions-1)
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Measure the actual BPM to verify that it stays near the tempo
  const [actualBpm, setActualBpm] = useState(0);

  // AudioContext and Sound Buffers
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
  const schedulerRunningRef = useRef(false);

  // We store timestamps (ms) of each played beat to measure real BPM
  const playedBeatTimesRef = useRef([]);

  // Using refs for dynamic parameters
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const subdivisionsRef = useRef(subdivisions);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);

  // Accents stored in ref
  const accentsRef = useRef(accents);
  useEffect(() => {
    accentsRef.current = accents;
  }, [accents]);

  // Optional: Beat Config for certain modes
  const beatConfigRef = useRef(null);
  useEffect(() => {
    if (gridMode) {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        // fallback
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      }
    } else {
      // circle or default
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      }
    }
  }, [beatConfig, subdivisions, gridMode]);

  // Training mode counters
  const measureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const muteMeasureCountRef = useRef(0);

  const handleEndOfMeasure = useCallback(() => {
    measureCountRef.current += 1;

    // Example: Macro mode 1 => fixed silence after X measures
    if (macroMode === 1) {
      if (!isSilencePhaseRef.current) {
        if (measureCountRef.current >= measuresUntilMute) {
          isSilencePhaseRef.current = true;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0;
        }
      } else {
        muteMeasureCountRef.current += 1;
        if (muteMeasureCountRef.current >= muteDurationMeasures) {
          isSilencePhaseRef.current = false;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0;
        }
      }
    } else if (macroMode === 2) {
      // random silence if needed
    }

    // Speed Mode: auto-increase tempo after certain measures
    if (speedMode === 1) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        setTempo(prev => Math.min(Math.round(prev * factor), TEMPO_MAX));
        measureCountRef.current = 0;
      }
    }
  }, [
    macroMode, speedMode,
    measuresUntilMute, muteDurationMeasures,
    measuresUntilSpeedUp, tempoIncreasePercent,
    setTempo
  ]);

  // Decide whether to mute a certain beat
  const shouldMuteThisBeat = useCallback((subIndex) => {
    if (macroMode === 1 && isSilencePhaseRef.current) {
      return true;
    }
    if (macroMode === 2) {
      return Math.random() < muteProbability;
    }
    return false;
  }, [macroMode, muteProbability]);

  // Stop the scheduler
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
      schedulerRunningRef.current = false;
    }
  }, []);

  // Helper to schedule audio playback
  const schedulePlay = useCallback((buffer, when) => {
    if (!buffer || !audioCtxRef.current) return;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volumeRef.current;
    source.connect(gainNode).connect(audioCtxRef.current.destination);
    source.start(when);
  }, []);

  /**
   * updateActualBpm:
   * Measure every beat's timestamp (including subdivisions).
   */
  const updateActualBpm = useCallback(() => {
    const MAX_BEATS_TO_TRACK = 16;
    const arr = playedBeatTimesRef.current;

    if (arr.length > MAX_BEATS_TO_TRACK) {
      arr.shift();
    }
    if (arr.length < 2) return;

    let totalDiff = 0;
    for (let i = 1; i < arr.length; i++) {
      totalDiff += (arr[i] - arr[i - 1]);
    }
    const avgDiff = totalDiff / (arr.length - 1);
    // Convert ms -> BPM => 60,000 ms = 1 minute
    const newBpm = 60000 / avgDiff;
    setActualBpm(newBpm);
  }, []);

  /**
   * scheduleSubdivision:
   * In this new logic, every "subIndex" is spaced by the same time
   * (the user wants each beat to be 1/tempo minutes, i.e. 60/tempo sec).
   */
  const scheduleSubdivision = useCallback((subIndex, when) => {
    // Record the time if it's not muted
    if (!shouldMuteThisBeat(subIndex)) {
      playedBeatTimesRef.current.push(performance.now());
      updateActualBpm();
    }

    if (shouldMuteThisBeat(subIndex)) {
      return; // no sound
    }

    // scheduling the actual buffer
    if (analogMode) {
      schedulePlay(normalBufferRef.current, when);
    } else if (gridMode) {
      const state = beatConfigRef.current[subIndex];
      if (state === 3) {
        schedulePlay(firstBufferRef.current, when);
      } else if (state === 2) {
        schedulePlay(accentBufferRef.current, when);
      } else if (state === 1) {
        schedulePlay(normalBufferRef.current, when);
      }
    } else {
      // circle mode
      if (subIndex === 0) {
        schedulePlay(firstBufferRef.current, when);
      } else {
        const state = accentsRef.current[subIndex];
        if (state === 2) {
          schedulePlay(accentBufferRef.current, when);
        } else if (state === 1) {
          schedulePlay(normalBufferRef.current, when);
        }
      }
    }
  }, [
    analogMode,
    gridMode,
    schedulePlay,
    shouldMuteThisBeat,
    updateActualBpm
  ]);

  /**
   * getCurrentSubIntervalSec:
   * The user wants "120 BPM" => 120 hits per minute => 0.5s between hits,
   * irrespective of subdivisions. So the base interval is simply (60 / tempo).
   */
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempoRef.current) return 0.5;

    const secPerHit = 60 / tempoRef.current; // e.g. 60/120=0.5s

    // If we want to apply swing, we do it only on pairs of hits, for example:
    // how swing acts if each beat is considered a "main beat".

    if (subdivisionsRef.current >= 2) {
      // If we actually want swing:
      const isEvenSub = (currentSubRef.current % 2 === 0);
      const swingFactor = swingRef.current || 0; // 0..0.5
      if (swingFactor > 0) {
        if (isEvenSub) {
          // lengthen this hit
          return secPerHit * (1 + swingFactor);
        } else {
          // shorten this next one
          return secPerHit * (1 - swingFactor);
        }
      }
    }

    return secPerHit;
  }, []);

  /**
   * scheduler
   */
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;

    // as long as we have room in the lookahead, schedule more hits
    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;

      // schedule the current subIndex
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);

      // update UI
      setCurrentSubdivision(subIndex);

      // store info for animations
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();

      // go to the next subdivision
      currentSubRef.current = (subIndex + 1) % subdivisionsRef.current;

      // increment the next note time by the *constant* beat interval
      nextNoteTimeRef.current += currentSubIntervalRef.current;

      // if we're back at 0 => that means we finished one measure
      if (currentSubRef.current === 0) {
        handleEndOfMeasure();
      }
    }
  }, [
    scheduleSubdivision,
    getCurrentSubIntervalSec,
    handleEndOfMeasure
  ]);

  /**
   * startScheduler:
   * Resets counters, sets nextNoteTime, and starts the loop.
   */
  const startScheduler = useCallback(() => {
    if (schedulerRunningRef.current) return;
    stopScheduler();
    if (!audioCtxRef.current) return;

    // reset
    currentSubRef.current = 0;
    setCurrentSubdivision(0);

    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();

    playedBeatTimesRef.current = []; // clear old data

    // run the scheduler every 25ms
    lookaheadRef.current = setInterval(scheduler, 25);
    schedulerRunningRef.current = true;
  }, [stopScheduler, scheduler, getCurrentSubIntervalSec]);

  // tapTempo logic
  const tapTimesRef = useRef([]);
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
      const avgMs = sum / (tapTimesRef.current.length - 1);
      const newTempo = Math.round(60000 / avgMs);
      const clamped = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
      if (setTempo) setTempo(clamped);

      // reset training mode counters
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
    }
  }, [setTempo]);

  // Init AudioContext & load sounds
  useEffect(() => {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      try {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
        .then((arrBuffer) => audioCtxRef.current.decodeAudioData(arrBuffer))
        .then(decoded => callback(decoded))
        .catch(err => console.error(`Error loading ${url}:`, err));
    };

    // Example file paths
    loadSound('/assets/audio/click_new.mp3', (buf) => { normalBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_accent.mp3', (buf) => { accentBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_first.mp3', (buf) => { firstBufferRef.current = buf; });

    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  // Prevent auto-start on mount
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
    }
  }, []);

  // If not paused, restart whenever accents changes
  useEffect(() => {
    if (!isPaused) {
      stopScheduler();
      startScheduler();
    }
  }, [accents, isPaused, stopScheduler, startScheduler]);

  // Return everything for usage in your UI
  return {
    currentSubdivision,
    actualBpm, // measured actual BPM - each hit is "one beat"
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler
  };
}
