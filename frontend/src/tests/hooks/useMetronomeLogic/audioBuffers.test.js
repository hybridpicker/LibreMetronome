import { createFakeAudioContext, silenceConsole } from '../../helpers/metronome-fakeAudio';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

let mod;
let restoreConsole;
let originalFetch;
let originalRequest;
let originalAbortTimeout;
let originalAudioContext;
let originalWebkit;

function freshModule() {
  jest.resetModules();
  mod = require('../../../hooks/useMetronomeLogic/audioBuffers');
  return mod;
}

function setCookie(value) {
  document.cookie = `activeSoundSetId=${value}; path=/`;
}
function clearCookie() {
  document.cookie = 'activeSoundSetId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = 'other=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

// fetch that serves a valid-looking audio payload for every URL
function okResponse(bytes = 200) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: jest.fn(async () => ({ byteLength: bytes }))
  };
}

beforeEach(() => {
  restoreConsole = silenceConsole();
  originalFetch = global.fetch;
  originalRequest = global.Request;
  originalAbortTimeout = AbortSignal.timeout;
  originalAudioContext = window.AudioContext;
  originalWebkit = window.webkitAudioContext;
  global.Request = class FakeRequest {};
  AbortSignal.timeout = jest.fn(() => 'timeout-signal');
  global.fetch = jest.fn(async () => okResponse());
  jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  clearCookie();
  delete window._audioContext;
  delete window._audioContextInit;
  delete window._multiCircleAudioContext;
  delete window.metronomeDebug;
  freshModule();
});

afterEach(() => {
  restoreConsole();
  global.fetch = originalFetch;
  global.Request = originalRequest;
  AbortSignal.timeout = originalAbortTimeout;
  window.AudioContext = originalAudioContext;
  window.webkitAudioContext = originalWebkit;
  clearCookie();
  delete window._audioContext;
  delete window._audioContextInit;
  delete window._multiCircleAudioContext;
  delete window.metronomeDebug;
  delete Promise.withPriority;
  delete navigator.scheduling;
  jest.restoreAllMocks();
});

