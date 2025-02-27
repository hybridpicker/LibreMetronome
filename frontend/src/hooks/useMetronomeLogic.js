// File: src/hooks/useMetronomeLogic.js
import { useEffect, useRef, useState, useCallback } from 'react';

let globalAudioCtx = null;
const TEMPO_MIN = 15;
const TEMPO_MAX = 240;
const SCHEDULE_AHEAD_TIME = 0.05; // 50 ms lookahead

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
  beatMultiplier = 1
}) {
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const [actualBpm, setActualBpm] = useState(0);

  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const lookaheadRef = useRef(null);
  const schedulerRunningRef = useRef(false);
  const playedBeatTimesRef = useRef([]);

  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const subdivisionsRef = useRef(subdivisions);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);

  const accentsRef = useRef(accents);
  useEffect(() => { accentsRef.current = accents; }, [accents]);

  const beatConfigRef = useRef(null);
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

  const measureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const muteMeasureCountRef = useRef(0);

  const handleEndOfMeasure = useCallback(() => {
    measureCountRef.current += 1;
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
      // random silence logic if needed
    }
    if (speedMode === 1) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        setTempo(prev => Math.min(Math.round(prev * factor), TEMPO_MAX));
        measureCountRef.current = 0;
      }
    }
  }, [macroMode, speedMode, measuresUntilMute, muteDurationMeasures, measuresUntilSpeedUp, tempoIncreasePercent, setTempo]);

  const shouldMuteThisBeat = useCallback((subIndex) => {
    if (macroMode === 1 && isSilencePhaseRef.current) return true;
    if (macroMode === 2) return Math.random() < muteProbability;
    return false;
  }, [macroMode, muteProbability]);

  const stopScheduler = useCallback(() => {
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
      schedulerRunningRef.current = false;
    }
  }, []);

  const schedulePlay = useCallback((buffer, when) => {
    if (!buffer || !audioCtxRef.current) return;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volumeRef.current;
    source.connect(gainNode).connect(audioCtxRef.current.destination);
    source.start(when);
  }, []);

  const updateActualBpm = useCallback(() => {
    const MAX_BEATS_TO_TRACK = 16;
    const arr = playedBeatTimesRef.current;
    if (arr.length > MAX_BEATS_TO_TRACK) arr.shift();
    if (arr.length < 2) return;
    let totalDiff = 0;
    for (let i = 1; i < arr.length; i++) totalDiff += (arr[i] - arr[i - 1]);
    const avgDiff = totalDiff / (arr.length - 1);
    const newBpm = 60000 / avgDiff;
    setActualBpm(newBpm);
  }, []);

  // New reference to track the last played beat
  const lastPlayedBeatRef = useRef({ time: 0, subIndex: -1 });

  const scheduleSubdivision = useCallback((subIndex, when) => {
    // Check if this beat is played too quickly after the last one (duplicate beat)
    const now = audioCtxRef.current ? audioCtxRef.current.currentTime : 0;
    const minTimeBetweenBeats = 0.05; // 50ms minimum time between beats
    
    // Skip if the first beat (subIndex 0) is played twice in quick succession
    if (subIndex === 0 &&
        lastPlayedBeatRef.current.subIndex === 0 &&
        now - lastPlayedBeatRef.current.time < minTimeBetweenBeats) {
      console.log("[useMetronomeLogic] Preventing duplicate first beat");
      return; // Skip playing this beat
    }
    
    // Update the timestamp and index of the last played beat
    lastPlayedBeatRef.current = { time: now, subIndex };
    
    if (!shouldMuteThisBeat(subIndex)) {
      playedBeatTimesRef.current.push(performance.now());
      updateActualBpm();
    }
    if (shouldMuteThisBeat(subIndex)) return;
    if (analogMode) {
      schedulePlay(normalBufferRef.current, when);
    } else if (gridMode) {
      const state = beatConfigRef.current[subIndex];
      if (state === 3) schedulePlay(firstBufferRef.current, when);
      else if (state === 2) schedulePlay(accentBufferRef.current, when);
      else if (state === 1) schedulePlay(normalBufferRef.current, when);
    } else {
      if (subIndex === 0) schedulePlay(firstBufferRef.current, when);
      else {
        const state = accentsRef.current[subIndex];
        if (state === 2) schedulePlay(accentBufferRef.current, when);
        else if (state === 1) schedulePlay(normalBufferRef.current, when);
      }
    }
  }, [analogMode, gridMode, schedulePlay, shouldMuteThisBeat, updateActualBpm]);

  const getCurrentSubIntervalSec = useCallback(() => {
    if (!tempoRef.current) return 0.5;
    const secPerHit = 60 / (tempoRef.current * beatMultiplier);
    if (subdivisionsRef.current >= 2) {
      const isEvenSub = (currentSubRef.current % 2 === 0);
      const swingFactor = swingRef.current || 0;
      if (swingFactor > 0) return isEvenSub ? secPerHit * (1 + swingFactor) : secPerHit * (1 - swingFactor);
    }
    return secPerHit;
  }, [beatMultiplier]);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    while (nextNoteTimeRef.current < now + SCHEDULE_AHEAD_TIME) {
      const subIndex = currentSubRef.current;
      scheduleSubdivision(subIndex, nextNoteTimeRef.current);
      setCurrentSubdivision(subIndex);
      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();
      currentSubRef.current = (subIndex + 1) % subdivisionsRef.current;
      nextNoteTimeRef.current += currentSubIntervalRef.current;
      if (currentSubRef.current === 0) handleEndOfMeasure();
    }
  }, [scheduleSubdivision, getCurrentSubIntervalSec, handleEndOfMeasure]);

  const startScheduler = useCallback(() => {
    if (schedulerRunningRef.current) return;
    stopScheduler();
    if (!audioCtxRef.current) return;
    currentSubRef.current = 0;
    setCurrentSubdivision(0);
    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();
    playedBeatTimesRef.current = [];
    lookaheadRef.current = setInterval(scheduler, 25);
    schedulerRunningRef.current = true;
  }, [stopScheduler, scheduler, getCurrentSubIntervalSec]);

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
    loadSound('/assets/audio/click_new.mp3', (buf) => { normalBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_accent.mp3', (buf) => { accentBufferRef.current = buf; });
    loadSound('/assets/audio/click_new_first.mp3', (buf) => { firstBufferRef.current = buf; });
    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; }
  }, []);

  useEffect(() => {
    if (!isPaused) {
      stopScheduler();
      startScheduler();
    }
  }, [accents, isPaused, stopScheduler, startScheduler]);

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