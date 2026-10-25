import { act, cleanup, renderHook } from '@testing-library/react';
import usePolyrhythmLogic from '../../../components/metronome/PolyrhythmMode/usePolyrhythmLogic';
import { initAudioContext, loadClickBuffers, resumeAudioContext } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { createFakeContext, startedHits, BUFFERS, loadBuffersInto } from '../../helpers/polyrhythm-audio';
import {
  advance, mountPolyrhythm, hitTimes, silenceConsole, clearGlobals, setupAudioMocks
} from '../../helpers/polyrhythm-harness';

jest.mock('../../../hooks/useMetronomeLogic/audioBuffers');
jest.mock('../../../services/soundSetService', () => ({ getActiveSoundSet: jest.fn(async () => null) }));

// The isPaused effect debounces by 10 ms, then the grid starts 0.2 s after the audio clock.
const T0 = 0.21;

const close = (actual, expected) => {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((t, i) => expect(actual[i]).toBeCloseTo(t, 5));
};

describe('usePolyrhythmLogic scheduling timeline', () => {
  let spies;
  beforeEach(() => {
    jest.useFakeTimers();
    spies = silenceConsole();
    getActiveSoundSet.mockImplementation(async () => null);
  });
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    spies.forEach(s => s.mockRestore());
    jest.clearAllMocks();
    clearGlobals();
  });

  test('does not schedule anything while paused', async () => {
    const { ctx } = mountPolyrhythm({ isPaused: true });
    await advance(ctx, 2000);
    expect(ctx.sources).toHaveLength(0);
  });

  test('3 against 4 at 120 BPM: exact timeline over two measures', async () => {
    const { ctx } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 3000);

    // measure = 3 inner beats * 0.5 s = 1.5 s, first downbeat 0.2 s after start
    const hits = startedHits(ctx);
    const inner = hits.filter(h => h.detune === 300 || (h.buffer === 'first' && h.detune === 0));
    const outer = hits.filter(h => h.detune === -100);

    // inner: 3 per measure, 0.5 s apart; second measure begins 1.5 s later
    close(inner.map(h => h.time).sort((a, b) => a - b), [0, 0.5, 1, 1.5, 2, 2.5].map(t => T0 + t));
    // outer: 4 per measure, 0.375 s apart (first beat is an accent => -100)
    close(outer.map(h => h.time).sort((a, b) => a - b), [0, 0.375, 0.75, 1.125, 1.5, 1.875, 2.25, 2.625].map(t => T0 + t));
    expect(hits).toHaveLength(14);
  });

  test('unified first beat: both circles start at the identical timestamp each measure', async () => {
    const { ctx } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 1700);
    const atDownbeat = startedHits(ctx).filter(h => Math.abs(h.time - T0) < 1e-9);
    expect(atDownbeat).toHaveLength(2);
    // inner uses the "first" sample (no detune), outer's accent value 2 uses the accent sample at -100
    expect(atDownbeat.map(h => h.buffer).sort()).toEqual(['accent', 'first']);
    expect(atDownbeat.map(h => h.detune).sort((a, b) => a - b)).toEqual([-100, 0]);
    expect(atDownbeat[0].time).toBe(atDownbeat[1].time);
  });

  test('buffer and pitch selection follow the accent pattern', async () => {
    const { ctx } = mountPolyrhythm({
      isPaused: false,
      innerBeats: 4,
      outerBeats: 2,
      innerAccents: [3, 0, 2, 1],
      outerAccents: [1]
    });
    await advance(ctx, 1500);
    const hits = startedHits(ctx);
    // inner measure is 4 * 0.5 = 2 s. Beat 1 is muted (0) and must produce no source.
    const byTime = t => hits.filter(h => Math.abs(h.time - (T0 + t)) < 1e-6);
    expect(byTime(0).map(h => h.buffer).sort()).toEqual(['first', 'normal']);
    expect(byTime(0.5)).toHaveLength(0); // inner beat 1 muted; outer has only beats at 0 and 1
    expect(byTime(1).map(h => [h.buffer, h.detune]).sort()).toEqual([
      ['accent', 300],
      ['normal', -100]
    ]);
    expect(byTime(1.5).map(h => [h.buffer, h.detune])).toEqual([['normal', 300]]);
    // the outer circle's pattern is shorter than its beat count -> default accent value 1 is not used here,
    // normal outer beat 0 carries the lower pitch
    expect(byTime(0).find(h => h.buffer === 'normal').detune).toBe(-100);
    // the first-beat sample is never detuned
    expect(byTime(0).find(h => h.buffer === 'first').detune).toBe(0);
  });

  test('missing accent entries default to a normal beat; null accents are all normal', async () => {
    const { ctx } = mountPolyrhythm({
      isPaused: false, innerBeats: 2, outerBeats: 2, innerAccents: [3], outerAccents: null
    });
    await advance(ctx, 600);
    const hits = startedHits(ctx);
    // measure = 2 * 0.5 = 1 s -> beat 1 of both circles 0.5 s after the downbeat
    const second = hits.filter(h => Math.abs(h.time - (T0 + 0.5)) < 1e-6);
    expect(second.map(h => [h.buffer, h.detune]).sort()).toEqual([
      ['normal', -100],
      ['normal', 300]
    ]);
  });

  test('a non-array accents value schedules nothing for that circle', async () => {
    const { ctx } = mountPolyrhythm({
      isPaused: false, innerBeats: 2, outerBeats: 2, innerAccents: 'abc', outerAccents: [1, 1]
    });
    await advance(ctx, 600);
    const detunes = startedHits(ctx).map(h => h.detune);
    expect(detunes).toEqual([-100, -100]);
    expect(spies[1]).toHaveBeenCalledWith('No valid accents array for inner circle.');
  });

  test('gain is set to the current volume at the hit time', async () => {
    const { ctx, rerenderWith } = mountPolyrhythm({ isPaused: false, volume: 0.25 });
    await advance(ctx, 200);
    const first = ctx.sources[0].gainNode;
    expect(first.gain.setValueAtTime).toHaveBeenCalledTimes(1);
    expect(first.gain.setValueAtTime.mock.calls[0][0]).toBe(0.25);
    expect(first.gain.setValueAtTime.mock.calls[0][1]).toBeCloseTo(T0, 9);
    expect(first.connect).toHaveBeenCalledWith(ctx.destination);
    rerenderWith({ volume: 0.9 });
    await advance(ctx, 1700);
    const later = ctx.sources.find(s => s.startedAt > T0 + 1.5 - 1e-6);
    expect(later.gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.9, later.startedAt);
  });

  test('beats that are already in the past are skipped, the downbeat is nudged forward', async () => {
    const { ctx } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 10); // scheduler started: startTime T0, nothing scheduled yet
    expect(ctx.sources).toHaveLength(0);
    ctx.currentTime = 1.0; // simulate a starved main thread
    await advance(ctx, 20); // loop tick at audio time 1.02
    const times = hitTimes(ctx).sort((a, b) => a - b);
    // downbeats of both circles nudged to now + 2 ms; inner T0+0.5 and outer T0+0.375/0.75 are late;
    // inner T0+1.0 (1.21) and outer T0+1.125 (1.335) are still ahead
    expect(times).toHaveLength(4);
    expect(times[0]).toBeCloseTo(1.022, 6);
    expect(times[1]).toBeCloseTo(1.022, 6);
    expect(times[2]).toBeCloseTo(T0 + 1, 6);
    expect(times[3]).toBeCloseTo(T0 + 1.125, 6);
    expect(spies[1]).toHaveBeenCalledWith('Had to adjust first beat time - was in the past');
  });

  test('8:9 and 9:8 use the inner beat count for the measure duration', async () => {
    const { ctx } = mountPolyrhythm({
      isPaused: false, innerBeats: 8, outerBeats: 9, innerAccents: [3, 1, 1, 1, 1, 1, 1, 1], outerAccents: [2, 1, 1, 1, 1, 1, 1, 1, 1]
    });
    await advance(ctx, 600);
    const outer = startedHits(ctx).filter(h => h.detune === -100).map(h => h.time).sort((a, b) => a - b);
    // measure = 8 * 0.5 = 4 s, 9 outer beats -> spacing 4/9
    expect(outer[1] - outer[0]).toBeCloseTo(4 / 9, 6);
    const inner = startedHits(ctx).filter(h => h.detune === 300).map(h => h.time).sort((a, b) => a - b);
    expect(inner[1] - inner[0]).toBeCloseTo(0.5, 6);
  });

  test('9:8 follows the same rule', async () => {
    const { ctx } = mountPolyrhythm({
      isPaused: false, innerBeats: 9, outerBeats: 8, innerAccents: [3, 1, 1, 1, 1, 1, 1, 1, 1], outerAccents: [2, 1, 1, 1, 1, 1, 1, 1]
    });
    await advance(ctx, 600);
    const outer = startedHits(ctx).filter(h => h.detune === -100).map(h => h.time).sort((a, b) => a - b);
    expect(outer[1] - outer[0]).toBeCloseTo(4.5 / 8, 6);
  });

  test('a source that errors on start is not tracked and does not break scheduling', async () => {
    const ctx = createFakeContext();
    const original = ctx.createBufferSource;
    ctx.createBufferSource = jest.fn(() => {
      const source = original();
      source.start = jest.fn(() => { throw new Error('boom'); });
      return source;
    });
    mountPolyrhythm({ isPaused: false }, ctx);
    await advance(ctx, 300);
    expect(ctx.sources.length).toBeGreaterThan(0);
    expect(spies[2]).toHaveBeenCalledWith(expect.stringContaining('Error starting audio at time'), expect.any(Error));
  });

  test('onended disconnects the nodes and forgets them, so a later stop leaves them alone', async () => {
    const { ctx, rerenderWith } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 200);
    const [ended, alive] = ctx.sources;
    ended.onended();
    expect(ended.disconnect).toHaveBeenCalled();
    expect(ended.gainNode.disconnect).toHaveBeenCalled();
    rerenderWith({ isPaused: true });
    await advance(ctx, 100);
    expect(ended.stop).not.toHaveBeenCalled();
    expect(alive.stop).toHaveBeenCalledTimes(1);
  });

  test('onended swallows disconnect errors', async () => {
    const { ctx } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 200);
    const [source] = ctx.sources;
    source.disconnect.mockImplementation(() => { throw new Error('gone'); });
    expect(() => source.onended()).not.toThrow();
  });

  test('without buffers nothing is played and the error is logged', async () => {
    const ctx = createFakeContext();
    const { result } = mountPolyrhythm({ isPaused: false }, ctx, { loader: async () => true });
    await advance(ctx, 400);
    expect(ctx.sources).toHaveLength(0);
    expect(spies[2]).toHaveBeenCalledWith('No buffer available for this accentValue:', expect.any(Number));
    expect(result.current.audioCtx).toBe(ctx);
  });
});