describe('initAudioContext', () => {
  test('creates a 48 kHz interactive context and publishes it on window', () => {
    const ctor = jest.fn(function Ctx() { this.state = 'running'; this.sampleRate = 48000; });
    window.AudioContext = ctor;
    const ctx = mod.initAudioContext();
    expect(ctor).toHaveBeenCalledWith({ sampleRate: 48000, latencyHint: 'interactive' });
    expect(window._audioContext).toBe(ctx);
    expect(window._audioContextInit).toBe(ctx);
    expect(mod.globalAudioCtx).toBe(ctx);
  });

  test('reuses the existing context on later calls', () => {
    const ctor = jest.fn(function Ctx() { this.state = 'suspended'; });
    window.AudioContext = ctor;
    const first = mod.initAudioContext();
    const second = mod.initAudioContext();
    expect(second).toBe(first);
    expect(ctor).toHaveBeenCalledTimes(1);
  });

  test('replaces a closed context with a new one', () => {
    const instances = [];
    window.AudioContext = jest.fn(function Ctx() { this.state = 'running'; instances.push(this); });
    const first = mod.initAudioContext();
    first.state = 'closed';
    const second = mod.initAudioContext();
    expect(second).not.toBe(first);
    expect(instances).toHaveLength(2);
    expect(window._audioContext).toBe(second);
  });

  test('adopts a context that another mode left on window._audioContext', () => {
    const existing = { state: 'running' };
    window._audioContext = existing;
    window.AudioContext = jest.fn();
    expect(mod.initAudioContext()).toBe(existing);
    expect(window._audioContextInit).toBe(existing);
    expect(window.AudioContext).not.toHaveBeenCalled();
  });

  test('falls back to webkitAudioContext', () => {
    window.AudioContext = undefined;
    const webkit = jest.fn(function Ctx() { this.state = 'running'; });
    window.webkitAudioContext = webkit;
    const ctx = mod.initAudioContext();
    expect(webkit).toHaveBeenCalledTimes(1);
    expect(ctx).toBeInstanceOf(webkit);
  });

  test('logs when a new context starts suspended and when input-pending scheduling exists', () => {
    window.AudioContext = jest.fn(function Ctx() { this.state = 'suspended'; });
    navigator.scheduling = { isInputPending: jest.fn() };
    mod.initAudioContext();
    expect(console.log).toHaveBeenCalledWith('Audio context is suspended and requires user interaction to start');
    expect(console.log).toHaveBeenCalledWith('Using prioritized scheduling for audio processing');
  });

  test('retries without options when the optimised constructor throws', () => {
    const calls = [];
    window.AudioContext = undefined;
    // The catch block uses the global AudioContext binding
    global.AudioContext = jest.fn(function Ctx(opts) {
      calls.push(opts);
      if (opts) throw new Error('options not supported');
      this.state = 'running';
    });
    window.AudioContext = global.AudioContext;
    const ctx = mod.initAudioContext();
    expect(calls).toEqual([{ sampleRate: 48000, latencyHint: 'interactive' }, undefined]);
    expect(ctx.state).toBe('running');
    expect(window._audioContext).toBe(ctx);
    expect(mod.globalAudioCtx).toBe(ctx);
    global.AudioContext = originalAudioContext;
  });

  test('returns null when both attempts throw', () => {
    global.AudioContext = jest.fn(function Ctx() { throw new Error('nope'); });
    window.AudioContext = global.AudioContext;
    expect(mod.initAudioContext()).toBeNull();
    expect(console.error).toHaveBeenCalledWith('Error creating fallback AudioContext:', expect.any(Error));
    global.AudioContext = originalAudioContext;
  });

  test('outside the test environment a missing Web Audio API yields null', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
    try {
      expect(mod.initAudioContext()).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Web Audio API is not supported in this browser');
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});

describe('resumeAudioContext', () => {
  test('null context -> false', async () => {
    await expect(mod.resumeAudioContext(null)).resolves.toBe(false);
  });

  test('running context is returned as-is without calling resume', async () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    await expect(mod.resumeAudioContext(ctx)).resolves.toBe(true);
    expect(ctx.resume).not.toHaveBeenCalled();
  });

  test('closed context cannot be resumed', async () => {
    const ctx = createFakeAudioContext({ state: 'closed' });
    await expect(mod.resumeAudioContext(ctx)).resolves.toBe(false);
    expect(ctx.resume).not.toHaveBeenCalled();
  });

  test.each(['suspended', 'interrupted'])('%s context is resumed on the first attempt', async (state) => {
    const ctx = createFakeAudioContext({ state });
    await expect(mod.resumeAudioContext(ctx)).resolves.toBe(true);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });

  test('plays a silent buffer and resumes again when the first resume does not help', async () => {
    const ctx = createFakeAudioContext({ state: 'suspended' });
    let calls = 0;
    ctx.resume.mockImplementation(async () => {
      calls += 1;
      if (calls === 2) ctx.state = 'running';
    });
    await expect(mod.resumeAudioContext(ctx)).resolves.toBe(true);
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(ctx.createBuffer).toHaveBeenCalledWith(1, 1, 22050);
    expect(ctx.sources[0].start).toHaveBeenCalledTimes(1);
  });

  test('returns false and warns when the context never starts', async () => {
    const ctx = createFakeAudioContext({ state: 'suspended' });
    ctx.resume.mockImplementation(async () => {});
    await expect(mod.resumeAudioContext(ctx)).resolves.toBe(false);
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('still not running'));
  });

  test('returns false when resume rejects', async () => {
    const ctx = createFakeAudioContext({ state: 'suspended' });
    ctx.resume.mockRejectedValue(new Error('denied'));
    await expect(mod.resumeAudioContext(ctx)).resolves.toBe(false);
  });
});

