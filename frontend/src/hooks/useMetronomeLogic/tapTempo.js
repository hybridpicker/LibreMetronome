// src/hooks/useMetronomeLogic/tapTempo.js
import { TEMPO_MIN, TEMPO_MAX } from './constants';

export function createTapTempoLogic(setTempo) {
  const tapTimes = [];

  function handleTapTempo() {
    const now = performance.now();
    tapTimes.push(now);

    // Limit to last 5 taps:
    if (tapTimes.length > 5) {
      tapTimes.shift();
    }

    // If we have at least 2 taps, compute average
    if (tapTimes.length > 1) {
      let sum = 0;
      for (let i = 1; i < tapTimes.length; i++) {
        sum += tapTimes[i] - tapTimes[i - 1];
      }
      const avgMs = sum / (tapTimes.length - 1);
      const newTempo = Math.round(60000 / avgMs);

      // clamp between min and max
      const clamped = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, newTempo));
      setTempo(clamped);
    }
  }

  return handleTapTempo;
}