describe('usePolyrhythmLogic lifecycle', () => {
  let spies;
  beforeEach(() => {
    jest.useFakeTimers();
    spies = silenceConsole();
    getActiveSoundSet.mockImplementation(async () => null);
  });
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    spies.forEach(s => s.mockRestore());
    jest.clearAllMocks();
    clearGlobals();
  });

  test('pause stops the lookahead loop and fades out live sources; resume restarts on a new grid', async () => {
    const { ctx, rerenderWith } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 1000);
    const countAtPause = ctx.sources.length;
    expect(countAtPause).toBeGreaterThan(0);
    rerenderWith({ isPaused: true });
    await advance(ctx, 200);
    // fade-out ramp on the live gain nodes and delayed stop of the sources
    const live = ctx.sources[ctx.sources.length - 1];
    expect(live.gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(live.stop).toHaveBeenCalledTimes(1);
    const countAfterPause = ctx.sources.length;
    await advance(ctx, 2000);
    expect(ctx.sources).toHaveLength(countAfterPause);

    const resumeAt = ctx.currentTime;
    rerenderWith({ isPaused: false });
    await advance(ctx, 400);
    const firstAfterResume = ctx.sources[countAfterPause];
    // restart: 10 ms debounce, then startTime = currentTime + 0.2 s
    expect(firstAfterResume.startedAt).toBeGreaterThan(resumeAt + 0.2);
    expect(firstAfterResume.startedAt).toBeLessThan(resumeAt + 0.25);
    expect(firstAfterResume.buffer).toBe(BUFFERS.first);
  });

  test('tempo change while playing restarts the grid with the new beat length', async () => {
    const { ctx, rerenderWith } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 500);
    rerenderWith({ tempo: 60 });
    // 100 ms debounce + stop + 50 ms restart delay
    await advance(ctx, 160);
    const before = ctx.sources.length;
    await advance(ctx, 2500);
    const fresh = startedHits(ctx).slice(before);
    const inner = fresh.filter(h => h.detune === 300).map(h => h.time);
    // measure is now 3 * 1 s = 3 s, inner beats 1 s apart
    expect(inner[1] - inner[0]).toBeCloseTo(1, 6);
    expect(window.currentTempo).toBe(60);
  });

  test('rapid tempo changes are debounced into a single restart', async () => {
    const { ctx, rerenderWith } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 500);
    initAudioContext.mockClear();
    rerenderWith({ tempo: 130 });
    await advance(ctx, 50);
    rerenderWith({ tempo: 140 });
    await advance(ctx, 400);
    // exactly one restart (startScheduler calls initAudioContext once per start)
    expect(initAudioContext).toHaveBeenCalledTimes(1);
  });

  test('changing the beat counts while playing restarts with the new ratio', async () => {
    const { ctx, rerenderWith } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 500);
    const before = ctx.sources.length;
    rerenderWith({ innerBeats: 2, outerBeats: 3, innerAccents: [3, 1], outerAccents: [2, 1, 1] });
    await advance(ctx, 200);
    await advance(ctx, 1200);
    const fresh = startedHits(ctx).slice(before);
    // new measure = 2 * 0.5 = 1 s; outer has 3 beats -> spacing 1/3
    const outer = fresh.filter(h => h.detune === -100).map(h => h.time);
    expect(outer[1] - outer[0]).toBeCloseTo(1 / 3, 6);
    expect(window.currentInnerBeats).toBe(2);
  });

  test('swapping sounds while playing restarts the scheduler', async () => {
    const { ctx, rerenderWith } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 500);
    initAudioContext.mockClear();
    rerenderWith({ soundsSwapped: true });
    await advance(ctx, 300);
    expect(initAudioContext).toHaveBeenCalledTimes(1);
  });

  test('unmount stops the loop, clears every timer owned by the hook and leaves the context alone', async () => {
    const { ctx, unmount } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 1000);
    unmount();
    // live nodes get their delayed stop(), then nothing is left in the timer queue
    jest.advanceTimersByTime(5000);
    expect(jest.getTimerCount()).toBe(0);
    const count = ctx.sources.length;
    await advance(ctx, 3000);
    expect(ctx.sources).toHaveLength(count);
    expect(ctx.sources.every(s => s.stop.mock.calls.length <= 2)).toBe(true);
  });

  test('unmount while paused leaves no timers', async () => {
    const { ctx, unmount } = mountPolyrhythm({ isPaused: true });
    await advance(ctx, 50);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('a suspended context is resumed before the first beat is scheduled', async () => {
    const ctx = createFakeContext({ state: 'suspended' });
    mountPolyrhythm({ isPaused: false }, ctx);
    await advance(ctx, 400);
    expect(resumeAudioContext).toHaveBeenCalledWith(ctx);
    expect(ctx.state).toBe('running');
    expect(ctx.sources.length).toBeGreaterThan(0);
  });

  test('if the context cannot be resumed nothing is scheduled', async () => {
    const ctx = createFakeContext({ state: 'suspended' });
    setupAudioMocks(ctx);
    resumeAudioContext.mockResolvedValue(false);
    const { result } = mountPolyrhythm({ isPaused: false }, ctx);
    resumeAudioContext.mockResolvedValue(false);
    await advance(ctx, 600);
    expect(ctx.sources).toHaveLength(0);
    // the start lock was kept (characterization: current behaviour, see report)
    await act(async () => { await result.current.startScheduler(); });
    expect(ctx.sources).toHaveLength(0);
  });

  test('without any AudioContext start is a no-op', async () => {
    const ctx = createFakeContext();
    const { result } = mountPolyrhythm({ isPaused: true }, ctx);
    initAudioContext.mockReturnValue(null);
    await act(async () => { await result.current.startScheduler(); });
    expect(resumeAudioContext).not.toHaveBeenCalled();
    initAudioContext.mockReturnValue(ctx);
    // lock released: a later start works
    await act(async () => { await result.current.startScheduler(); });
    expect(resumeAudioContext).toHaveBeenCalledTimes(1);
  });

  test('a start that finishes loading after the user paused does not begin playing', async () => {
    const ctx = createFakeContext();
    let finishResume;
    const { rerenderWith } = mountPolyrhythm({ isPaused: true }, ctx);
    resumeAudioContext.mockImplementation(() => new Promise(resolve => { finishResume = resolve; }));
    rerenderWith({ isPaused: false });
    await advance(ctx, 20);
    rerenderWith({ isPaused: true });
    await act(async () => { finishResume(true); });
    await advance(ctx, 500);
    expect(ctx.sources).toHaveLength(0);
  });

  test('calling startScheduler while running is ignored', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 300);
    initAudioContext.mockClear();
    await act(async () => { await result.current.startScheduler(); });
    expect(initAudioContext).not.toHaveBeenCalled();
    await advance(ctx, 300);
    // each downbeat exists exactly once per circle
    expect(startedHits(ctx).filter(h => Math.abs(h.time - T0) < 1e-9)).toHaveLength(2);
  });

  test('startScheduler does nothing while the parent still reports paused', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: true });
    await act(async () => { await result.current.startScheduler(); });
    await advance(ctx, 500);
    expect(ctx.sources).toHaveLength(0);
  });

  test('stopScheduler without a running scheduler does nothing', async () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    const events = [];
    const listener = e => events.push(e);
    window.addEventListener('training-measure-update', listener);
    events.length = 0;
    act(() => result.current.stopScheduler());
    window.removeEventListener('training-measure-update', listener);
    expect(events).toHaveLength(0);
  });

  test('stop swallows errors from nodes that are already torn down', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 200);
    ctx.sources[0].gainNode.gain.setValueAtTime.mockImplementation(() => { throw new Error('x'); });
    ctx.sources[1].stop.mockImplementation(() => { throw new Error('y'); });
    expect(() => act(() => result.current.stopScheduler())).not.toThrow();
    expect(() => jest.advanceTimersByTime(100)).not.toThrow();
  });

  test('stop schedules a delayed stop() for live sources exactly once', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 200);
    const live = ctx.sources[0];
    act(() => result.current.stopScheduler());
    expect(live.stop).not.toHaveBeenCalled();
    jest.advanceTimersByTime(34);
    expect(live.stop).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(live.stop).toHaveBeenCalledTimes(1);
    expect(live.disconnect).toHaveBeenCalled();
  });

  test('mount loads buffers with the active sound set; failure falls back to the defaults', async () => {
    getActiveSoundSet.mockResolvedValue({ id: 'set-a' });
    mountPolyrhythm({ isPaused: true });
    await advance(createFakeContext(), 5);
    expect(loadClickBuffers.mock.calls[0][0].soundSet).toEqual({ id: 'set-a' });
  });

  test('mount falls back to the default sounds when the sound set cannot be read', async () => {
    getActiveSoundSet.mockRejectedValue(new Error('db'));
    const { ctx } = mountPolyrhythm({ isPaused: true });
    await advance(ctx, 5);
    expect(loadClickBuffers).toHaveBeenCalledTimes(1);
    expect(loadClickBuffers.mock.calls[0][0]).not.toHaveProperty('soundSet');
  });

  test('start loads missing buffers with the sound set', async () => {
    const ctx = createFakeContext();
    const { rerenderWith } = mountPolyrhythm({ isPaused: true }, ctx, { loader: async () => true });
    await advance(ctx, 5);
    expect(loadClickBuffers).toHaveBeenCalledTimes(1); // mount load left the refs empty
    getActiveSoundSet.mockResolvedValue({ id: 's' });
    loadClickBuffers.mockImplementation(refs => loadBuffersInto(refs));
    rerenderWith({ isPaused: false });
    await advance(ctx, 400);
    expect(loadClickBuffers.mock.calls[1][0].soundSet).toEqual({ id: 's' });
    expect(ctx.sources.length).toBeGreaterThan(0);
  });

  test('start falls back to default buffers when the sound set load throws', async () => {
    const ctx = createFakeContext();
    const { rerenderWith } = mountPolyrhythm({ isPaused: true }, ctx, { loader: async () => true });
    await advance(ctx, 5);
    let call = 0;
    loadClickBuffers.mockImplementation(async refs => {
      call += 1;
      if (call === 1) throw new Error('bad set');
      return loadBuffersInto(refs);
    });
    rerenderWith({ isPaused: false });
    await advance(ctx, 400);
    expect(call).toBe(2);
    expect(loadClickBuffers.mock.calls[1][0]).toHaveProperty('soundSet', null);
    expect(loadClickBuffers.mock.calls[2][0]).not.toHaveProperty('soundSet');
    expect(ctx.sources.length).toBeGreaterThan(0);
  });

  test('an unexpected error while starting is logged and releases the start lock', async () => {
    const ctx = createFakeContext();
    const { result } = mountPolyrhythm({ isPaused: true }, ctx);
    resumeAudioContext.mockRejectedValueOnce(new Error('denied'));
    await act(async () => { await result.current.startScheduler(); });
    expect(spies[2]).toHaveBeenCalledWith('Error starting polyrhythm scheduler:', expect.any(Error));
    await act(async () => { await result.current.startScheduler(); });
    expect(resumeAudioContext).toHaveBeenCalledTimes(2);
  });

  test('an unknown accent value falls back to the normal click', async () => {
    const { ctx } = mountPolyrhythm({
      isPaused: false, innerBeats: 2, outerBeats: 2, innerAccents: [5, 1], outerAccents: [0, 0]
    });
    await advance(ctx, 300);
    const [hit] = startedHits(ctx);
    expect(hit.buffer).toBe('normal');
    expect(hit.detune).toBe(300);
  });

  test('onended after the scheduler was stopped is harmless', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 200);
    const [source] = ctx.sources;
    act(() => result.current.stopScheduler());
    expect(() => source.onended()).not.toThrow();
    expect(source.disconnect).toHaveBeenCalled();
  });

  test('stopping while the audio clock is still at 0 ramps from time 0', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 200);
    ctx.currentTime = 0;
    act(() => result.current.stopScheduler());
    const gain = ctx.sources[0].gainNode.gain;
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.03);
  });

  test('without an audio context at mount the pause effect never starts anything', async () => {
    const ctx = createFakeContext();
    setupAudioMocks(ctx);
    initAudioContext.mockReturnValue(null);
    renderHook(p => usePolyrhythmLogic(p), {
      initialProps: { tempo: 120, innerBeats: 3, outerBeats: 4, isPaused: false, volume: 0.5 }
    });
    await advance(ctx, 500);
    expect(ctx.sources).toHaveLength(0);
    expect(resumeAudioContext).not.toHaveBeenCalled();
  });

  test('pausing during the restart delay of a tempo change cancels the restart', async () => {
    const { ctx, rerenderWith } = mountPolyrhythm({ isPaused: false });
    await advance(ctx, 500);
    rerenderWith({ tempo: 90 });
    await advance(ctx, 110); // debounce elapsed, scheduler stopped, restart pending (50 ms)
    initAudioContext.mockClear();
    rerenderWith({ isPaused: true });
    await advance(ctx, 300);
    expect(initAudioContext).not.toHaveBeenCalled();
  });

  test('a zero beat count produces a zero-length measure without throwing', async () => {
    const { ctx } = mountPolyrhythm({ isPaused: false, innerBeats: 0, outerBeats: 3, innerAccents: [], outerAccents: [3, 1, 1] });
    await advance(ctx, 300);
    // only the unified downbeat exists; no division by zero reaches the audio graph
    const times = startedHits(ctx).map(h => h.time);
    times.forEach(t => expect(Number.isFinite(t)).toBe(true));
  });

  test('window globals are published for the beat indicator', () => {
    mountPolyrhythm({ tempo: 90, innerBeats: 5, isPaused: true });
    expect(window.currentTempo).toBe(90);
    expect(window.currentInnerBeats).toBe(5);
  });
});
