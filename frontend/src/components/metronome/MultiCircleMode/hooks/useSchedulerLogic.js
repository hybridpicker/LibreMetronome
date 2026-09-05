import { useCallback, useRef } from 'react';
import { scheduleSubdivision } from '../../../../hooks/useMetronomeLogic/scheduler';
import { resumeAudioContext } from '../../../../hooks/useMetronomeLogic/audioBuffers';
import { shouldMuteThisBeat } from '../../../../hooks/useMetronomeLogic/trainingLogic';
import { SCHEDULE_AHEAD_TIME, SCHEDULER_INTERVAL, STARTUP_LEAD_TIME } from '../../../../hooks/useMetronomeLogic/constants';
import { scheduleSequence } from '../utils/sequenceScheduler';

/** The scheduler owns its cursor; React receives visual updates only at beat time. */
export function useSchedulerLogic(options) {
  const latest = useRef(options);
  latest.current = options;
  const cursor = useRef({ circleIndex: 0, subIndex: 0, when: 0, pattern: null });
  const generation = useRef(0);
  const starting = useRef(false);

  const getBeatMultiplier = useCallback(() => {
    const pattern = cursor.current.pattern || latest.current.circleSettings[cursor.current.circleIndex];
    return pattern?.beatMode === 'eighth' ? 2 : 1;
  }, []);

  const getCurrentSubIntervalSec = useCallback((subIndex) => {
    const o = latest.current;
    return 60 / o.tempoRef.current / getBeatMultiplier() * (1 + (subIndex % 2 === 0 ? o.swingRef.current : -o.swingRef.current));
  }, [getBeatMultiplier]);

  const doSchedulerLoop = useCallback(() => {
    const o = latest.current;
    const ctx = o.audioCtxRef.current;
    if (!o.schedulerRunningRef.current || ctx?.state !== 'running') return;
    scheduleSequence({
      cursor: cursor.current,
      circles: o.circleSettings,
      now: ctx.currentTime,
      horizon: SCHEDULE_AHEAD_TIME,
      tempo: o.tempoRef.current,
      swing: o.swingRef.current || 0,
      onBeat: ({ circleIndex, subIndex, when, pattern, interval }) => {
        o.lastBeatTimeRef.current = when;
        scheduleSubdivision({
          subIndex, when, audioCtx: ctx, multiCircleMode: true,
          volumeRef: o.volumeRef,
          normalBufferRef: o.normalBufferRef,
          accentBufferRef: o.accentBufferRef,
          firstBufferRef: o.firstBufferRef,
          accentsRef: { current: pattern.accents },
          nodeRefs: o.nodeRefs,
          shouldMute: shouldMuteThisBeat({ macroMode: o.macroMode, muteProbability: o.muteProbability, isSilencePhaseRef: o.isSilencePhaseRef }),
          onAnySubTrigger: () => {
            o.playingCircleRef.current = circleIndex;
            o.currentSubStartRef.current = when;
            o.currentSubIntervalRef.current = interval;
            o.setCurrentSubdivision(subIndex);
            o.onCircleChange?.(circleIndex);
            o.onAnySubTrigger?.(subIndex);
          }
        });
      },
      onMeasureComplete: () => o.handleMeasureBoundary()
    });
    o.nextNoteTimeRef.current = cursor.current.when;
    o.currentSubRef.current = cursor.current.subIndex;
  }, []);

  const stopScheduler = useCallback(() => {
    generation.current++;
    starting.current = false;
    const o = latest.current;
    clearInterval(o.lookaheadRef.current);
    o.lookaheadRef.current = null;
    o.schedulerRunningRef.current = false;
    for (const node of o.nodeRefs.current) {
      try {
        if (node.cancel) node.cancel();
        else node.stop?.(0);
        node.disconnect?.();
      } catch { /* A finished source may already be disconnected. */ }
    }
    o.nodeRefs.current = [];
    o.setCurrentSubdivision(0);
  }, []);

  const startScheduler = useCallback(async () => {
    if (starting.current || latest.current.schedulerRunningRef.current) return;
    starting.current = true;
    const attempt = ++generation.current;
    try {
      const initial = latest.current;
      if (!initial.audioCtxRef.current || initial.audioCtxRef.current.state === 'closed' ||
          !initial.normalBufferRef.current || !initial.accentBufferRef.current || !initial.firstBufferRef.current) {
        await initial.safelyInitAudioContext();
      }
      const o = latest.current;
      if (attempt !== generation.current || o.isPaused) return;
      if (!await resumeAudioContext(o.audioCtxRef.current)) return;
      if (attempt !== generation.current || latest.current.isPaused) return;
      if (!o.normalBufferRef.current || !o.accentBufferRef.current || !o.firstBufferRef.current) return;
      cursor.current = { circleIndex: 0, subIndex: 0, when: o.audioCtxRef.current.currentTime + STARTUP_LEAD_TIME, pattern: null };
      o.measureCountRef.current = 0;
      o.muteMeasureCountRef.current = 0;
      o.isSilencePhaseRef.current = false;
      o.playingCircleRef.current = 0;
      o.onCircleChange?.(0);
      o.schedulerRunningRef.current = true;
      doSchedulerLoop();
      o.lookaheadRef.current = setInterval(doSchedulerLoop, SCHEDULER_INTERVAL);
    } catch (error) {
      console.error('Unable to start sequence playback:', error);
    } finally {
      if (attempt === generation.current) starting.current = false;
    }
  }, [doSchedulerLoop]);

  return { getBeatMultiplier, getCurrentSubIntervalSec, doSchedulerLoop, stopScheduler, startScheduler };
}
