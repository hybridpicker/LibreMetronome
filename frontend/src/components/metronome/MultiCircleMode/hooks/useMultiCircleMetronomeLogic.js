import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useMetronomeRefs } from '../../../../hooks/useMetronomeLogic/references';
import { createTapTempoLogic } from '../../../../hooks/useMetronomeLogic/tapTempo';
import { useAudioContext } from './useAudioContext';
import { useTrainingModeLogic } from './useTrainingModeLogic';
import { useSchedulerLogic } from './useSchedulerLogic';

export default function useMultiCircleMetronomeLogic({
  tempo, setTempo, isPaused, swing, volume, circleSettings = [], onCircleChange,
  onAnySubTrigger, macroMode = 0, speedMode = 0, measuresUntilMute = 2,
  muteDurationMeasures = 1, muteProbability = 0.3, tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2
}) {
  const refs = useMetronomeRefs();
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const playingCircleRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  tempoRef.current = tempo;
  swingRef.current = swing;
  volumeRef.current = volume;

  const audio = useAudioContext(refs.audioCtxRef, refs.normalBufferRef, refs.accentBufferRef, refs.firstBufferRef);
  const training = useTrainingModeLogic({
    macroMode, speedMode, tempoRef, setTempo, measuresUntilMute, muteDurationMeasures,
    muteProbability, measuresUntilSpeedUp, tempoIncreasePercent
  });
  const scheduler = useSchedulerLogic({
    ...refs, ...training, tempoRef, swingRef, volumeRef, playingCircleRef,
    lastBeatTimeRef, circleSettings, onCircleChange, onAnySubTrigger,
    macroMode, muteProbability, isPaused, setCurrentSubdivision,
    safelyInitAudioContext: audio.safelyInitAudioContext
  });
  const { startScheduler, stopScheduler } = scheduler;
  const { safelyInitAudioContext } = audio;

  useEffect(() => {
    // Prepare the shared audio buffers once, never on a visual bar change.
    void safelyInitAudioContext();
  }, [safelyInitAudioContext]);

  useEffect(() => {
    if (isPaused) stopScheduler();
    else void startScheduler();
    return stopScheduler;
  }, [isPaused, startScheduler, stopScheduler]);

  const tapTempo = useMemo(() => createTapTempoLogic(setTempo), [setTempo]);
  const isTransitioning = useCallback(() => false, []);
  return {
    ...refs, ...audio, ...training, ...scheduler,
    currentSubdivision, actualBpm: tempo, audioCtx: refs.audioCtxRef.current,
    tapTempo, isTransitioning, lastBeatTimeRef
  };
}
