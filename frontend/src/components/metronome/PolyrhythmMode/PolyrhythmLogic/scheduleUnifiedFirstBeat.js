// src/components/metronome/PolyrhythmMode/PolyrhythmLogic/scheduleUnifiedFirstBeat.js

/**
 * Schedules the unified first beat for both circles at the exact same time.
 */
export const scheduleUnifiedFirstBeat = ({
    time,
    mute = false,
    audioCtxRef,
    schedulerRunningRef,
    setInnerCurrentBeat,
    setOuterCurrentBeat,
    onInnerBeatTriggered,
    onOuterBeatTriggered,
    scheduleBeat
  }) => {
    if (!audioCtxRef.current) {
      console.error('scheduleUnifiedFirstBeat: Audio context is null.');
      return;
    }
  
    const currentTime = audioCtxRef.current.currentTime;
    console.log(`
  ==== SCHEDULING UNIFIED FIRST BEAT ====
  Scheduled time: ${time.toFixed(6)} s
  Current audioCtx time: ${currentTime.toFixed(6)} s
  =======================================
    `);
  
    // Schedule first beat for inner circle
    const innerResult = scheduleBeat(time, 0, true, mute, true);
  
    // Schedule first beat for outer circle
    const outerResult = scheduleBeat(time, 0, false, mute, true);
  
    console.log(`Unified first beats scheduled => Inner: ${innerResult}, Outer: ${outerResult}`);
  
    // Update UI at the moment the beat is supposed to happen
    const delayMs = Math.max(0, (time - currentTime) * 1000);
    setTimeout(() => {
      if (!schedulerRunningRef.current) return;
      console.log('Unified first beats triggered in UI now.');
  
      setInnerCurrentBeat(0);
      setOuterCurrentBeat(0);
  
      onInnerBeatTriggered?.(0);
      onOuterBeatTriggered?.(0);
    }, delayMs);
  };
  