describe('resumeSharedAudioContexts', () => {
  test('is false when no context exists', async () => {
    await expect(mod.resumeSharedAudioContexts()).resolves.toBe(false);
  });

  test('skips closed contexts and resumes the rest', async () => {
    const closed = createFakeAudioContext({ state: 'closed' });
    const suspended = createFakeAudioContext({ state: 'suspended' });
    window._audioContext = closed;
    window._multiCircleAudioContext = suspended;
    await expect(mod.resumeSharedAudioContexts()).resolves.toBe(true);
    expect(suspended.resume).toHaveBeenCalledTimes(1);
    expect(closed.resume).not.toHaveBeenCalled();
  });

  test('is false when any context fails to resume', async () => {
    const stuck = createFakeAudioContext({ state: 'suspended' });
    stuck.resume.mockImplementation(async () => {});
    const fine = createFakeAudioContext({ state: 'suspended' });
    window._audioContext = stuck;
    window._multiCircleAudioContext = fine;
    await expect(mod.resumeSharedAudioContexts()).resolves.toBe(false);
  });
});

describe('loadClickBuffers', () => {
  const makeRefs = () => ({
    normalBufferRef: { current: null },
    accentBufferRef: { current: null },
    firstBufferRef: { current: null }
  });
  const fetchedUrls = () => global.fetch.mock.calls.map((c) => c[0]);

  test('without an audio context it fails fast', async () => {
    await expect(mod.loadClickBuffers({ audioCtx: null, ...makeRefs() })).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('loads the bundled default clicks sequentially with cache busting', async () => {
    const ctx = createFakeAudioContext();
    const refs = makeRefs();
    const decoded = [{ duration: 0.1, sampleRate: 48000 }, { duration: 0.2, sampleRate: 48000 }, { duration: 0.3, sampleRate: 48000 }];
    ctx.decodeAudioData.mockImplementation(async () => decoded.shift());
    await expect(mod.loadClickBuffers({ audioCtx: ctx, ...refs })).resolves.toBe(true);
    expect(fetchedUrls()).toEqual([
      '/assets/audio/click_new.wav?cb=1700000000000',
      '/assets/audio/click_new_accent.wav?cb=1700000000000',
      '/assets/audio/click_new_first.wav?cb=1700000000000'
    ]);
    expect(refs.normalBufferRef.current.duration).toBe(0.1);
    expect(refs.accentBufferRef.current.duration).toBe(0.2);
    expect(refs.firstBufferRef.current.duration).toBe(0.3);
    expect(refs.normalBufferRef.current._optimizedForExpertTiming).toBe(true);
    expect(refs.normalBufferRef.current._sampleRate).toBe(48000);
  });

  test('sends CORS/credentials/timeout fetch options and keeps priority when supported', async () => {
    global.Request = class { get priority() { return 'auto'; } };
    const ctx = createFakeAudioContext();
    await mod.loadClickBuffers({ audioCtx: ctx, ...makeRefs() });
    const options = global.fetch.mock.calls[0][1];
    expect(options).toMatchObject({
      credentials: 'include',
      mode: 'cors',
      priority: 'high',
      signal: 'timeout-signal'
    });
    expect(options.headers.Accept).toContain('audio/mpeg');
    expect(AbortSignal.timeout).toHaveBeenCalledWith(10000);
  });

  test('drops the priority hint where the browser does not support it', async () => {
    await mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), ...makeRefs() });
    expect(global.fetch.mock.calls[0][1]).not.toHaveProperty('priority');
  });

  test('decodes through Promise.withPriority when it exists', async () => {
    Promise.withPriority = jest.fn((p) => p);
    const ctx = createFakeAudioContext();
    await mod.loadClickBuffers({ audioCtx: ctx, ...makeRefs() });
    expect(Promise.withPriority).toHaveBeenCalledTimes(3);
    expect(Promise.withPriority.mock.calls[0][1]).toBe('high');
  });

  test('publishes loaded buffers on window.metronomeDebug when it exists', async () => {
    window.metronomeDebug = {};
    const ctx = createFakeAudioContext();
    const refs = makeRefs();
    await mod.loadClickBuffers({ audioCtx: ctx, ...refs });
    expect(window.metronomeDebug.audioBuffers).toEqual({
      normal: refs.normalBufferRef.current,
      accent: refs.accentBufferRef.current,
      first: refs.firstBufferRef.current
    });
    expect(window.metronomeDebug.audioContext).toBe(ctx);
  });

  describe('sound set selection', () => {
    const soundSet = {
      id: 7,
      name: 'Custom',
      normal_beat_sound_url: 'https://cdn.example/normal.mp3',
      accent_sound_url: 'https://cdn.example/accent.mp3',
      first_beat_sound_url: 'https://cdn.example/first.mp3'
    };

    test('uses the provided sound set when there is no cookie', async () => {
      await mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...makeRefs() });
      expect(fetchedUrls()).toEqual([
        'https://cdn.example/normal.mp3?cb=1700000000000',
        'https://cdn.example/accent.mp3?cb=1700000000000',
        'https://cdn.example/first.mp3?cb=1700000000000'
      ]);
    });

    test('missing urls in the sound set keep the bundled defaults', async () => {
      await mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet: { id: 1, name: 'Partial', accent_sound_url: 'https://cdn.example/a.mp3' }, ...makeRefs() });
      expect(fetchedUrls()).toEqual([
        '/assets/audio/click_new.wav?cb=1700000000000',
        'https://cdn.example/a.mp3?cb=1700000000000',
        '/assets/audio/click_new_first.wav?cb=1700000000000'
      ]);
    });

    test.each([
      ['woodblock', 'wood'],
      ['default-woodblock', 'wood'],
      ['drums', 'drum'],
      ['default-drums', 'drum']
    ])('cookie %s selects the %s sounds (backend host prefixed)', async (cookie, prefix) => {
      setCookie(cookie);
      await mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...makeRefs() });
      expect(fetchedUrls()).toEqual([
        `${BACKEND}/metronome_sounds/${prefix}_normal_sound.mp3?cb=1700000000000`,
        `${BACKEND}/metronome_sounds/${prefix}_accent_sound.mp3?cb=1700000000000`,
        `${BACKEND}/metronome_sounds/${prefix}_first_sound.mp3?cb=1700000000000`
      ]);
    });

    test('cookie matching the provided sound set uses that set (cookie read among others)', async () => {
      document.cookie = 'other=1; path=/';
      setCookie('7');
      await mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...makeRefs() });
      expect(fetchedUrls()[0]).toBe('https://cdn.example/normal.mp3?cb=1700000000000');
    });

    test('cookie for an unknown custom set builds the API paths', async () => {
      setCookie('42');
      await mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...makeRefs() });
      expect(fetchedUrls()).toEqual([
        '/api/sound-sets/42/normal-beat-sound/?cb=1700000000000',
        '/api/sound-sets/42/accent-sound/?cb=1700000000000',
        '/api/sound-sets/42/first-beat-sound/?cb=1700000000000'
      ]);
    });

    test('ignorePreferences skips both cookie and sound set', async () => {
      setCookie('drums');
      await mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ignorePreferences: true, ...makeRefs() });
      expect(fetchedUrls()[0]).toBe('/assets/audio/click_new.wav?cb=1700000000000');
    });
  });

  describe('url rewriting for /metronome_sounds/', () => {
    const loadWith = (url) => mod.loadClickBuffers({
      audioCtx: createFakeAudioContext(),
      soundSet: { id: 1, name: 'x', normal_beat_sound_url: url },
      ...makeRefs()
    });

    test('relative path gets the backend host', async () => {
      await loadWith('/metronome_sounds/a_normal.mp3');
      expect(fetchedUrls()[0]).toBe(`${BACKEND}/metronome_sounds/a_normal.mp3?cb=1700000000000`);
    });

    test.each(['http://localhost:3000', 'http://localhost:3001'])('dev-server origin %s is replaced by the backend', async (origin) => {
      await loadWith(`${origin}/metronome_sounds/a_normal.mp3`);
      expect(fetchedUrls()[0]).toBe(`${BACKEND}/metronome_sounds/a_normal.mp3?cb=1700000000000`);
    });

    test('other absolute urls stay untouched and an existing query gets &cb', async () => {
      await loadWith('https://static.example/metronome_sounds/a_normal.mp3?v=2');
      expect(fetchedUrls()[0]).toBe('https://static.example/metronome_sounds/a_normal.mp3?v=2&cb=1700000000000');
    });
  });

  describe('failure handling', () => {
    test.each([
      ['first_', '/assets/audio/click_new_first.wav'],
      ['accent_', '/assets/audio/click_new_accent.wav'],
      ['second_', '/assets/audio/click_new_accent.wav'],
      ['other_', '/assets/audio/click_new.wav']
    ])('a failed fetch of /metronome_sounds/%s falls back to %s', async (kind, fallback) => {
      global.fetch = jest.fn(async (url) => {
        if (url.includes('/metronome_sounds/')) throw new Error('network down');
        return okResponse();
      });
      const refs = makeRefs();
      const soundSet = { id: 1, name: 'x', normal_beat_sound_url: `/metronome_sounds/${kind}one.mp3`, accent_sound_url: '/assets/audio/click_new_accent.wav', first_beat_sound_url: '/assets/audio/click_new_first.wav' };
      await expect(mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...refs })).resolves.toBe(true);
      expect(fetchedUrls()[1]).toBe(`${fallback}?cb=1700000000000`);
      expect(refs.normalBufferRef.current).toBeTruthy();
    });

    test('HTTP errors count as fetch failures', async () => {
      global.fetch = jest.fn(async (url) => (url.includes('/metronome_sounds/')
        ? { ok: false, status: 404, statusText: 'Not Found' }
        : okResponse()));
      const soundSet = { id: 1, name: 'x', normal_beat_sound_url: '/metronome_sounds/n.mp3' };
      await expect(mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...makeRefs() })).resolves.toBe(true);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Fetch error'), expect.objectContaining({ message: 'HTTP error: 404 Not Found' }));
    });

    test('too-small payloads and decode errors fall back for /metronome_sounds/ urls', async () => {
      global.fetch = jest.fn(async (url) => (url.includes('/metronome_sounds/') ? okResponse(10) : okResponse()));
      const soundSet = { id: 1, name: 'x', normal_beat_sound_url: '/metronome_sounds/n.mp3' };
      const refs = makeRefs();
      await expect(mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...refs })).resolves.toBe(true);
      expect(fetchedUrls()[1]).toBe('/assets/audio/click_new.wav?cb=1700000000000');

      global.fetch = jest.fn(async () => okResponse());
      const ctx = createFakeAudioContext();
      ctx.decodeAudioData.mockRejectedValueOnce(new Error('bad data'));
      await expect(mod.loadClickBuffers({ audioCtx: ctx, soundSet, ...makeRefs() })).resolves.toBe(true);
    });

    test.each([
      ['first_', '/assets/audio/click_new_first.wav'],
      ['accent_', '/assets/audio/click_new_accent.wav'],
      ['second_', '/assets/audio/click_new_accent.wav']
    ])('a corrupt /metronome_sounds/%s payload falls back to %s', async (kind, fallback) => {
      global.fetch = jest.fn(async (url) => (url.includes('/metronome_sounds/') ? okResponse(10) : okResponse()));
      const soundSet = { id: 1, name: 'x', normal_beat_sound_url: `/metronome_sounds/${kind}one.mp3` };
      await expect(mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...makeRefs() })).resolves.toBe(true);
      expect(fetchedUrls()[1]).toBe(`${fallback}?cb=1700000000000`);
    });

    test('a null decode result is an error', async () => {
      const ctx = createFakeAudioContext();
      ctx.decodeAudioData.mockResolvedValue(null);
      const refs = makeRefs();
      // no preferences -> falls straight through to the procedural clicks
      await expect(mod.loadClickBuffers({ audioCtx: ctx, ...refs })).resolves.toBe(true);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error processing sound'), expect.objectContaining({ message: 'Decoded buffer is null or undefined' }));
      expect(ctx.createBuffer).toHaveBeenCalledTimes(3);
    });

    test('a failing custom set is retried once with the bundled defaults (ignorePreferences)', async () => {
      global.fetch = jest.fn(async (url) => {
        if (url.startsWith('https://broken.example')) throw new Error('offline');
        return okResponse();
      });
      const soundSet = { id: 9, name: 'Broken', normal_beat_sound_url: 'https://broken.example/n.mp3' };
      const refs = makeRefs();
      await expect(mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), soundSet, ...refs })).resolves.toBe(true);
      expect(fetchedUrls()).toEqual([
        'https://broken.example/n.mp3?cb=1700000000000',
        '/assets/audio/click_new.wav?cb=1700000000000',
        '/assets/audio/click_new_accent.wav?cb=1700000000000',
        '/assets/audio/click_new_first.wav?cb=1700000000000'
      ]);
      expect(refs.firstBufferRef.current).toBeTruthy();
    });

    test('a stale cookie preference also triggers the default retry', async () => {
      setCookie('77');
      global.fetch = jest.fn(async (url) => {
        if (url.startsWith('/api/')) return { ok: false, status: 500, statusText: 'Server Error' };
        return okResponse();
      });
      await expect(mod.loadClickBuffers({ audioCtx: createFakeAudioContext(), ...makeRefs() })).resolves.toBe(true);
      expect(fetchedUrls()[1]).toBe('/assets/audio/click_new.wav?cb=1700000000000');
    });

    test('when even the defaults fail, procedural clicks are generated', async () => {
      global.fetch = jest.fn(async () => { throw new Error('offline'); });
      const ctx = createFakeAudioContext({ sampleRate: 48000 });
      const refs = makeRefs();
      await expect(mod.loadClickBuffers({ audioCtx: ctx, ...refs })).resolves.toBe(true);
      expect(console.warn).toHaveBeenCalledWith('Using procedural metronome clicks as an audio fallback');

      // 45 ms mono clicks at the context sample rate
      expect(ctx.createBuffer).toHaveBeenCalledTimes(3);
      expect(ctx.createBuffer).toHaveBeenNthCalledWith(1, 1, 2160, 48000);

      // exact sample values: decaying two-partial sine, amplitude per accent level
      const sample = (buffer, frame) => buffer.getChannelData(0)[frame];
      const expectedSample = (freq, amp, frame) => {
        const t = frame / 48000;
        return amp * Math.exp(-t * 95) * (0.82 * Math.sin(2 * Math.PI * freq * t) + 0.18 * Math.sin(2 * Math.PI * freq * 2.03 * t));
      };
      expect(sample(refs.normalBufferRef.current, 0)).toBe(0);
      [10, 100, 1000].forEach((frame) => {
        expect(sample(refs.normalBufferRef.current, frame)).toBeCloseTo(expectedSample(1650, 0.64, frame), 5);
        expect(sample(refs.accentBufferRef.current, frame)).toBeCloseTo(expectedSample(2150, 0.78, frame), 5);
        expect(sample(refs.firstBufferRef.current, frame)).toBeCloseTo(expectedSample(2700, 0.9, frame), 5);
      });
    });

    test('returns false when the procedural fallback cannot be built either', async () => {
      global.fetch = jest.fn(async () => { throw new Error('offline'); });
      const ctx = createFakeAudioContext();
      ctx.createBuffer.mockImplementation(() => { throw new Error('no buffers'); });
      await expect(mod.loadClickBuffers({ audioCtx: ctx, ...makeRefs() })).resolves.toBe(false);
      expect(console.error).toHaveBeenCalledWith('Unable to create procedural fallback clicks:', expect.any(Error));
    });
  });
});
