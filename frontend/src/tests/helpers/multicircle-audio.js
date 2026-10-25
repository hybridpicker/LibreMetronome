// Shared helpers for the Sequence Mode (MultiCircleMode) tests.
// A controllable fake AudioContext that records every buffer source that is started.

export const BUFFERS = {
  normal: { name: 'normal' },
  accent: { name: 'accent' },
  first: { name: 'first' }
};

export function createFakeAudioContext({ state = 'running', resumeImpl } = {}) {
  const ctx = {
    state,
    currentTime: 0,
    destination: { name: 'destination' },
    sources: [],
    starts: [], // { time, buffer, gain }
    resume: jest.fn(resumeImpl || (async () => { ctx.state = 'running'; })),
    suspend: jest.fn(async () => { ctx.state = 'suspended'; }),
    decodeAudioData: jest.fn(async () => ({ name: 'decoded' })),
    createBuffer: jest.fn(() => ({ name: 'silent' })),
    createGain: jest.fn(() => {
      const gain = { value: 1, setValueAtTime: jest.fn((v, t) => { gain.lastValue = v; gain.lastTime = t; }) };
      return { gain, connect: jest.fn(n => n), disconnect: jest.fn() };
    }),
    createBufferSource: jest.fn(() => {
      const source = {
        buffer: null,
        connect: jest.fn(n => n),
        disconnect: jest.fn(),
        stop: jest.fn(),
        start: jest.fn(time => {
          ctx.starts.push({ time, buffer: source.buffer, source });
        })
      };
      ctx.sources.push(source);
      return source;
    })
  };
  return ctx;
}

/** Accent level (3 first, 2 accent, 1 normal) from a recorded start. */
export function levelOf(start) {
  return { first: 3, accent: 2, normal: 1 }[start.buffer.name];
}

/** Advance the fake audio clock and fake timers together in small steps. */
export async function runClock(act, ctx, seconds, stepMs = 20) {
  const steps = Math.round((seconds * 1000) / stepMs);
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      ctx.currentTime += stepMs / 1000;
      jest.advanceTimersByTime(stepMs);
    });
  }
}
