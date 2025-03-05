import { SCHEDULE_AHEAD_TIME } from './constants';

/**
 * schedulePlay: Actually schedules an audio buffer to play in the future
 */
function schedulePlay({
  buffer,
  audioCtx,
  volumeRef,
  when
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
  updateActualBpm
}) {
  // Fire user callback to animate each beat
  if (onAnySubTrigger) {
    onAnySubTrigger(subIndex);
  }

  // If we are muting, skip playback
  if (shouldMute) {
    return;
  } else {
    // record the time for actual BPM measurement
    playedBeatTimesRef.current.push(performance.now());
    updateActualBpm?.(); 
  }

  // Decide which buffer to use:
  let buffer = null;
  if (analogMode) {
    buffer = normalBufferRef.current; // all the same in analog
  } else if (gridMode) {
    const state = beatConfigRef.current[subIndex]; // 3=first,2=accent,1=normal,0=off
    if (state === 3) buffer = firstBufferRef.current;
    else if (state === 2) buffer = accentBufferRef.current;
    else if (state === 1) buffer = normalBufferRef.current;
    // (0 means no sound, effectively muted)
  } else {
    // circle mode
    if (subIndex === 0) {
      buffer = firstBufferRef.current;
    } else {
      const accentVal = accentsRef.current[subIndex];
      if (accentVal === 2) buffer = accentBufferRef.current;
      else if (accentVal === 1) buffer = normalBufferRef.current;
      // accentVal = 0 => no sound
    }
  }

  // If we got a buffer, schedule it:
  if (buffer) {
    schedulePlay({
      buffer,
      audioCtx,
      volumeRef,
      when
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

  while (nextNoteTimeRef.current < now + lookaheadTime) {
    const subIndex = currentSubRef.current;
    scheduleSubFn(subIndex, nextNoteTimeRef.current);

    // Update UI
    currentSubdivisionSetter(subIndex);

    // Move on to next sub
    nextNoteTimeRef.current += getCurrentSubIntervalSec(subIndex);
    currentSubRef.current = (subIndex + 1) % subdivisionsRef.current;

    // If we've hit the start of a new measure
    if (currentSubRef.current === 0) {
      handleMeasureBoundary();
    }
  }
}