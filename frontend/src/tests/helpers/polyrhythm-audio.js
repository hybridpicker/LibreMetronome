// Controllable fake AudioContext for the polyrhythm tests. It records every
// started buffer source so tests can assert the exact scheduled timeline.

export const BUFFERS = {
  normal: { name: 'normal' },
  accent: { name: 'accent' },
  first: { name: 'first' }
};

export function createFakeContext(overrides = {}) {
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: { name: 'destination' },
    sources: [],
    createBufferSource: jest.fn(() => {
      const source = {
        buffer: null,
        detune: { value: 0 },
        onended: null,
        gainNode: null,
        startedAt: null,
        connect: jest.fn(node => {
          source.gainNode = node;
          return node;
        }),
        start: jest.fn(time => {
          source.startedAt = time;
        }),
        stop: jest.fn(),
        disconnect: jest.fn()
      };
      ctx.sources.push(source);
      return source;
    }),
    createGain: jest.fn(() => ({
      gain: {
        value: 1,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn()
      },
      connect: jest.fn(),
      disconnect: jest.fn()
    })),
    ...overrides
  };
  return ctx;
}

// Name of a started source's buffer, e.g. "first".
export const bufferName = source => source.buffer && source.buffer.name;

// Started sources as plain {time, buffer, detune, circle} records.
// circle is derived from the detune: inner +300, outer -100, first beats 0 (shared).
export function startedHits(ctx) {
  return ctx.sources
    .filter(s => s.startedAt !== null)
    .map(s => ({
      time: s.startedAt,
      buffer: bufferName(s),
      detune: s.detune.value,
      source: s
    }));
}

export function loadBuffersInto(refs) {
  refs.normalBufferRef.current = BUFFERS.normal;
  refs.accentBufferRef.current = BUFFERS.accent;
  refs.firstBufferRef.current = BUFFERS.first;
  return Promise.resolve(true);
}
