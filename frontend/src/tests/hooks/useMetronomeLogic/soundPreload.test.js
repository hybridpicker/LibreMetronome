import { silenceConsole } from '../../helpers/metronome-fakeAudio';

jest.mock('../../../hooks/useMetronomeLogic/audioBuffers', () => ({
  applyClickSet: jest.fn(),
  createProceduralClickSet: jest.fn(),
  initAudioContext: jest.fn(),
  loadClickSet: jest.fn()
}));
jest.mock('../../../services/soundSetService', () => ({
  getActiveSoundSet: jest.fn(),
  getRememberedActiveSoundSet: jest.fn()
}));

const ACTIVE = { id: 7, name: 'Active set' };
const PREFERRED = { normal: 'p-normal', accent: 'p-accent', first: 'p-first' };
const BUNDLED = { normal: 'b-normal', accent: 'b-accent', first: 'b-first' };
const PROCEDURAL = { normal: 's-normal', accent: 's-accent', first: 's-first' };

let preload;
// Re-required with the module under test, so they are the mocks it sees
let applyClickSet;
let createProceduralClickSet;
let initAudioContext;
let loadClickSet;
let getActiveSoundSet;
let getRememberedActiveSoundSet;
let restoreConsole;
let ctx;
let preferredLoad; // controls when the active set finishes loading

const makeRefs = () => ({
  normalBufferRef: { current: null },
  accentBufferRef: { current: null },
  firstBufferRef: { current: null }
});
const appliedSet = () => applyClickSet.mock.calls[applyClickSet.mock.calls.length - 1][0];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function flushPromises() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

beforeEach(() => {
  jest.useFakeTimers();
  restoreConsole = silenceConsole();
  jest.resetModules();
  preload = require('../../../hooks/useMetronomeLogic/soundPreload');
  ({
    applyClickSet,
    createProceduralClickSet,
    initAudioContext,
    loadClickSet
  } = require('../../../hooks/useMetronomeLogic/audioBuffers'));
  ({ getActiveSoundSet, getRememberedActiveSoundSet } = require('../../../services/soundSetService'));
  ctx = { name: 'ctx' };
  preferredLoad = deferred();
  initAudioContext.mockReturnValue(ctx);
  getRememberedActiveSoundSet.mockReturnValue(null);
  getActiveSoundSet.mockResolvedValue(ACTIVE);
  loadClickSet.mockImplementation(({ ignorePreferences }) => (
    ignorePreferences ? Promise.resolve(BUNDLED) : preferredLoad.promise
  ));
  createProceduralClickSet.mockReturnValue(PROCEDURAL);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  restoreConsole();
  jest.clearAllMocks();
});

