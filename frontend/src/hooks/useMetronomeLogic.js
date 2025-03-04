import { useEffect, useRef, useState, useCallback } from "react";

let globalAudioCtx = null;

const TEMPO_MIN = 15;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // 50 ms scheduling lookahead

export default function useMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
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
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2,
  beatMultiplier = 1,
  multiCircleMode = false,
}) {
  // Track the current subdivision we are on (0..subdivisions-1)
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  // Display the actual BPM if you want to measure it from real timings
  const [actualBpm, setActualBpm] = useState(0);

  // References to the AudioContext and buffers
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Next note scheduling
  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const lookaheadRef = useRef(null);
  const schedulerRunningRef = useRef(false);
  const playedBeatTimesRef = useRef([]);

  // Keep real-time copies for immediate reading
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const subdivisionsRef = useRef(subdivisions);
  const accentsRef = useRef(accents);
  const beatConfigRef = useRef(null);

  // Mute logic references
  const measureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const muteMeasureCountRef = useRef(0);

  // Keep references updated
  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);
  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    subdivisionsRef.current = subdivisions;
  }, [subdivisions]);
  useEffect(() => {
    accentsRef.current = accents;
  }, [accents]);

  // Optionally handle a beatConfig array if using "gridMode"
  useEffect(() => {
    if (gridMode) {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      }
    } else {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      }
    }
  }, [beatConfig, subdivisions, gridMode]);

  // ===============================
  // Macro/speed training logic
  // ===============================
  const handleEndOfMeasure = useCallback(() => {
    measureCountRef.current += 1;

    // Macro Mode 1: “Silence after X measures, then come back”
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
      // Additional “random silence” or other logic could go here
    }

    // Speed Mode 1: Increase tempo every X measures
    if (speedMode === 1) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        setTempo((prev) => Math.min(Math.round(prev * factor), TEMPO_MAX));
        measureCountRef.current = 0;
      }
    }
  }, [macroMode, speedMode, measuresUntilMute, muteDurationMeasures, measuresUntilSpeedUp, tempoIncreasePercent, setTempo]);

  // Decide if a given beat should be muted (based on macroMode)
  const shouldMuteThisBeat = useCallback(
    (subIndex) => {
      if (macroMode === 1 && isSilencePhaseRef.current) return true;
      if (macroMode === 2) {
        // Possibly random mute
        return Math.random() < muteProbability;
      }
      return false;
    },
    [macroMode, muteProbability]
  );

  // ===============================
  // Start/Stop the scheduler
  // ===============================
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    schedulerRunningRef.current = false;
  }, []);

  // ===============================
  // Scheduling audio (play buffer)
  // ===============================
  const schedulePlay = useCallback((buffer, when) => {
    if (!buffer || !audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    if (when <= now) {
      when = now + 0.01;
    }
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.setValueAtTime(0, when - 0.005);
    gainNode.gain.linearRampToValueAtTime(volumeRef.current, when);

    source.connect(gainNode).connect(audioCtxRef.current.destination);
    source.start(when);

    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
  }, []);

  // Keep track of “actual BPM” if you want an average
  const updateActualBpm = useCallback(() => {
    const MAX_BEATS = 16;
    const arr = playedBeatTimesRef.current;
    if (arr.length > MAX_BEATS) arr.shift();
    if (arr.length < 2) return;

    let totalDiff = 0;
    for (let i = 1; i < arr.length; i++) {
      totalDiff += arr[i] - arr[i - 1];
    }
    const avgDiff = totalDiff / (arr.length - 1);
    const newBpm = 60000 / avgDiff;
    setActualBpm(newBpm);
  }, []);

  // ===============================
  // Schedule each subdivision
  // ===============================
  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
      // For logging: subIndex=0 => first beat
      if (subIndex === 0) {
        console.log(`[useMetronomeLogic] Scheduling FIRST_BEAT (subIndex=0) at time = ${when.toFixed(3)}`);
      }

      const now = audioCtxRef.current ? audioCtxRef.current.currentTime : 0;
      if (when < now) {
        when = now + 0.02;
      }

      if (!shouldMuteThisBeat(subIndex)) {
        playedBeatTimesRef.current.push(performance.now());
        updateActualBpm();
      } 

      if (shouldMuteThisBeat(subIndex)) {
        // If muted, skip playing
        return;
      }

      // Decide which buffer to play
      let buffer = null;
      if (analogMode) {
        // All same sound
        buffer = normalBufferRef.current;
      } else if (gridMode) {
        // Possibly use beatConfig for accent info
        const state = beatConfigRef.current[subIndex];
        if (state === 3) buffer = firstBufferRef.current;
        else if (state === 2) buffer = accentBufferRef.current;
        else if (state === 1) buffer = normalBufferRef.current;
      } else {
        // Standard circle accents
        if (subIndex === 0) {
          buffer = firstBufferRef.current;
        } else {
          const state = accentsRef.current[subIndex];
          if (state === 2) buffer = accentBufferRef.current;
          else if (state === 1) buffer = normalBufferRef.current;
        }
      }
      if (buffer) {
        schedulePlay(buffer, when);
      }
    },
    [analogMode, gridMode, schedulePlay, shouldMuteThisBeat, updateActualBpm]
  );

  // ===============================
  // Interval between subdivisions
  // Note: If beatMultiplier=2 => half the duration => double speed
  // ===============================
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempoRef.current) return 0.5;
    // e.g. for quarter notes => 1, for eighth => 2
    // => if multiplier=2, effectively the "tempo" is doubled
    const secPerHit = 60 / (tempoRef.current * beatMultiplier);

    // Optional swing if we have >=2 subdivisions
    if (subdivisionsRef.current >= 2) {
      const isEvenSub = currentSubRef.current % 2 === 0;
      const swingFactor = swingRef.current || 0;
      if (swingFactor > 0) {
        return isEvenSub ? secPerHit * (1 + swingFactor) : secPerHit * (1 - swingFactor);
      }
    }
    return secPerHit;
  }, [beatMultiplier]);

  // ===============================
  // The main scheduling loop
  // ===============================
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    const effectiveAhead = multiCircleMode ? SCHEDULE_AHEAD_TIME * 1.2 : SCHEDULE_AHEAD_TIME;

    while (nextNoteTimeRef.current < now + effectiveAhead) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);

      // Update React state for the current subdivision
      setCurrentSubdivision(subIndex);

      // Advance the scheduling time for the next sub
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();
      currentSubRef.current = (subIndex + 1) % subdivisionsRef.current;
      nextNoteTimeRef.current += currentSubIntervalRef.current;

      // If we wrapped around => finished a measure
      if (currentSubRef.current === 0) {
        handleEndOfMeasure();
      }
    }
  }, [scheduleSubdivision, getCurrentSubIntervalSec, handleEndOfMeasure, multiCircleMode]);

  // ===============================
  // Start the scheduler
  // ===============================
  const startScheduler = useCallback((startTime = null) => {
    console.log("[useMetronomeLogic] startScheduler() called");
    if (schedulerRunningRef.current) return;
    stopScheduler();

    if (!audioCtxRef.current) return;
    schedulerRunningRef.current = true;

    currentSubRef.current = 0;
    setCurrentSubdivision(0);

    const now = audioCtxRef.current.currentTime;
    nextNoteTimeRef.current = startTime !== null ? startTime : now;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();
    playedBeatTimesRef.current = [];

    // Start the scheduling loop
    lookaheadRef.current = setInterval(scheduler, 20);
  }, [stopScheduler, scheduler, getCurrentSubIntervalSec]);

  // ===============================
  // Tap Tempo
  // ===============================
  const tapTimesRef = useRef([]);
  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 5) tapTimesRef.current.shift();
    if (tapTimesRef.current.length > 1) {
      let sum = 0;
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        sum += tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      }
      const avgMs = sum / (tapTimesRef.current.length - 1);
      const newTempo = Math.round(60000 / avgMs);
      const clamped = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
      if (setTempo) setTempo(clamped);

      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;
    }
  }, [setTempo]);

  // ===============================
  // Load Audio Buffers (Click Sounds)
  // ===============================
  useEffect(() => {
    if (!globalAudioCtx || globalAudioCtx.state === "closed") {
      try {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
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
        .then((arrBuf) => audioCtxRef.current.decodeAudioData(arrBuf))
        .then((decoded) => callback(decoded))
        .catch(() => {});
    };

    // Adjust these to your correct paths
    loadSound("/assets/audio/click_new.mp3", (b) => {
      normalBufferRef.current = b;
    });
    loadSound("/assets/audio/click_new_accent.mp3", (b) => {
      accentBufferRef.current = b;
    });
    loadSound("/assets/audio/click_new_first.mp3", (b) => {
      firstBufferRef.current = b;
    });

    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  // ===============================
  // Start/stop based on isPaused
  // ===============================
  useEffect(() => {
    if (!isPaused) {
      if (!schedulerRunningRef.current) {
        startScheduler();
      }
    } else {
      stopScheduler();
    }
  }, [isPaused, startScheduler, stopScheduler]);

  // ===============================
  // Return the hook’s interface
  // ===============================
  return {
    currentSubdivision,
    actualBpm,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler,
  };
}