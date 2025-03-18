import { useState, useEffect, useRef, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { SCHEDULE_AHEAD_TIME } from '../../../hooks/useMetronomeLogic/constants';
import { shouldMuteThisBeat, handleMeasureBoundary } from '../../../hooks/useMetronomeLogic/trainingLogic';

/**
 * Polyrhythm hook that forces *every* measure boundary to line up for both circles.
 * 
 * - We define one measureDuration in real time (like 4 beats * (60/tempo)).
 * - Circle #1 subdivides that measure into 'innerBeats' parts.
 * - Circle #2 subdivides that same measure into 'outerBeats' parts.
 * - So each measure's "first beat" is *identical in time* for both circles, every measure.
 * - If you set (innerBeats=4, outerBeats=3), you get a measure forcibly started every time,
 *   with circle #1 hitting 4 subdivisions inside, circle #2 hitting 3 subdivisions inside,
 *   and both "first beats" unify every measure.
 */
export default function usePolyrhythmLogic({
  tempo,
  innerBeats,          // e.g., 4
  outerBeats,          // e.g., 3
  innerAccents = [],   // accent patterns for circle 1
  outerAccents = [],   // accent patterns for circle 2
  isPaused,
  volume,
  swing = 0,           // not strictly used here if you want
  // training mode:
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2,
  // callbacks for UI
  onInnerBeatTriggered = null,
  onOuterBeatTriggered = null
}) {
  // Audio
  const audioCtxRef = useRef(null);
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Scheduler state
  const schedulerRunningRef = useRef(false);
  const lookaheadIntervalRef = useRef(null);

  // measure-based approach
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const measureStartTimeRef = useRef(0);  // time in audioCtx for the *start* of each measure
  const startTimeRef = useRef(0);         // time we began the entire session

  // track which subdivision is "playing" in each circle, for UI
  const [innerCurrentSub, setInnerCurrentSub] = useState(0);
  const [outerCurrentSub, setOuterCurrentSub] = useState(0);

  // Refs for training mode
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);

  // If you want an "actualBpm"
  const [actualBpm, setActualBpm] = useState(tempo);

  // keep local references updated
  const tempoRef = useRef(tempo);
  const volumeRef = useRef(volume);
  const innerBeatsRef = useRef(innerBeats);
  const outerBeatsRef = useRef(outerBeats);
  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { innerBeatsRef.current = innerBeats; }, [innerBeats]);
  useEffect(() => { outerBeatsRef.current = outerBeats; }, [outerBeats]);

  // --------------------------------------------
  // load audio on mount
  // --------------------------------------------
  useEffect(() => {
    const ctx = initAudioContext();
    audioCtxRef.current = ctx;

    const load = async () => {
      try {
        const set = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx: ctx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet: set
        });
      } catch {
        // fallback
        await loadClickBuffers({
          audioCtx: ctx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
      }
    };
    load();

    return () => {
      stopScheduler();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------
  // measureDuration: define a single measure in audio time
  //   For example, measure = "max of innerBeats or outerBeats" * (60/tempo)
  //   or simply "4 * (60/tempo)" if you want 4 beats as the measure length, etc.
  // --------------------------------------------
  const getMeasureDuration = useCallback(() => {
    // Option 1: measure = the bigger of the two circle's "beats" * spb
    //   e.g. if inner=4, outer=3 => measure=4*(60/tempo)
    // Option 2: you might want to just do 1 measure=1 bar => (60/tempo)*4, if you want 4/4 measure.
    // We'll do "the bigger of the two circle's beats" approach:
    const spb = 60 / tempoRef.current; // seconds per beat
    const maxBeats = Math.max(innerBeatsRef.current, outerBeatsRef.current);
    return maxBeats * spb;
  }, []);

  // --------------------------------------------
  // schedule a single "hit" for a circle
  // --------------------------------------------
  const scheduleHit = useCallback((when, subIndex, circle, accentsArray) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    let safeTime = when;
    if (safeTime < now) {
      safeTime = now + 0.001; // minimal clamp
    }

    // pick accent
    if (!accentsArray || !accentsArray[subIndex]) {
      // default normal accent if not specified
    }
    const accentVal = accentsArray[subIndex] || 1;
    if (accentVal === 0) return; // muted

    let chosenBuf = normalBufferRef.current;
    if (accentVal === 3) {
      chosenBuf = firstBufferRef.current;
    } else if (accentVal === 2) {
      chosenBuf = accentBufferRef.current;
    }
    if (!chosenBuf) return;

    const source = ctx.createBufferSource();
    source.buffer = chosenBuf;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volumeRef.current;
    source.connect(gainNode).connect(ctx.destination);

    source.start(safeTime);
    source.onended = () => {
      try { source.disconnect(); gainNode.disconnect(); } catch {}
    };

    // UI
    const delayMs = (safeTime - now)*1000;
    setTimeout(() => {
      if (!schedulerRunningRef.current) return;
      if (circle === 'inner') {
        setInnerCurrentSub(subIndex);
        if (subIndex===0) {
          console.log('INNER measure start => subIndex=0, time=', ctx.currentTime.toFixed(3));
        }
        onInnerBeatTriggered?.(subIndex);
      } else {
        setOuterCurrentSub(subIndex);
        if (subIndex===0) {
          console.log('OUTER measure start => subIndex=0, time=', ctx.currentTime.toFixed(3));
        }
        onOuterBeatTriggered?.(subIndex);
      }
    }, delayMs);

  }, [onInnerBeatTriggered, onOuterBeatTriggered]);

  // --------------------------------------------
  // scheduleOneMeasure => 
  //   for circle #1: innerBeats subdivisions within measure
  //   for circle #2: outerBeats subdivisions within measure
  // --------------------------------------------
  const scheduleOneMeasure = useCallback((measureIndex, measureStartTime) => {
    const measureDuration = getMeasureDuration();

    // For circle #1 => we have 'innerBeats' subdivisions
    // so sub #i happens at measureStartTime + i*(measureDuration/innerBeats)
    for (let i=0; i<innerBeatsRef.current; i++){
      // maybe handle random/fixed silence
      const doMute = shouldMuteThisBeat({
        macroMode,
        muteProbability,
        isSilencePhaseRef
      });
      scheduleHit(
        measureStartTime + i*(measureDuration/innerBeatsRef.current), 
        i, 
        'inner',
        innerAccents
      );
    }

    // For circle #2 => 'outerBeats' subdivisions
    for (let j=0; j<outerBeatsRef.current; j++){
      const doMute = shouldMuteThisBeat({
        macroMode,
        muteProbability,
        isSilencePhaseRef
      });
      scheduleHit(
        measureStartTime + j*(measureDuration/outerBeatsRef.current),
        j,
        'outer',
        outerAccents
      );
    }

    // training measure boundary
    // run handleMeasureBoundary for each measure
    handleMeasureBoundary({
      measureCountRef,
      muteMeasureCountRef,
      isSilencePhaseRef,
      macroMode,
      speedMode,
      measuresUntilMute,
      muteDurationMeasures,
      muteProbability,
      tempoRef,
      measuresUntilSpeedUp,
      tempoIncreasePercent,
      setTempo: (t) => setActualBpm(t), // or do nothing if you want
    });
  }, [
    getMeasureDuration,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoRef,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    scheduleHit,
    innerAccents,
    outerAccents
  ]);

  // --------------------------------------------
  // scheduling loop => schedule measure if approaching end
  // --------------------------------------------
  const schedulingLoop = useCallback(() => {
    if (!audioCtxRef.current || !schedulerRunningRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const measureDuration = getMeasureDuration();

    // how many measures have fully completed
    const totalTimeElapsed = now - startTimeRef.current;
    const measureIndex = Math.floor(totalTimeElapsed / measureDuration);

    // if we've not scheduled measure #measureIndex+1 yet, do so
    // look ahead
    const nextMeasureIndex = currentMeasure; 
    const nextMeasureStart = startTimeRef.current + nextMeasureIndex*measureDuration;

    const scheduleAhead = now + SCHEDULE_AHEAD_TIME;
    if (nextMeasureStart < scheduleAhead) {
      // schedule that measure
      scheduleOneMeasure(nextMeasureIndex, nextMeasureStart);
      setCurrentMeasure(m => m+1);
    }
  }, [currentMeasure, getMeasureDuration, scheduleOneMeasure]);

  // --------------------------------------------
  // start/stop
  // --------------------------------------------
  const startScheduler = useCallback(async () => {
    if (schedulerRunningRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // ensure buffers
      if (!normalBufferRef.current || !accentBufferRef.current || !firstBufferRef.current) {
        try {
          const set = await getActiveSoundSet();
          await loadClickBuffers({
            audioCtx: ctx,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef,
            soundSet: set
          });
        } catch {
          await loadClickBuffers({
            audioCtx: ctx,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef
          });
        }
      }

      // reset measure count
      schedulerRunningRef.current = true;
      setCurrentMeasure(0);
      measureCountRef.current = 0;
      muteMeasureCountRef.current = 0;
      isSilencePhaseRef.current = false;

      const now = ctx.currentTime;
      startTimeRef.current = now;
      measureStartTimeRef.current = now;
      
      // start loop
      lookaheadIntervalRef.current = setInterval(() => {
        schedulingLoop();
      }, 5);

      console.log(`[PolyrhythmU] started at audioCtxTime=${now.toFixed(3)}`);
    } catch (err) {
      console.error("Error starting polyrhythm unify-scheduler:", err);
    }
  }, [schedulingLoop]);

  const stopScheduler = useCallback(() => {
    if (lookaheadIntervalRef.current) {
      clearInterval(lookaheadIntervalRef.current);
      lookaheadIntervalRef.current = null;
    }
    schedulerRunningRef.current = false;
    console.log("[PolyrhythmU] stopped scheduler");
  }, []);

  // respond to isPaused
  useEffect(() => {
    if (!audioCtxRef.current) return;
    if (isPaused) {
      stopScheduler();
      audioCtxRef.current.suspend().catch(()=>{});
    } else {
      audioCtxRef.current.resume()
        .then(()=>startScheduler())
        .catch(()=>{});
    }
  }, [isPaused, startScheduler, stopScheduler]);

  // if tempo changes while playing => short restart
  useEffect(() => {
    if (!isPaused && schedulerRunningRef.current) {
      stopScheduler();
      setTimeout(() => {
        if (!isPaused) startScheduler();
      }, 30);
    }
  }, [tempo, isPaused, startScheduler, stopScheduler]);

  // --------------------------------------------
  // Expose
  // --------------------------------------------
  return {
    // for UI
    innerCurrentSubdivision: innerCurrentSub,
    outerCurrentSubdivision: outerCurrentSub,
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    actualBpm,

    // optional reload
    reloadSounds: async () => {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state==='closed') {
          audioCtxRef.current = initAudioContext();
        }
        const s = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet: s
        });
        return true;
      } catch (err) {
        console.error("Error reloading unify-sounds:", err);
        return false;
      }
    },
    audioCtx: audioCtxRef.current,
    // for debugging if needed
    startScheduler,
    stopScheduler,
    tapTempo: ()=>{} // no-op
  };
}
