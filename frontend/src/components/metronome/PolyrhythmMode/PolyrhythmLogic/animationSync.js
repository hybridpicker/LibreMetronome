// src/components/metronome/PolyrhythmMode/PolyrhythmLogic/animationSync.js

/**
 * Utility for synchronizing audio and visual events
 * This helper accurately predicts when to trigger UI updates
 * to compensate for React rendering time and CSS animation delays
 */
export const calculateAnimationTiming = ({
    scheduledAudioTime,  // When audio will play (in AudioContext time)
    audioContextTime,    // Current AudioContext time
    uiAnimationDuration = 0.15,  // Duration of beat animation in seconds
    uiRenderDelay = 0.016  // Estimated React render delay
  }) => {
    // Calculate when to trigger UI update
    // We subtract animation duration and render delay to ensure
    // the animation PEAK coincides with the audio beat 
    const triggerTime = Math.max(
      0,
      (scheduledAudioTime - audioContextTime) * 1000 - (uiAnimationDuration * 1000) / 2 - uiRenderDelay * 1000
    );
    
    return {
      triggerDelayMs: Math.max(0, triggerTime),
      estimatedPeakTime: scheduledAudioTime
    };
  };
  
  /**
   * Improved UI update scheduler that compensates for animation timing
   */
  export const scheduleAnimationUpdate = ({
    audioTime,          // When audio will play
    audioCtx,           // Current audio context
    beatIndex,          // Which beat to update
    isInnerCircle,      // Inner vs outer circle
    setInnerCurrentSubFn,   // setState for inner circle
    setOuterCurrentSubFn,   // setState for outer circle
    onInnerBeatTriggeredFn = null,  // Optional callback for inner
    onOuterBeatTriggeredFn = null,  // Optional callback for outer
    uiAnimationDuration = 0.15,
    shouldRunNow = false // Force immediate update (for paused→play)
  }) => {
    if (shouldRunNow) {
      if (isInnerCircle) {
        setInnerCurrentSubFn(beatIndex);
        if (onInnerBeatTriggeredFn) onInnerBeatTriggeredFn(beatIndex);
      } else {
        setOuterCurrentSubFn(beatIndex);
        if (onOuterBeatTriggeredFn) onOuterBeatTriggeredFn(beatIndex);
      }
      return;
    }
  
    const currentTime = audioCtx.currentTime;
    
    const { triggerDelayMs } = calculateAnimationTiming({
      scheduledAudioTime: audioTime,
      audioContextTime: currentTime,
      uiAnimationDuration
    });
  
    // Better logging to track timing
    if (beatIndex === 0) {
      console.log(
        `${isInnerCircle ? 'INNER' : 'OUTER'} UI update scheduled: ` +
        `audio at ${audioTime.toFixed(3)}, ` +
        `animating ${triggerDelayMs.toFixed(0)}ms before audio`
      );
    }
    
    // Schedule UI update with precise timing offset
    setTimeout(() => {
      if (isInnerCircle) {
        setInnerCurrentSubFn(beatIndex);
        if (onInnerBeatTriggeredFn) onInnerBeatTriggeredFn(beatIndex);
      } else {
        setOuterCurrentSubFn(beatIndex);
        if (onOuterBeatTriggeredFn) onOuterBeatTriggeredFn(beatIndex);
      }
    }, triggerDelayMs);
  };