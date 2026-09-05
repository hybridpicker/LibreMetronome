// src/hooks/useMetronomeLogic/scheduler.js

import { SCHEDULE_AHEAD_TIME } from './constants';

/**
 * Run visual/state work when a scheduled sound reaches the output device.
 * Audio remains driven solely by the AudioContext clock; this callback is only
 * for UI state and events. The returned handle is tracked with audio nodes so
 * pausing the metronome also cancels pending visual beats.
 */
export function scheduleAtAudioTime({ audioCtx, when, callback, nodeRefs }) {
  if (!audioCtx || typeof callback !== 'function') return null;

  const outputLatency = Number.isFinite(audioCtx.outputLatency)
    ? audioCtx.outputLatency
    : (Number.isFinite(audioCtx.baseLatency) ? audioCtx.baseLatency : 0);
  const delayMs = Math.max(0, (when - audioCtx.currentTime + outputLatency) * 1000);
  let timerId;

  const handle = {
    cancel() {
      if (timerId !== undefined) clearTimeout(timerId);
    }
  };

  timerId = setTimeout(() => {
    if (nodeRefs && Array.isArray(nodeRefs.current)) {
      const index = nodeRefs.current.indexOf(handle);
      if (index !== -1) nodeRefs.current.splice(index, 1);
    }
    callback();
  }, delayMs);

  if (nodeRefs && Array.isArray(nodeRefs.current)) {
    nodeRefs.current.push(handle);
  }

  return handle;
}

/**
 * schedulePlay: Actually schedules an audio buffer to play in the future
 */
function schedulePlay({
  buffer,
  audioCtx,
  volumeRef,
  when,
  nodeRefs, // Add nodeRefs parameter to track audio nodes
  debugInfo = {}
}) {
  if (!buffer || !audioCtx) return;
  const now = audioCtx.currentTime;

  // Drastically reduce the forced offset to ~1 ms if behind schedule:
  if (when <= now) {
    when = now + 0.001; // was 0.005 or 0.010 - now only 1 ms
  }

  // The rest is unchanged:
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const gainNode = audioCtx.createGain();
  // If you used ramping, keep or remove it as you like:
  gainNode.gain.setValueAtTime(volumeRef.current, when);

  source.connect(gainNode).connect(audioCtx.destination);
  source.start(when);

  // Keep track of the source for cleanup:
  if (nodeRefs && Array.isArray(nodeRefs.current)) {
    nodeRefs.current.push(source);
  }

  // Cleanup after playback stops
  source.onended = () => {
    try {
      source.disconnect();
      gainNode.disconnect();
    } catch (err) {
      // ignore
    }
    if (nodeRefs && Array.isArray(nodeRefs.current)) {
      const idx = nodeRefs.current.indexOf(source);
      if (idx !== -1) {
        nodeRefs.current.splice(idx, 1);
      }
    }
  };
  return source;
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
  beatConfigRef,
  accentsRef,
  shouldMute,
  playedBeatTimesRef,
  updateActualBpm,
  onBeatDue,
  debugInfo = {},
  nodeRefs
}) {
  const scheduledWhen = when <= audioCtx.currentTime
    ? audioCtx.currentTime + 0.001
    : when;

  scheduleAtAudioTime({
    audioCtx,
    when: scheduledWhen,
    nodeRefs,
    callback: () => {
      if (onAnySubTrigger) onAnySubTrigger(subIndex);
      if (onBeatDue) onBeatDue({ subIndex, when: scheduledWhen, isMuted: shouldMute });

      if (shouldMute) {
        window.dispatchEvent(new CustomEvent('silent-beat-played', {
          detail: { timestamp: performance.now(), subIndex, when: scheduledWhen }
        }));
      }
    }
  });

  // If we are muting, skip playback. Visual state is still delivered above at
  // the exact due time.
  if (shouldMute) {
    return;
  } else {
    if (playedBeatTimesRef) {
      // Measure the audio timeline, not the JavaScript scheduler invocation.
      playedBeatTimesRef.current.push(scheduledWhen * 1000);
    }
    if (typeof updateActualBpm === 'function') {
      updateActualBpm();
    }
  }

  let buffer = null;
  let soundType = 'none';

  if (analogMode) {
    buffer = normalBufferRef.current; 
    soundType = 'normal';
  } else if (gridMode) {
    const state = beatConfigRef?.current?.[subIndex]; 
    // 3=first,2=accent,1=normal,0=off
    if (state === 3) { 
      buffer = firstBufferRef.current; 
      soundType = 'first';
    } else if (state === 2) {
      buffer = accentBufferRef.current; 
      soundType = 'accent';
    } else if (state === 1) {
      buffer = normalBufferRef.current; 
      soundType = 'normal';
    }
  } else {
    // circle mode
    const accentVal = accentsRef?.current?.[subIndex];
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
    // accentVal=0 => no sound
  }

  if (buffer) {
    schedulePlay({
      buffer,
      audioCtx,
      volumeRef,
      when: scheduledWhen,
      nodeRefs,
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
  getCurrentSubIntervalSec,
  tempo,
  handleMeasureBoundary,
  scheduleSubFn,
  subdivisionsRef,
  multiCircleMode,
  nodeRefs,
  schedulerRunningRef
}) {
  if (!schedulerRunningRef?.current) return;
  const audioCtx = audioCtxRef?.current;
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const lookaheadTime = multiCircleMode
    ? SCHEDULE_AHEAD_TIME * 1.2
    : SCHEDULE_AHEAD_TIME;

  while (nextNoteTimeRef.current < now + lookaheadTime) {
    if (!schedulerRunningRef.current) break;
    const subIndex = currentSubRef.current;

    // Keep the musical phase after a stalled UI thread, but never collapse
    // missed clicks into a burst at the current time.
    if (nextNoteTimeRef.current >= now) {
      scheduleSubFn(subIndex, nextNoteTimeRef.current, nodeRefs);
    }

    // Next subdivision
    const intervalSec = getCurrentSubIntervalSec(subIndex);
    nextNoteTimeRef.current += intervalSec;
    currentSubRef.current = (subIndex + 1) % subdivisionsRef.current;

    // If we've hit the start of a new measure
    if (currentSubRef.current === 0) {
      handleMeasureBoundary();
      if (nextNoteTimeRef.current >= now) scheduleAtAudioTime({
        audioCtx,
        when: nextNoteTimeRef.current,
        nodeRefs,
        callback: () => window.dispatchEvent(new CustomEvent('measure-complete'))
      });
    }
  }
}
