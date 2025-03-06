// src/hooks/useMultiCircleScheduler.js

import { useEffect, useRef, useState, useCallback } from "react";

// Reuse or adapt from your single circle logic
import { initAudioContext } from "./useMetronomeLogic/audioBuffers"; 
import { loadClickBuffers } from "./useMetronomeLogic/audioBuffers";
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

    // Load your accent, first-beat, normal-beat sound files
    loadClickBuffers({
      audioCtx,
      normalBufferRef,
      accentBufferRef,
      firstBufferRef
    });
    
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
  const scheduleMeasure = useCallback((barStartTime) => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    // We'll treat ONE measure as exactly 4 quarter-note durations
    // (i.e. 4 beats). If tempo=120 BPM, then 4 beats = 2 seconds total.
    // If you prefer a different measure length, adjust here:
    const measureDurationSec = (4 * 60) / tempoRef.current;

    // SCHEDULING ALL circles now:
    circleSettings.forEach((circle, circleIndex) => {
      // circle.subdivisions can be 4, 8, etc.
      // If circle is set to "quarter", that means 4 hits. 
      // If "eighth", that means 8 hits in the same measure time, etc.
      const { subdivisions, accents, beatMode = "quarter" } = circle;

      // If beatMode === "eighth", effectively we do 8 hits per 4 beats
      // If beatMode === "quarter", effectively 4 hits per 4 beats
      // Alternatively, if your data literally says subdivisions=8, 
      // you can ignore beatMode and rely solely on subdivisions.
      
      // For example, if subdivisions=4 => 4 hits in measureDurationSec
      // if subdivisions=8 => 8 hits in measureDurationSec
      // We'll schedule them evenly across the measure.
      
      const hitsPerMeasure = subdivisions; 
      for (let subIndex = 0; subIndex < hitsPerMeasure; subIndex++) {
        // Calculate time offset within the measure
        let fraction = subIndex / hitsPerMeasure;
        // If you have a swing factor, apply it for even/odd subs 
        // to shift the fraction slightly. Example:
        //   if swing>0 and subIndex is odd => fraction -= some delta
        //   if subIndex is even => fraction += some delta
        // (Omitted for brevity)
        
        const hitTime = barStartTime + measureDurationSec * fraction;
        
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
  // 4) The main scheduling loop. 
  //    Once we schedule one measure, we set a timer to schedule the next.
  // ─────────────────────────────────────────────────────────
  const scheduleNextBar = useCallback(
    (barIndex, startTime) => {
      // Schedule everything for barIndex at startTime
      scheduleMeasure(startTime);
      
      // On measure boundary, do training logic (silence or speed change)
      handleMeasureBoundary();

      // One measure is (4 * 60/tempo)
      const measureDurationSec = (4 * 60) / tempoRef.current;

      // After that measure finishes, schedule the next one
      const nextBarIndex = barIndex + 1;
      const nextStartTime = startTime + measureDurationSec;

      // Use setTimeout to queue the next measure about 100ms before it
      // is due, or you can be more sophisticated with a “lookahead loop.”
      lookaheadTimerRef.current = setTimeout(() => {
        if (!isRunningRef.current) return;
        setCurrentBar(nextBarIndex);
        scheduleNextBar(nextBarIndex, nextStartTime);
      }, Math.max(0, (measureDurationSec * 1000) - 100));
    },
    [scheduleMeasure, handleMeasureBoundary]
  );

  // ─────────────────────────────────────────────────────────
  // 5) Start/Stop
  // ─────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setCurrentBar(0);
    measureCountRef.current = 0;
    muteMeasureCountRef.current = 0;
    isSilencePhaseRef.current = false;

    const now = audioCtxRef.current?.currentTime || 0;
    // first measure starts at now + 0.1 for safety
    scheduleNextBar(0, now + 0.1);
  }, [scheduleNextBar]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (lookaheadTimerRef.current) {
      clearTimeout(lookaheadTimerRef.current);
      lookaheadTimerRef.current = null;
    }
    // you might also want to flush out any ongoing schedule...
  }, []);

  // ─────────────────────────────────────────────────────────
  // 6) React to `isPaused`
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioCtxRef.current) return;
    if (isPaused) {
      stop();
      // Optionally pause the AudioContext:
      audioCtxRef.current.suspend().catch((err) => console.error(err));
    } else {
      audioCtxRef.current.resume().then(() => {
        start();
      }).catch((err) => console.error(err));
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
