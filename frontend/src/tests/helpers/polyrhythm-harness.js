import { act, renderHook } from '@testing-library/react';
import usePolyrhythmLogic from '../../components/metronome/PolyrhythmMode/usePolyrhythmLogic';
import { initAudioContext, loadClickBuffers, resumeAudioContext } from '../../hooks/useMetronomeLogic/audioBuffers';
import { createFakeContext, loadBuffersInto, startedHits } from './polyrhythm-audio';

// Tests using this harness must declare, at module level:
//   jest.mock('../../hooks/useMetronomeLogic/audioBuffers');
//   jest.mock('../../services/soundSetService', () => ({ getActiveSoundSet: jest.fn(async () => null) }));

export const STEP_MS = 5;

export const BASE_PROPS = {
  tempo: 120,
  innerBeats: 3,
  outerBeats: 4,
  isPaused: true,
  volume: 0.5,
  innerAccents: [3, 1, 1],
  outerAccents: [2, 1, 1, 1]
};

export function setupAudioMocks(ctx) {
  initAudioContext.mockReturnValue(ctx);
  resumeAudioContext.mockImplementation(async c => {
    c.state = 'running';
    return true;
  });
  loadClickBuffers.mockImplementation(refs => loadBuffersInto(refs));
}

// Advances the audio clock and the jest timers together in small steps, flushing
// promise continuations (startScheduler is async) after every step.
export async function advance(ctx, ms) {
  await act(async () => {
    for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) {
      ctx.currentTime += STEP_MS / 1000;
      jest.advanceTimersByTime(STEP_MS);
      for (let i = 0; i < 12; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
      }
    }
  });
}

// options.loader replaces the loadClickBuffers implementation before the hook mounts.
export function mountPolyrhythm(props = {}, ctx = createFakeContext(), options = {}) {
  setupAudioMocks(ctx);
  if (options.loader) loadClickBuffers.mockImplementation(options.loader);
  let current = { ...BASE_PROPS, ...props };
  const rendered = renderHook(p => usePolyrhythmLogic(p), { initialProps: current });
  const rerenderWith = next => {
    current = { ...current, ...next };
    rendered.rerender(current);
  };
  return { ctx, ...rendered, rerenderWith };
}

export const hitTimes = ctx => startedHits(ctx).map(h => Number(h.time.toFixed(6)));

export function silenceConsole() {
  return ['log', 'warn', 'error'].map(m => jest.spyOn(console, m).mockImplementation(() => {}));
}

export function clearGlobals() {
  delete window.currentTempo;
  delete window.currentInnerBeats;
  delete window.isSilencePhaseRef;
  delete window.audioContext;
}
