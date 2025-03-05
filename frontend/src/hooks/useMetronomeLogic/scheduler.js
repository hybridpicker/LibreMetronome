import { SCHEDULE_AHEAD_TIME } from './constants';

/**
 * schedulePlay: Actually schedules an audio buffer to play in the future
 */
function schedulePlay({
  buffer,
  audioCtx,
  volumeRef,
  when,
  debugInfo = {}
}) {
  if (!buffer || !audioCtx) return;
  const now = audioCtx.currentTime;
  if (when <= now) {
    when = now + 0.01;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  // Create gain node to control volume
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, when - 0.005);
  gainNode.gain.linearRampToValueAtTime(volumeRef.current, when);

  source.connect(gainNode).connect(audioCtx.destination);
  source.start(when);
  
  // Log when the sound actually plays
  if (debugInfo.multiCircleMode) {
    console.log(`[MultiCirclePlayback] 🔊 Playing sound at ${when.toFixed(3)}, circle: ${debugInfo.currentCircle || 'unknown'}, volume: ${volumeRef.current.toFixed(2)}, type: ${debugInfo.soundType || 'normal'}`);
  }

  // Clean up to prevent memory leaks
  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
  };
}

/**
 * scheduleSubdivision: Called once for each upcoming subIndex.
 * - Optionally fires onAnySubTrigger
 * - Decides which buffer to use
 * - Actually schedules audio if not muted
 */
export function scheduleSubdivision({
  subIndex,
  when,
  audioCtx,
  analogMode,
  gridMode,
  multiCircleMode,
  volumeRef,
  onAnySubTrigger,
  normalBufferRef,
  accentBufferRef,
  firstBufferRef,
  // for "grid" or "circle" accent logic:
  beatConfigRef,
  accentsRef,
  // Training
  shouldMute,
  playedBeatTimesRef,
  updateActualBpm,
  // Debug info for logging
  debugInfo = {}
}) {
  // Fire user callback to animate each beat
  if (onAnySubTrigger) {
    onAnySubTrigger(subIndex);
  }

  // If we are muting, skip playback
  if (shouldMute) {
    if (multiCircleMode) {
      console.log(`[MultiCirclePlayback] 🔇 Beat ${subIndex} MUTED (training mode)`);
    }
    return;
  } else {
    // record the time for actual BPM measurement
    playedBeatTimesRef.current.push(performance.now());
    updateActualBpm?.(); 
  }

  // Decide which buffer to use:
  let buffer = null;
  let soundType = 'none';
  
  if (analogMode) {
    buffer = normalBufferRef.current; // all the same in analog
    soundType = 'normal';
  } else if (gridMode) {
    const state = beatConfigRef.current[subIndex]; // 3=first,2=accent,1=normal,0=off
    if (state === 3) { buffer = firstBufferRef.current; soundType = 'first'; }
    else if (state === 2) { buffer = accentBufferRef.current; soundType = 'accent'; }
    else if (state === 1) { buffer = normalBufferRef.current; soundType = 'normal'; }
    // (0 means no sound, effectively muted)
  } else {
    // circle mode
    const accentVal = accentsRef.current[subIndex];
    if (accentVal === 3) { 
      buffer = firstBufferRef.current; 
      soundType = 'first'; 
    } else if (accentVal === 2) { 
      buffer = accentBufferRef.current; 
      soundType = 'accent'; 
    } else if (accentVal === 1) { 
      buffer = normalBufferRef.current; 
      soundType = 'normal'; 
    }
    // accentVal = 0 => no sound
  }

  // Log for MultiCircle mode
  if (multiCircleMode) {
    console.log(`[MultiCirclePlayback] 🎯 Beat ${subIndex} scheduled, sound: ${soundType}, circle: ${debugInfo.currentCircle || 'unknown'}`);
  }

  // If we got a buffer, schedule it:
  if (buffer) {
    schedulePlay({
      buffer,
      audioCtx,
      volumeRef,
      when,
      debugInfo: {
        ...debugInfo,
        multiCircleMode,
        soundType
      }
    });
  }
}

/**
 * The main scheduling loop: keeps scheduling subdivisions in the near future
 */
export function runScheduler({
  audioCtxRef,
  nextNoteTimeRef,
  currentSubRef,
  currentSubdivisionSetter, // setCurrentSubdivision
  getCurrentSubIntervalSec,
  handleMeasureBoundary,
  scheduleSubFn,
  subdivisionsRef,
  multiCircleMode
}) {
  const now = audioCtxRef.current?.currentTime || 0;
  const lookaheadTime = multiCircleMode ? SCHEDULE_AHEAD_TIME * 1.2 : SCHEDULE_AHEAD_TIME;

  // For multicircle mode, log the scheduling pass
  if (multiCircleMode) {
    const nextScheduleTime = nextNoteTimeRef.current;
    if (nextScheduleTime && nextScheduleTime < now + lookaheadTime) {
      console.log(`[MultiCircleScheduler] 🔄 Scheduling loop, current time: ${now.toFixed(3)}, next note: ${nextScheduleTime.toFixed(3)}`);
    }
  }

  while (nextNoteTimeRef.current < now + lookaheadTime) {
    const subIndex = currentSubRef.current;
    scheduleSubFn(subIndex, nextNoteTimeRef.current);

    // Update UI
    currentSubdivisionSetter(subIndex);

    // Move on to next sub
    const intervalSec = getCurrentSubIntervalSec(subIndex);
    nextNoteTimeRef.current += intervalSec;
    currentSubRef.current = (subIndex + 1) % subdivisionsRef.current;

    // If we've hit the start of a new measure
    if (currentSubRef.current === 0) {
      handleMeasureBoundary();
      
      // Dispatch a custom event to notify components that a measure is complete
      const measureCompleteEvent = new CustomEvent('measure-complete');
      window.dispatchEvent(measureCompleteEvent);
    }
  }
}