// src/components/metronome/PolyrhythmMode/PolyrhythmLogic/scheduleUnifiedFirstBeat.js

/**
 * This function specifically schedules the unified first beat for both circles
 * Ensures that both inner and outer first beats occur at the exact same time
 * @param {Object} params Parameters for scheduling unified beats
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
    // Get high precision timestamps for debugging
    const currentTime = audioCtxRef.current.currentTime;
    const highPrecisionTimestamp = performance.now();
    
    // Log unified first beat scheduling with microsecond precision
    console.log(`
  ============= UNIFIED FIRST BEAT SCHEDULING =============
  Scheduling unified first beat at: ${time.toFixed(6)}s
  Current audio context time: ${currentTime.toFixed(6)}s
  High-precision timestamp: ${highPrecisionTimestamp.toFixed(6)}ms
  Time until trigger: ${((time - currentTime) * 1000).toFixed(3)}ms
  ============================================================
    `);
    
    // Create performance mark for this unified beat for timing analysis
    const markName = `unified-beat-${highPrecisionTimestamp}`;
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark(markName);
    }
    
    // Schedule the inner circle first beat with special flag
    const innerResult = scheduleBeat(time, 0, true, mute, true);
    
    // Schedule the outer circle first beat with special flag
    const outerResult = scheduleBeat(time, 0, false, mute, true);
    
    // Log the actual scheduling results for verification
    console.log(`Unified beat scheduled - Inner node ID: ${innerResult}, Outer node ID: ${outerResult}`);
    
    // Update UI states immediately for both circles
    const delayUntilBeat = Math.max(0, (time - currentTime) * 1000);
    setTimeout(() => {
      if (!schedulerRunningRef.current) return;
      
      // Log when the beat actually triggers with high precision
      const triggerTimestamp = performance.now();
      
      // Measure timing accuracy
      if (typeof performance !== 'undefined' && typeof performance.measure === 'function' && 
          typeof performance.getEntriesByName === 'function') {
        performance.measure(`unified-beat-duration-${triggerTimestamp}`, markName);
        const measures = performance.getEntriesByName(`unified-beat-duration-${triggerTimestamp}`);
        if (measures.length > 0) {
          console.log(`
  ============= UNIFIED BEAT TRIGGERED =============
  Scheduled time: ${time.toFixed(6)}s
  Actual trigger time: ${triggerTimestamp.toFixed(6)}ms
  Scheduling precision: ${measures[0].duration.toFixed(3)}ms difference
  Expected delay: ${delayUntilBeat.toFixed(3)}ms
  ===============================================
          `);
        }
      } else {
        console.log(`
  ============= UNIFIED BEAT TRIGGERED =============
  Scheduled time: ${time.toFixed(6)}s
  Actual trigger time: ${triggerTimestamp.toFixed(6)}ms
  ===============================================
        `);
      }
      
      setInnerCurrentBeat(0);
      setOuterCurrentBeat(0);
      
      if (typeof onInnerBeatTriggered === 'function') {
        onInnerBeatTriggered(0);
      }
      
      if (typeof onOuterBeatTriggered === 'function') {
        onOuterBeatTriggered(0);
      }
    }, delayUntilBeat);
  };