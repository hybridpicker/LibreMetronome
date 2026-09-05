import { initAudioContext } from './audioBuffers';

const FEEDBACK_DURATION_SECONDS = 0.045;

/**
 * Plays a short procedural click from the same shared AudioContext used by the
 * metronome. Keeping this independent of downloaded sound sets makes the first
 * tap audible immediately, including during the iOS audio-unlock gesture.
 */
export function playTapFeedback(volume = 0.5) {
  const audioCtx = initAudioContext();
  if (!audioCtx || audioCtx.state === 'closed') return false;

  if (audioCtx.state !== 'running' && typeof audioCtx.resume === 'function') {
    audioCtx.resume().catch(() => {});
  }

  try {
    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const normalizedVolume = Math.min(1, Math.max(0, Number(volume) || 0));
    const peakGain = Math.max(0.0001, normalizedVolume * 0.24);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(1750, now);
    if (typeof oscillator.frequency.exponentialRampToValueAtTime === 'function') {
      oscillator.frequency.exponentialRampToValueAtTime(950, now + FEEDBACK_DURATION_SECONDS);
    }

    gain.gain.setValueAtTime(peakGain, now);
    if (typeof gain.gain.exponentialRampToValueAtTime === 'function') {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + FEEDBACK_DURATION_SECONDS);
    } else {
      gain.gain.setValueAtTime(0.0001, now + FEEDBACK_DURATION_SECONDS);
    }

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.onended = () => {
      if (typeof oscillator.disconnect === 'function') oscillator.disconnect();
      if (typeof gain.disconnect === 'function') gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + FEEDBACK_DURATION_SECONDS);
    return true;
  } catch (error) {
    console.warn('[Tap feedback] Unable to play feedback click:', error);
    return false;
  }
}
