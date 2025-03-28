// src/components/metronome/PolyrhythmMode/PolyrhythmLogic/scheduleBeat.js

/**
 * Schedule audio playback for a beat
 * 
 * Key fixes:
 *  - Remove/minimize extra “safeTime” offset so both circles truly start together.
 *  - Capture currentTime exactly once to avoid micro-differences.
 */

export const scheduleBeat = ({
    time,
    beatIndex,
    isInnerCircle,
    mute = false,
    isFirstBeatOfBoth = false,
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    innerAccentsRef,
    outerAccentsRef,
    volumeRef,
    activeNodesRef,
    schedulerRunningRef,
    setInnerCurrentBeat,
    setOuterCurrentBeat,
    onInnerBeatTriggered,
    onOuterBeatTriggered
  }) => {
    if (!audioCtxRef.current) {
      console.error('scheduleBeat: Audio context is null.');
      return 'no-audio-ctx';
    }
    if (mute) {
      // This beat is muted per training logic or accent=0
      return 'muted';
    }
  
    // Capture currentTime *once* at the start
    const now = audioCtxRef.current.currentTime;
  
    // Identify correct accent array (inner vs. outer)
    const accents = isInnerCircle ? innerAccentsRef.current : outerAccentsRef.current;
    if (!accents || !Array.isArray(accents)) {
      console.warn(`No valid accents array for ${isInnerCircle ? 'inner' : 'outer'} circle.`);
      return 'no-accents';
    }
  
    // Determine accent for this subdivision: 0=muted, 1=normal, 2=accent, 3=first
    const accentValue = beatIndex < accents.length ? accents[beatIndex] : 1;
    if (accentValue === 0) {
      // A beat that is explicitly muted in the accent pattern
      return 'accent-muted';
    }
  
    // Pick the right buffer
    let buffer = normalBufferRef.current;
    if (accentValue === 3) buffer = firstBufferRef.current;
    else if (accentValue === 2) buffer = accentBufferRef.current;
  
    if (!buffer) {
      console.error('No buffer available for this accentValue:', accentValue);
      return 'no-buffer';
    }
  
    // === CRITICAL FIX: Remove the large forced offset ===
    // If 'time' is already in the future, we trust it. 
    // If it’s in the past, clamp to now (so we don’t schedule in the past).
    const safeTime = (time < now) ? now : time;
  
    // Optionally ensure audio context is running
    if (audioCtxRef.current.state !== 'running') {
      audioCtxRef.current.resume().catch(err => {
        console.warn('Failed to resume audio context:', err);
      });
    }
  
    // Create nodes
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
  
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volumeRef.current;
  
    source.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);
  
    // Minimal logging
    if (beatIndex === 0 || isFirstBeatOfBoth) {
      console.log(
        `[${isInnerCircle ? 'INNER' : 'OUTER'}] First beat #${beatIndex}${
          isFirstBeatOfBoth ? ' (UNIFIED)' : ''
        } scheduled at time = ${safeTime.toFixed(4)} (currentTime=${now.toFixed(4)})`
      );
    }
  
    // Schedule playback at safeTime
    try {
      source.start(safeTime);
    } catch (error) {
      console.error('Error calling source.start:', error);
      return 'start-error';
    }
  
    // Keep references for cleanup
    activeNodesRef.current.push({ source, gainNode });
  
    // Cleanup once the audio finishes
    source.onended = () => {
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch (err) {
        // no-op
      }
      const idx = activeNodesRef.current.findIndex(n => n.source === source);
      if (idx !== -1) {
        activeNodesRef.current.splice(idx, 1);
      }
    };
  
    // UI update at the same offset
    const delayUntilBeat = Math.max(0, (safeTime - now) * 1000);
    setTimeout(() => {
      if (!schedulerRunningRef.current) return;
      if (isInnerCircle) {
        setInnerCurrentBeat(beatIndex);
        if (typeof onInnerBeatTriggered === 'function') {
          onInnerBeatTriggered(beatIndex);
        }
      } else {
        setOuterCurrentBeat(beatIndex);
        if (typeof onOuterBeatTriggered === 'function') {
          onOuterBeatTriggered(beatIndex);
        }
      }
    }, delayUntilBeat);
  
    return 'scheduled';
  };
  