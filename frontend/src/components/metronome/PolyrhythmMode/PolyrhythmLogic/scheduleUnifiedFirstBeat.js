// src/components/metronome/PolyrhythmMode/PolyrhythmLogic/scheduleUnifiedFirstBeat.js
import { scheduleAnimationUpdate } from './animationSync';

/**
 * Schedules the unified first beat for both circles at the exact same time.
 * Improved version with synchronized animation timing.
 */
export const scheduleUnifiedFirstBeat = ({
  time,
  audioCtxRef,
  normalBufferRef,
  accentBufferRef, 
  firstBufferRef,
  volumeRef,
  activeNodesRef,
  innerAccentsRef,
  outerAccentsRef,
  schedulerRunningRef,
  setInnerCurrentSub,
  setOuterCurrentSub,
  onInnerBeatTriggered,
  onOuterBeatTriggered,
  mute = false
}) => {
  if (!audioCtxRef.current) {
    console.error('scheduleUnifiedFirstBeat: Audio context is null.');
    return;
  }
  
  if (mute) return;

  const ctx = audioCtxRef.current;
  const currentTime = ctx.currentTime;
  const safeTime = time < currentTime ? currentTime + 0.001 : time;
  
  console.log(`
==== SCHEDULING UNIFIED FIRST BEAT ====
Scheduled time: ${safeTime.toFixed(6)} s
Current audioCtx time: ${currentTime.toFixed(6)} s
=======================================
  `);

  // Schedule audio for both first beats
  // For inner circle
  const innerAccentVal = innerAccentsRef.current[0] || 3; // Default to first beat
  let innerBuffer = normalBufferRef.current;
  if (innerAccentVal === 3) innerBuffer = firstBufferRef.current;
  else if (innerAccentVal === 2) innerBuffer = accentBufferRef.current;
  
  // For outer circle 
  const outerAccentVal = outerAccentsRef.current[0] || 3; // Default to first beat
  let outerBuffer = normalBufferRef.current;
  if (outerAccentVal === 3) outerBuffer = firstBufferRef.current;
  else if (outerAccentVal === 2) outerBuffer = accentBufferRef.current;
  
  // Create sources for both circles with identical timing
  if (innerBuffer) {
    const innerSource = ctx.createBufferSource();
    innerSource.buffer = innerBuffer;
    
    const innerGain = ctx.createGain();
    innerGain.gain.setValueAtTime(0, safeTime);
    innerGain.gain.linearRampToValueAtTime(volumeRef.current, safeTime + 0.005);
    
    innerSource.connect(innerGain).connect(ctx.destination);
    
    try {
      innerSource.start(safeTime);
    } catch (err) {
      console.error('Error starting inner first beat:', err);
    }
    
    activeNodesRef.current.push({ source: innerSource, gainNode: innerGain });
    
    innerSource.onended = () => {
      try {
        innerSource.disconnect();
        innerGain.disconnect();
        const idx = activeNodesRef.current.findIndex(n => n.source === innerSource);
        if (idx !== -1) {
          activeNodesRef.current.splice(idx, 1);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }
  
  if (outerBuffer) {
    const outerSource = ctx.createBufferSource();
    outerSource.buffer = outerBuffer;
    
    const outerGain = ctx.createGain();
    outerGain.gain.setValueAtTime(0, safeTime);
    outerGain.gain.linearRampToValueAtTime(volumeRef.current, safeTime + 0.005);
    
    outerSource.connect(outerGain).connect(ctx.destination);
    
    try {
      outerSource.start(safeTime);
    } catch (err) {
      console.error('Error starting outer first beat:', err);
    }
    
    activeNodesRef.current.push({ source: outerSource, gainNode: outerGain });
    
    outerSource.onended = () => {
      try {
        outerSource.disconnect();
        outerGain.disconnect();
        const idx = activeNodesRef.current.findIndex(n => n.source === outerSource);
        if (idx !== -1) {
          activeNodesRef.current.splice(idx, 1);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }
  
  // Schedule synchronized UI updates for both circles using the improved animation timing
  scheduleAnimationUpdate({
    audioTime: safeTime,
    audioCtx: ctx,
    beatIndex: 0,
    isInnerCircle: true,
    setStateFn: setInnerCurrentSub,
    callbackFn: onInnerBeatTriggered,
    uiAnimationDuration: 0.04 // Match the duration used in BeatVisualizer
  });
  
  scheduleAnimationUpdate({
    audioTime: safeTime,
    audioCtx: ctx,
    beatIndex: 0, 
    isInnerCircle: false,
    setStateFn: setOuterCurrentSub,
    callbackFn: onOuterBeatTriggered,
    uiAnimationDuration: 0.04 // Match the duration used in BeatVisualizer
  });
  
  console.log('Unified first beats scheduled successfully');
};