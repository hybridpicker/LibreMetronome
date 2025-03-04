// File: src/hooks/useMetronomeLogic.js

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

  /**
   * NEW optional callback: Fired every time a beat is scheduled, regardless of subIndex.
   * This is how we can animate each beat in the UI. 
   */
  onAnySubTrigger = null
}) {
  // Track the current subdivision we are on (0..subdivisions-1)
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  // Optional: track “actual BPM” if you want to measure real timings
  const [actualBpm, setActualBpm] = useState(0);

  // References for the AudioContext and the loaded click buffers
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
  const schedulerRunningRef = useRef(false);
  const playedBeatTimesRef = useRef([]);

  // Mirror some props into refs for easy read in callbacks
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

  // Keep them updated if parent changes
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

  // Grid beat config if needed
  useEffect(() => {
    if (gridMode) {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) =>
          i === 0 ? 3 : 1
        );
      }
    } else {
      if (beatConfig && beatConfig.length === subdivisions) {
        beatConfigRef.current = beatConfig;
      } else {
        beatConfigRef.current = Array.from({ length: subdivisions }, (_, i) =>
          i === 0 ? 3 : 1
        );
      }
    }
  }, [beatConfig, subdivisions, gridMode]);

  // =====================================================
  // Macro/speed training logic
  // =====================================================
  const handleEndOfMeasure = useCallback(() => {
    measureCountRef.current += 1;

    // Macro mode 1: fixed silence after X measures
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
      // Additional “random silence” logic could go here
    }

    // Speed mode 1: Increase tempo after X measures
    if (speedMode === 1) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        setTempo((prev) => Math.min(Math.round(prev * factor), TEMPO_MAX));
        measureCountRef.current = 0;
      }
    }
  }, [
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    setTempo
  ]);

  const shouldMuteThisBeat = useCallback(
    (subIndex) => {
      if (macroMode === 1 && isSilencePhaseRef.current) return true;
      if (macroMode === 2) {
        // random chance of mute
        return Math.random() < muteProbability;
      }
      return false;
    },
    [macroMode, muteProbability]
  );

  // =====================================================
  // Start/Stop the scheduler
  // =====================================================
  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    schedulerRunningRef.current = false;
  }, []);

  // =====================================================
  // schedulePlay - to actually schedule an audio buffer
  // =====================================================
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

  // For measuring actual BPM from real intervals
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

  // =====================================================
  // scheduleSubdivision - called for each upcoming beat
  // =====================================================
  const scheduleSubdivision = useCallback(
    (subIndex, when) => {
      // Fire the user callback for ANY sub
      if (onAnySubTrigger) {
        onAnySubTrigger(subIndex);
      }

      // For logging
      if (subIndex === 0) {
        console.log(
          `[useMetronomeLogic] Scheduling FIRST_BEAT (subIndex=0) at time = ${when.toFixed(3)}`
        );
      }

      const now = audioCtxRef.current ? audioCtxRef.current.currentTime : 0;
      if (when < now) {
        when = now + 0.02;
      }

      // If we’re not muting this beat:
      if (!shouldMuteThisBeat(subIndex)) {
        playedBeatTimesRef.current.push(performance.now());
        updateActualBpm(); // optional BPM tracking
      } else {
        // If muted, skip playing audio
        return;
      }

      // Decide which audio buffer to play
      let buffer = null;
      if (analogMode) {
        buffer = normalBufferRef.current; // all same sound in analog mode
      } else if (gridMode) {
        // possibly use a beatConfig for accent info
        const state = beatConfigRef.current[subIndex];
        if (state === 3) buffer = firstBufferRef.current;
        else if (state === 2) buffer = accentBufferRef.current;
        else if (state === 1) buffer = normalBufferRef.current;
      } else {
        // Standard circle mode
        if (subIndex === 0) {
          buffer = firstBufferRef.current;
        } else {
          const accentVal = accentsRef.current[subIndex];
          if (accentVal === 2) buffer = accentBufferRef.current;
          else if (accentVal === 1) buffer = normalBufferRef.current;
        }
      }
      if (buffer) {
        schedulePlay(buffer, when);
      }
    },
    [
      onAnySubTrigger,
      analogMode,
      gridMode,
      schedulePlay,
      shouldMuteThisBeat,
      updateActualBpm
    ]
  );

  // =====================================================
  // getCurrentSubIntervalSec
  // =====================================================
  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempoRef.current) return 0.5;
    const secPerHit = 60 / (tempoRef.current * beatMultiplier);

    // If we have >=2 subs and a swing factor:
    if (subdivisionsRef.current >= 2) {
      const isEvenSub = currentSubRef.current % 2 === 0;
      const sFactor = swingRef.current || 0;
      if (sFactor > 0) {
        return isEvenSub
          ? secPerHit * (1 + sFactor)
          : secPerHit * (1 - sFactor);
      }
    }
    return secPerHit;
  }, [beatMultiplier]);

  // =====================================================
  // scheduler - the main loop that schedules upcoming hits
  // =====================================================
  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    const ahead = multiCircleMode ? SCHEDULE_AHEAD_TIME * 1.2 : SCHEDULE_AHEAD_TIME;

    while (nextNoteTimeRef.current < now + ahead) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);

      // update UI state
      setCurrentSubdivision(subIndex);

      // move on to next sub
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();
      currentSubRef.current = (subIndex + 1) % subdivisionsRef.current;
      nextNoteTimeRef.current += currentSubIntervalRef.current;

      // measure boundary
      if (currentSubRef.current === 0) {
        handleEndOfMeasure();
      }
    }
  }, [scheduleSubdivision, getCurrentSubIntervalSec, handleEndOfMeasure, multiCircleMode]);

  // =====================================================
  // startScheduler
  // =====================================================
  const startScheduler = useCallback(
    (startTime = null) => {
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
    },
    [stopScheduler, scheduler, getCurrentSubIntervalSec]
  );

  // =====================================================
  // Tap Tempo
  // =====================================================
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

  // =====================================================
  // Audio loading
  // =====================================================
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

    // Example file paths
    loadSound("/assets/audio/click_new.mp3", (b) => {
      normalBufferRef.current = b;
    });
    loadSound("/assets/audio/click_new_accent.mp3", (b) => {
      accentBufferRef.current = b;
    });
    loadSound("/assets/audio/click_new_first.mp3", (b) => {
      firstBufferRef.current = b;
    });

    // Stop scheduler if unmount
    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  // =====================================================
  // Start/Stop based on isPaused
  // =====================================================
  useEffect(() => {
    if (!isPaused) {
      if (!schedulerRunningRef.current) {
        startScheduler();
      }
    } else {
      stopScheduler();
    }
  }, [isPaused, startScheduler, stopScheduler]);

  // =====================================================
  // Return the hook’s interface
  // =====================================================
  return {
    currentSubdivision,
    actualBpm,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler
  };
}