describe('prepareClickBuffers', () => {
  test('uses the active sound set when it is ready in time', async () => {
    const refs = makeRefs();
    preferredLoad.resolve(PREFERRED);
    await expect(preload.prepareClickBuffers({ audioCtx: ctx, ...refs })).resolves.toBe(true);
    expect(appliedSet()).toBe(PREFERRED);
    expect(applyClickSet.mock.calls[0][1]).toEqual(refs);
    expect(loadClickSet).toHaveBeenCalledWith({ audioCtx: ctx, soundSet: ACTIVE });
  });

  test('waits up to 300 ms for the active sound set', async () => {
    const result = preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() });
    jest.advanceTimersByTime(250);
    await flushPromises();
    expect(applyClickSet).not.toHaveBeenCalled();
    preferredLoad.resolve(PREFERRED);
    await expect(result).resolves.toBe(true);
    expect(appliedSet()).toBe(PREFERRED);
  });

  test('after 300 ms it starts with the bundled clicks', async () => {
    expect(preload.PREFERRED_CLICKS_WAIT_MS).toBe(300);
    const result = preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() });
    await flushPromises();
    jest.advanceTimersByTime(300);
    await expect(result).resolves.toBe(true);
    expect(appliedSet()).toBe(BUNDLED);
  });

  test('the active sound set keeps loading and is used at the next start', async () => {
    const first = preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() });
    await flushPromises();
    jest.advanceTimersByTime(300);
    await first;
    preferredLoad.resolve(PREFERRED);
    await expect(preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() })).resolves.toBe(true);
    expect(appliedSet()).toBe(PREFERRED);
  });

  test('a failing active set falls back to the bundled clicks at once', async () => {
    preferredLoad.reject(new Error('offline'));
    await expect(preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() })).resolves.toBe(true);
    expect(appliedSet()).toBe(BUNDLED);
  });

  test('when not even the bundled clicks are ready, synthesized clicks play', async () => {
    loadClickSet.mockImplementation(() => new Promise(() => {}));
    const result = preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() });
    await flushPromises();
    jest.advanceTimersByTime(300);
    await expect(result).resolves.toBe(true);
    expect(appliedSet()).toBe(PROCEDURAL);
  });

  test('reports false when no clicks can be made at all', async () => {
    loadClickSet.mockImplementation(() => Promise.reject(new Error('offline')));
    createProceduralClickSet.mockReturnValue(null);
    await expect(preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() })).resolves.toBe(false);
    expect(applyClickSet).not.toHaveBeenCalled();
  });

  test('a remembered sound set is used without waiting for the server', async () => {
    getRememberedActiveSoundSet.mockReturnValue(ACTIVE);
    getActiveSoundSet.mockReturnValue(new Promise(() => {})); // the server never answers
    preferredLoad.resolve(PREFERRED);
    await expect(preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() })).resolves.toBe(true);
    expect(appliedSet()).toBe(PREFERRED);
    // the server is still asked once in the background
    expect(getActiveSoundSet).toHaveBeenCalledTimes(1);
  });

  test('without an audio context nothing is prepared', async () => {
    await expect(preload.prepareClickBuffers({ audioCtx: null, ...makeRefs() })).resolves.toBe(false);
  });
});

describe('preloadClickSounds', () => {
  test('starts loading the bundled clicks and the active sound set', async () => {
    preferredLoad.resolve(PREFERRED);
    await expect(preload.preloadClickSounds()).resolves.toBe(PREFERRED);
    expect(initAudioContext).toHaveBeenCalled();
    expect(loadClickSet).toHaveBeenCalledWith({ audioCtx: ctx, ignorePreferences: true });
    expect(loadClickSet).toHaveBeenCalledWith({ audioCtx: ctx, soundSet: ACTIVE });
  });

  test('a later start finds the preloaded set without loading again', async () => {
    preferredLoad.resolve(PREFERRED);
    await preload.preloadClickSounds(ctx);
    const bundledLoads = loadClickSet.mock.calls.filter(([args]) => args.ignorePreferences).length;
    await preload.prepareClickBuffers({ audioCtx: ctx, ...makeRefs() });
    expect(loadClickSet.mock.calls.filter(([args]) => args.ignorePreferences)).toHaveLength(bundledLoads);
  });

  test('does nothing without an audio context', async () => {
    initAudioContext.mockReturnValue(null);
    await expect(preload.preloadClickSounds()).resolves.toBeNull();
    expect(loadClickSet).not.toHaveBeenCalled();
  });
});

describe('reloadClickBuffers', () => {
  test('waits for the active sound set without a time limit', async () => {
    const result = preload.reloadClickBuffers({ audioCtx: ctx, ...makeRefs() });
    jest.advanceTimersByTime(5000);
    await flushPromises();
    expect(applyClickSet).not.toHaveBeenCalled();
    preferredLoad.resolve(PREFERRED);
    await expect(result).resolves.toBe(true);
    expect(appliedSet()).toBe(PREFERRED);
  });

  test('falls back to the bundled clicks when the active set fails', async () => {
    preferredLoad.reject(new Error('offline'));
    await expect(preload.reloadClickBuffers({ audioCtx: ctx, ...makeRefs() })).resolves.toBe(true);
    expect(appliedSet()).toBe(BUNDLED);
  });
});
