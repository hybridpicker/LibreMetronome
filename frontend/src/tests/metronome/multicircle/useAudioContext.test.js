import { renderHook, act } from '@testing-library/react';
import { useAudioContext } from '../../../components/metronome/MultiCircleMode/hooks/useAudioContext';
import { initAudioContext, loadClickBuffers } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { createFakeAudioContext } from '../../helpers/multicircle-audio';

jest.mock('../../../hooks/useMetronomeLogic/audioBuffers', () => ({
  initAudioContext: jest.fn(),
  loadClickBuffers: jest.fn()
}));
jest.mock('../../../services/soundSetService', () => ({ getActiveSoundSet: jest.fn() }));

const refs = () => ({
  audioCtxRef: { current: null },
  normalBufferRef: { current: null },
  accentBufferRef: { current: null },
  firstBufferRef: { current: null }
});
const fill = (r, value = { name: 'b' }) => {
  r.normalBufferRef.current = value;
  r.accentBufferRef.current = value;
  r.firstBufferRef.current = value;
};
const mount = r => renderHook(() => useAudioContext(r.audioCtxRef, r.normalBufferRef, r.accentBufferRef, r.firstBufferRef)).result;
const api = r => mount(r).current;
const PATHS = ['/assets/audio/click_new.wav', '/assets/audio/click_new_accent.wav', '/assets/audio/click_new_first.wav'];

beforeEach(() => {
  ['log', 'warn', 'error'].forEach(k => jest.spyOn(console, k).mockImplementation(() => {}));
  delete window._multiCircleAudioContext;
  initAudioContext.mockReset();
  loadClickBuffers.mockReset().mockImplementation(async o => { fill(o, { name: o.soundSet ? 'set' : 'default' }); return true; });
  getActiveSoundSet.mockReset().mockResolvedValue({ id: 'active' });
  global.fetch = jest.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
});
afterEach(() => {
  jest.restoreAllMocks();
  delete window._multiCircleAudioContext;
  delete global.fetch;
});

