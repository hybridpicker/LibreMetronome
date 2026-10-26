// Controllable fake Web Audio context for the metronome logic tests.
// `currentTime` is advanced manually; every buffer source start is recorded.

export function createFakeAudioContext({
  state = 'running',
  currentTime = 0,
  sampleRate = 48000,
  outputLatency = 0
} = {}) {
  const ctx = {
    state,
    currentTime,
    sampleRate,
    outputLatency,
    destination: { name: 'destination' },
    starts: [], // { when, buffer, gain }
    gains: [],
    sources: [],
    resume: jest.fn(async function resume() {
      ctx.state = 'running';
    }),
    createGain: jest.fn(() => {
      const gainNode = {
        gain: { value: 1, setValueAtTime: jest.fn() },
        connect: jest.fn(function connect(target) { return target; }),
        disconnect: jest.fn()
      };
      ctx.gains.push(gainNode);
      return gainNode;
    }),
    createBufferSource: jest.fn(() => {
      const index = ctx.sources.length;
      const source = {
        buffer: null,
        connect: jest.fn(function connect() {
          return ctx.gains[ctx.gains.length - 1] || source;
        }),
        disconnect: jest.fn(),
        stop: jest.fn(),
        start: jest.fn((when) => {
          const gainNode = ctx.gains[ctx.gains.length - 1];
          ctx.starts.push({
            when,
            buffer: source.buffer,
            gainNode,
            index
          });
        })
      };
      ctx.sources.push(source);
      return source;
    }),
    createBuffer: jest.fn((channels, length, rate) => {
      const data = new Float32Array(length);
      return {
        numberOfChannels: channels,
        length,
        sampleRate: rate,
        duration: length / rate,
        getChannelData: () => data
      };
    }),
    decodeAudioData: jest.fn(async () => ({ duration: 0.05, sampleRate: 48000 }))
  };
  return ctx;
}

// Distinct sentinel buffers so tests can tell which click was scheduled.
export function createBufferRefs() {
  return {
    normalBufferRef: { current: { name: 'normal' } },
    accentBufferRef: { current: { name: 'accent' } },
    firstBufferRef: { current: { name: 'first' } }
  };
}

export function silenceConsole() {
  const spies = ['log', 'warn', 'error'].map((m) =>
    jest.spyOn(console, m).mockImplementation(() => {})
  );
  return () => spies.forEach((s) => s.mockRestore());
}
