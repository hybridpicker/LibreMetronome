// src/hooks/useMultiCircleScheduler.js

import { useEffect, useRef, useState, useCallback } from "react";

// Reuse or adapt from your single circle logic
import { runScheduler, scheduleSubdivision } from "./useMetronomeLogic/scheduler";
import { initAudioContext, loadClickBuffers } from "./useMetronomeLogic/audioBuffers";
import { getActiveSoundSet } from '../services/soundSetService';
import { shouldMuteThisBeat } from "./useMetronomeLogic/trainingLogic";

/**
 * Example usage:
 *   const { start, stop, currentBar, isSilencePhaseRef } = useMultiCircleScheduler({
 *     tempo,
 *     circleSettings,        // array of { subdivisions, accents, beatMode } 
 *     macroMode,             // (0=off,1=fixed silence,2=random)
 *     speedMode,
 *     measuresUntilMute,
 *     muteDurationMeasures,
 *     muteProbability,
 *     tempoIncreasePercent,
 *     measuresUntilSpeedUp,
 *     isPaused, 
 *     volume,
 *     swing,
 *     ...
 *   });
 * 
 * Then call `start()` on play, or `stop()` on pause.
 * The scheduler will schedule all circles in parallel for each bar.
 */

export default function useMultiCircleScheduler({
  tempo,
  circleSettings, // array of objects
  isPaused,
  volume = 0.5,
  swing = 0,
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2,
  onBeatTriggered,   // optional callback for UI animations (fired every subHit)
}) {
  const audioCtxRef = useRef(null);

  // Refs to store decoded click sounds
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // For measure-based silence logic
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);

  // For the scheduling loop
  const [currentBar, setCurrentBar] = useState(0);
  const lookaheadTimerRef = useRef(null);
  const isRunningRef = useRef(false);
  const measureStartTimeRef = useRef(null);

  // Keep a stable reference to tempo in a ref
  const tempoRef = useRef(tempo);
  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

  // ─────────────────────────────────────────────────────────
  // 1) Initialize AudioContext & load Buffers once
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const audioCtx = initAudioContext();
    audioCtxRef.current = audioCtx;

    // Fetch the active sound set from the API and load it
    const loadSounds = async () => {
      try {
        // Get the active sound set from the API
        const soundSet = await getActiveSoundSet();
        
        // Load the sound buffers with the sound set
        loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
      } catch (error) {
        // Fallback to default sounds if the API call fails
        loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
      }
    };

    loadSounds();
    
    return () => {
      stop(); // cleanup any intervals
      // optionally: audioCtx.close() if you want
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────
  // 2) A helper that schedules the entire next measure
  //    for ALL circles in parallel.
  // ─────────────────────────────────────────────────────────
  const scheduleMeasure = useCallback((measureStartTime, debug = false) => {

    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    // SCHEDULING ALL circles now:
    circleSettings.forEach((circle, circleIndex) => {
      const { subdivisions, accents, beatMode = "quarter" } = circle;

      // Get the multiplier for this beat mode (1 for quarter, 2 for eighth)
      const beatMultiplier = beatMode === "eighth" ? 2 : 1;
      
      // Use the exact number of subdivisions as specified by the user
      const exactSubdivisions = subdivisions;
      
      // Calculate the duration of one quarter note at the current tempo
      const quarterNoteDuration = 60 / tempoRef.current;
      
      // Calculate the note duration based on beat mode 
      // For quarter notes (beatMultiplier=1), use quarter note duration
      // For eighth notes (beatMultiplier=2), use eighth note duration (half as long)
      const noteDuration = quarterNoteDuration / beatMultiplier;
      
      // Schedule exactly the number of subdivisions specified by the user
      for (let subIndex = 0; subIndex < exactSubdivisions; subIndex++) {
        // For each subdivision, calculate the hit time
        // In quarter note mode: each subdivision is a quarter note
        // In eighth note mode: each subdivision is an eighth note
        const hitTime = measureStartTime + (subIndex * noteDuration);
        
        // Possibly skip if silent
        const doMute = shouldMuteThisBeat({
          macroMode,
          muteProbability,
          isSilencePhaseRef
        });
        if (doMute) {
          // skip scheduling
        } else {
          scheduleHit({
            subIndex,
            circleIndex,
            when: hitTime,
            accents: accents || [],
            audioCtx,
            volume,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef
          });
        }

        // Fire UI callback for any animation
        if (onBeatTriggered) {
          onBeatTriggered({
            circleIndex,
            subIndex,
            time: hitTime,
            isMuted: doMute
          });
        }
      }
    });
  }, [
    circleSettings,
    macroMode,
    muteProbability,
    volume,
    onBeatTriggered
  ]);

  // ─────────────────────────────────────────────────────────
  // 3) Called once per measure boundary to do random or fixed silence 
  //    *and* speed updates
  // ─────────────────────────────────────────────────────────
  const handleMeasureBoundary = useCallback(() => {
    measureCountRef.current += 1;

    // Macro Mode: 1=Fixed Silence
    if (macroMode === 1) {
      if (!isSilencePhaseRef.current) {
        // check if we should enter silence
        if (measureCountRef.current >= measuresUntilMute) {
          isSilencePhaseRef.current = true;
          muteMeasureCountRef.current = 0;
        }
      } else {
        // already silent => count how many measures
        muteMeasureCountRef.current += 1;
        if (muteMeasureCountRef.current >= muteDurationMeasures) {
          isSilencePhaseRef.current = false;
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0; 
        }
      }
    }

    // Speed Mode: 1 => auto increase tempo 
    if (speedMode === 1 && !isSilencePhaseRef.current) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        const newTempo = Math.min(Math.round(tempoRef.current * factor), 240);
        tempoRef.current = newTempo; 
        measureCountRef.current = 0; // reset measure count
      }
    }

    // Macro Mode: 2 => random silence
    if (macroMode === 2) {
      // We handle it via `shouldMuteThisBeat` using probability
      // so not needed to do anything special here for measure boundaries
    }
  }, [
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    tempoIncreasePercent,
    measuresUntilSpeedUp
  ]);

  // ─────────────────────────────────────────────────────────
  // 5) start/stop the scheduler
  // ─────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) {
      return;
    }

    // Ensure audio context is running
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (err) {
      }
    }

    // Check if we have our sound buffers
    if (!normalBufferRef.current || !accentBufferRef.current || !firstBufferRef.current) {
      return;
    }

    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    measureStartTimeRef.current = audioCtx.currentTime;

    // Schedule first measure immediately
    scheduleMeasure(measureStartTimeRef.current, true);

    // Start the scheduling loop
    const scheduleLoop = () => {
      if (!isRunningRef.current) return;

      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      const quarterNoteDuration = 60 / tempoRef.current;

      // Find the longest measure duration among all circles
      const longestMeasureDuration = circleSettings.reduce((maxDur, circle) => {
        const { subdivisions, beatMode = "quarter" } = circle;
        const beatMultiplier = beatMode === "eighth" ? 2 : 1;
        const measureDuration = (subdivisions / beatMultiplier) * quarterNoteDuration;
        return Math.max(maxDur, measureDuration);
      }, 0);

      // If we're approaching the end of the current measure, schedule the next one
      if (now >= measureStartTimeRef.current + (longestMeasureDuration * 0.75)) {
        const nextMeasureStart = measureStartTimeRef.current + longestMeasureDuration;
        scheduleMeasure(nextMeasureStart);
        measureStartTimeRef.current = nextMeasureStart;
        handleMeasureBoundary();
        setCurrentBar(bar => bar + 1);
      }

      // Schedule next check
      lookaheadTimerRef.current = setTimeout(scheduleLoop, 25);
    };

    scheduleLoop();
  }, [scheduleMeasure, handleMeasureBoundary, circleSettings]);

  const stop = useCallback(() => {
    if (lookaheadTimerRef.current) {
      clearTimeout(lookaheadTimerRef.current);
      lookaheadTimerRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  // ─────────────────────────────────────────────────────────
  // 6) React to `isPaused`
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioCtxRef.current) return;
    if (isPaused) {
      stop();
      // Optionally pause the AudioContext:
      audioCtxRef.current.suspend().catch((err) => {});
    } else {
      audioCtxRef.current.resume().then(() => {
        start();
      }).catch((err) => {});
    }
  }, [isPaused, start, stop]);

  return {
    start,
    stop,
    currentBar,            // which measure # we’re currently in
    isSilencePhaseRef,     // for your UI to know if we’re in silence
  };
}

// ─────────────────────────────────────────────────────────
// 7) scheduleHit helper
// ─────────────────────────────────────────────────────────
function scheduleHit({
  subIndex,
  circleIndex,
  when,
  accents,
  audioCtx,
  volume,
  normalBufferRef,
  accentBufferRef,
  firstBufferRef
}) {
  // Decide if it’s first beat or accent or normal:
  let buffer = null;
  if (subIndex === 0) {
    buffer = firstBufferRef.current;
  } else {
    const accentVal = accents[subIndex] ?? 1;
    // accentVal: 0=no sound, 1=normal, 2=accent, 3=first
    if (accentVal === 2) buffer = accentBufferRef.current;
    else if (accentVal === 3) buffer = firstBufferRef.current;
    else if (accentVal === 1) buffer = normalBufferRef.current;
  }
  if (!buffer) return; // skip

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  // volume
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(volume, when);

  source.connect(gainNode).connect(audioCtx.destination);
  source.start(when);
  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
  };
}