describe('safelyInitAudioContext', () => {
  test('creates a context, publishes it as the shared one and loads the active sound set', async () => {
    const ctx = createFakeAudioContext();
    initAudioContext.mockReturnValue(ctx);
    const r = refs();
    const result = mount(r);
    let returned;
    await act(async () => { returned = await result.current.safelyInitAudioContext(); });
    expect(returned).toBe(ctx);
    expect(r.audioCtxRef.current).toBe(ctx);
    expect(window._multiCircleAudioContext).toBe(ctx);
    expect(loadClickBuffers).toHaveBeenCalledTimes(1);
    expect(loadClickBuffers).toHaveBeenCalledWith(expect.objectContaining({ audioCtx: ctx, soundSet: { id: 'active' } }));
    expect(r.normalBufferRef.current).toEqual({ name: 'set' });
  });

  test('resumes a freshly created suspended context', async () => {
    const ctx = createFakeAudioContext({ state: 'suspended' });
    initAudioContext.mockReturnValue(ctx);
    const result = mount(refs());
    await act(async () => { await result.current.safelyInitAudioContext(); });
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(ctx.state).toBe('running');
  });

  test('still returns the context when resuming a new context fails', async () => {
    const ctx = createFakeAudioContext({ state: 'suspended', resumeImpl: async () => { throw new Error('no gesture'); } });
    initAudioContext.mockReturnValue(ctx);
    const result = mount(refs());
    let returned;
    await act(async () => { returned = await result.current.safelyInitAudioContext(); });
    expect(returned).toBe(ctx);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Could not resume new audio context'), expect.any(Error));
  });

  test('prefers the shared context over creating a new one and resumes it when suspended', async () => {
    const shared = createFakeAudioContext({ state: 'suspended' });
    window._multiCircleAudioContext = shared;
    const r = refs();
    const result = mount(r);
    await act(async () => { await result.current.safelyInitAudioContext(); });
    expect(initAudioContext).not.toHaveBeenCalled();
    expect(r.audioCtxRef.current).toBe(shared);
    expect(shared.resume).toHaveBeenCalledTimes(1);
  });

  test('a failing resume of the shared context is tolerated', async () => {
    const shared = createFakeAudioContext({ state: 'suspended', resumeImpl: async () => { throw new Error('x'); } });
    window._multiCircleAudioContext = shared;
    const result = mount(refs());
    let returned;
    await act(async () => { returned = await result.current.safelyInitAudioContext(); });
    expect(returned).toBe(shared);
  });

  test('ignores a closed shared context and creates a new one', async () => {
    window._multiCircleAudioContext = createFakeAudioContext({ state: 'closed' });
    const fresh = createFakeAudioContext();
    initAudioContext.mockReturnValue(fresh);
    const result = mount(refs());
    await act(async () => { await result.current.safelyInitAudioContext(); });
    expect(initAudioContext).toHaveBeenCalledTimes(1);
    expect(window._multiCircleAudioContext).toBe(fresh);
  });

  test('reuses the context already in the ref (resuming it if suspended) when there is no shared one', async () => {
    const own = createFakeAudioContext({ state: 'suspended' });
    const r = refs();
    r.audioCtxRef.current = own;
    const result = mount(r);
    await act(async () => { await result.current.safelyInitAudioContext(); });
    expect(initAudioContext).not.toHaveBeenCalled();
    expect(own.resume).toHaveBeenCalledTimes(1);
  });

  test('a running own context is used as is, and a failing resume of a suspended own context is tolerated', async () => {
    const running = createFakeAudioContext();
    const r1 = refs();
    r1.audioCtxRef.current = running;
    const audio1 = api(r1);
    await act(async () => { await audio1.safelyInitAudioContext(); });
    expect(running.resume).not.toHaveBeenCalled();

    const broken = createFakeAudioContext({ state: 'suspended', resumeImpl: async () => { throw new Error('x'); } });
    const r2 = refs();
    r2.audioCtxRef.current = broken;
    let returned;
    const audio2 = api(r2);
    await act(async () => { returned = await audio2.safelyInitAudioContext(); });
    expect(returned).toBe(broken);
  });

  test('returns null when no context can be created (null)', async () => {
    initAudioContext.mockReturnValue(null);
    const result = mount(refs());
    let returned;
    await act(async () => { returned = await result.current.safelyInitAudioContext(); });
    expect(returned).toBeNull();
    expect(console.error).toHaveBeenCalledWith('[MultiCircle] Fatal error initializing audio:', expect.any(Error));
  });

  test('returns null when creating the context throws', async () => {
    initAudioContext.mockImplementation(() => { throw new Error('unsupported'); });
    const result = mount(refs());
    let returned;
    await act(async () => { returned = await result.current.safelyInitAudioContext(); });
    expect(returned).toBeNull();
  });

  test('falls back to default sounds when the sound set cannot be loaded', async () => {
    initAudioContext.mockReturnValue(createFakeAudioContext());
    getActiveSoundSet.mockRejectedValue(new Error('api down'));
    const r = refs();
    const audio3 = api(r);
    await act(async () => { await audio3.safelyInitAudioContext(); });
    expect(loadClickBuffers).toHaveBeenCalledTimes(1);
    expect(loadClickBuffers.mock.calls[0][0].soundSet).toBeUndefined();
    expect(r.normalBufferRef.current).toEqual({ name: 'default' });
  });

  test('falls back to default sounds when loading with the sound set reports failure', async () => {
    initAudioContext.mockReturnValue(createFakeAudioContext());
    loadClickBuffers.mockResolvedValueOnce(false);
    const r = refs();
    const audio4 = api(r);
    await act(async () => { await audio4.safelyInitAudioContext(); });
    expect(loadClickBuffers).toHaveBeenCalledTimes(2);
    expect(loadClickBuffers.mock.calls[1][0].soundSet).toBeUndefined();
  });

  test('decodes the hardcoded click files directly when the loader leaves buffers empty', async () => {
    const ctx = createFakeAudioContext();
    ctx.decodeAudioData.mockImplementation(async () => ({ name: 'direct' }));
    initAudioContext.mockReturnValue(ctx);
    loadClickBuffers.mockResolvedValue(false);
    const r = refs();
    r.accentBufferRef.current = { name: 'keep' }; // already present, must not be reloaded
    const audio5 = api(r);
    await act(async () => { await audio5.safelyInitAudioContext(); });
    expect(global.fetch.mock.calls.map(c => c[0])).toEqual([PATHS[0], PATHS[2]]);
    expect(r.normalBufferRef.current).toEqual({ name: 'direct' });
    expect(r.accentBufferRef.current).toEqual({ name: 'keep' });
    expect(r.firstBufferRef.current).toEqual({ name: 'direct' });
  });

  test('a failing direct download leaves that buffer null without throwing', async () => {
    initAudioContext.mockReturnValue(createFakeAudioContext());
    loadClickBuffers.mockResolvedValue(false);
    global.fetch = jest.fn(async () => { throw new Error('404'); });
    const r = refs();
    let returned;
    const audio6 = api(r);
    await act(async () => { returned = await audio6.safelyInitAudioContext(); });
    expect(returned).toBe(r.audioCtxRef.current);
    expect(r.normalBufferRef.current).toBeNull();
    expect(r.firstBufferRef.current).toBeNull();
  });

  test('returns null when the default loader itself throws', async () => {
    initAudioContext.mockReturnValue(createFakeAudioContext());
    getActiveSoundSet.mockRejectedValue(new Error('x'));
    loadClickBuffers.mockRejectedValue(new Error('decode'));
    let returned;
    const audio7 = api(refs());
    await act(async () => { returned = await audio7.safelyInitAudioContext(); });
    expect(returned).toBeNull();
    expect(console.error).toHaveBeenCalledWith('[MultiCircle] Error loading sound buffers:', expect.any(Error));
  });
});

describe('isAudioReady', () => {
  test.each([
    ['no context', r => { r.audioCtxRef.current = null; }, false],
    ['suspended context', r => { r.audioCtxRef.current = { state: 'suspended' }; fill(r); }, false],
    ['missing normal buffer', r => { r.audioCtxRef.current = { state: 'running' }; fill(r); r.normalBufferRef.current = null; }, false],
    ['missing accent buffer', r => { r.audioCtxRef.current = { state: 'running' }; fill(r); r.accentBufferRef.current = null; }, false],
    ['missing first buffer', r => { r.audioCtxRef.current = { state: 'running' }; fill(r); r.firstBufferRef.current = null; }, false],
    ['everything present', r => { r.audioCtxRef.current = { state: 'running' }; fill(r); }, true]
  ])('%s', (_name, setup, expected) => {
    const r = refs();
    setup(r);
    expect(Boolean(mount(r).current.isAudioReady())).toBe(expected);
  });
});

describe('reloadSounds', () => {
  test('creates a context when there is none and publishes it', async () => {
    const ctx = createFakeAudioContext();
    initAudioContext.mockReturnValue(ctx);
    const r = refs();
    let ok;
    const audio8 = api(r);
    await act(async () => { ok = await audio8.reloadSounds(); });
    expect(ok).toBe(true);
    expect(r.audioCtxRef.current).toBe(ctx);
    expect(window._multiCircleAudioContext).toBe(ctx);
  });

  test('replaces a closed context', async () => {
    const fresh = createFakeAudioContext();
    initAudioContext.mockReturnValue(fresh);
    const r = refs();
    r.audioCtxRef.current = createFakeAudioContext({ state: 'closed' });
    const audio9 = api(r);
    await act(async () => { await audio9.reloadSounds(); });
    expect(r.audioCtxRef.current).toBe(fresh);
  });

  test('returns false when no context can be created, or creation throws', async () => {
    initAudioContext.mockReturnValue(null);
    let ok;
    const audio10 = api(refs());
    await act(async () => { ok = await audio10.reloadSounds(); });
    expect(ok).toBe(false);

    initAudioContext.mockImplementation(() => { throw new Error('x'); });
    const audio11 = api(refs());
    await act(async () => { ok = await audio11.reloadSounds(); });
    expect(ok).toBe(false);
  });

  test('resumes a suspended context first and tolerates a failing resume', async () => {
    const ok1 = createFakeAudioContext({ state: 'suspended' });
    const r1 = refs();
    r1.audioCtxRef.current = ok1;
    const audio12 = api(r1);
    await act(async () => { await audio12.reloadSounds(); });
    expect(ok1.resume).toHaveBeenCalledTimes(1);

    const bad = createFakeAudioContext({ state: 'suspended', resumeImpl: async () => { throw new Error('x'); } });
    const r2 = refs();
    r2.audioCtxRef.current = bad;
    let ok;
    const audio13 = api(r2);
    await act(async () => { ok = await audio13.reloadSounds(); });
    expect(ok).toBe(true);
  });

  test('uses default sounds when the sound-set lookup rejects', async () => {
    const ctx = createFakeAudioContext();
    const r = refs();
    r.audioCtxRef.current = ctx;
    getActiveSoundSet.mockRejectedValue(new Error('api'));
    const audio14 = api(r);
    await act(async () => { await audio14.reloadSounds(); });
    expect(loadClickBuffers).toHaveBeenCalledTimes(1);
    expect(loadClickBuffers.mock.calls[0][0].soundSet).toBeUndefined();
  });

  test('falls back to defaults when the sound set loader returns false', async () => {
    const r = refs();
    r.audioCtxRef.current = createFakeAudioContext();
    loadClickBuffers.mockResolvedValueOnce(false);
    let ok;
    const audio15 = api(r);
    await act(async () => { ok = await audio15.reloadSounds(); });
    expect(ok).toBe(true);
    expect(loadClickBuffers).toHaveBeenCalledTimes(2);
  });

  test('tolerates the default loader failing and reports false when direct download also fails', async () => {
    const r = refs();
    r.audioCtxRef.current = createFakeAudioContext();
    loadClickBuffers.mockRejectedValue(new Error('decode'));
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 }));
    let ok;
    const audio16 = api(r);
    await act(async () => { ok = await audio16.reloadSounds(); });
    expect(ok).toBeFalsy();
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(r.normalBufferRef.current).toBeNull();
  });

  test('direct download fills only the missing buffers and reports success', async () => {
    const ctx = createFakeAudioContext();
    ctx.decodeAudioData.mockImplementation(async () => ({ name: 'direct' }));
    const r = refs();
    r.audioCtxRef.current = ctx;
    loadClickBuffers.mockImplementation(async o => { o.normalBufferRef.current = { name: 'n' }; return false; });
    let ok;
    const audio17 = api(r);
    await act(async () => { ok = await audio17.reloadSounds(); });
    expect(ok).toBeTruthy();
    expect(global.fetch.mock.calls.map(c => c[0])).toEqual([PATHS[1], PATHS[2]]);
    expect(r.normalBufferRef.current).toEqual({ name: 'n' });
    expect(r.accentBufferRef.current).toEqual({ name: 'direct' });
  });

  test('does not try direct download when the loader succeeded and all buffers are present', async () => {
    const r = refs();
    r.audioCtxRef.current = createFakeAudioContext();
    const audio18 = api(r);
    await act(async () => { await audio18.reloadSounds(); });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
