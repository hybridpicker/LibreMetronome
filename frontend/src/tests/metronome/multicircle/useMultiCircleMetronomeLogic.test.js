// Characterization of the Sequence Mode engine: useMultiCircleMetronomeLogic with the REAL
// scheduler, training logic and sound scheduling on top of a controllable fake AudioContext.
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import useMultiCircleMetronomeLogic from '../../../components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic';
import { initAudioContext, loadClickBuffers, resumeAudioContext } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { BUFFERS, createFakeAudioContext, levelOf, runClock } from '../../helpers/multicircle-audio';

jest.mock('../../../hooks/useMetronomeLogic/audioBuffers', () => ({
  initAudioContext: jest.fn(),
  loadClickBuffers: jest.fn(),
  resumeAudioContext: jest.fn()
}));
jest.mock('../../../services/soundSetService', () => ({ getActiveSoundSet: jest.fn() }));

let ctx;
const bar = (subdivisions, accents, beatMode = 'quarter') => ({
  subdivisions, beatMode, accents: accents || Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
});
const flush = () => act(async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); });
const times = starts => starts.map(s => Number(s.time.toFixed(6)));

function mount(initial = {}) {
  const props = {
    tempo: 120, setTempo: jest.fn(), isPaused: false, swing: 0, volume: 0.5,
    circleSettings: [bar(4), bar(3)], ...initial
  };
  const view = renderHook(p => useMultiCircleMetronomeLogic(p), { initialProps: props });
  return { ...view, props };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  delete window._multiCircleAudioContext;
  ctx = createFakeAudioContext();
  initAudioContext.mockReset().mockImplementation(() => ctx);
  loadClickBuffers.mockReset().mockImplementation(async ({ normalBufferRef, accentBufferRef, firstBufferRef }) => {
    normalBufferRef.current = BUFFERS.normal;
    accentBufferRef.current = BUFFERS.accent;
    firstBufferRef.current = BUFFERS.first;
    return true;
  });
  resumeAudioContext.mockReset().mockImplementation(async c => {
    if (!c) return false;
    if (c.state !== 'running') await c.resume();
    return c.state === 'running';
  });
  getActiveSoundSet.mockReset().mockResolvedValue({ id: 'set' });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete window._multiCircleAudioContext;
  delete window.isSilencePhaseRef;
});

describe('playback order and sounds', () => {
  test('plays complete bars in order with the right sample per accent level and skips muted beats', async () => {
    mount({ circleSettings: [bar(4, [3, 1, 2, 0]), bar(3, [2, 1, 3])] });
    await flush();
    await runClock(act, ctx, 7.1);
    // bar 1 beats at 0.025, 0.525, 1.025, (1.525 muted); bar 2 at 2.025, 2.525, 3.025; bar 1 again at 3.525...
    expect(times(ctx.starts).slice(0, 9)).toEqual([0.025, 0.525, 1.025, 2.025, 2.525, 3.025, 3.525, 4.025, 4.525]);
    expect(ctx.starts.slice(0, 9).map(levelOf)).toEqual([3, 1, 2, 2, 1, 3, 3, 1, 2]);
  });

  test('sets the volume as the gain of every scheduled click', async () => {
    mount({ volume: 0.35, circleSettings: [bar(2)] });
    await flush();
    await runClock(act, ctx, 0.2);
    expect(ctx.createGain).toHaveBeenCalled();
    const gains = ctx.createGain.mock.results.map(r => r.value.gain);
    expect(gains[0].setValueAtTime).toHaveBeenCalledWith(0.35, 0.025);
  });

  test('wraps around after the last circle and keeps a constant beat grid', async () => {
    mount({ circleSettings: [bar(2), bar(1), bar(2)] });
    await flush();
    await runClock(act, ctx, 6);
    const t = times(ctx.starts);
    t.forEach((time, i) => expect(time).toBeCloseTo(0.025 + i * 0.5, 5));
    // 5 beats per cycle: first, normal | first | first, normal | first, normal ...
    expect(ctx.starts.slice(0, 7).map(levelOf)).toEqual([3, 1, 3, 3, 1, 3, 1]);
  });

  test('uses the eighth-note interval for eighth bars and the quarter interval for quarter bars', async () => {
    mount({ circleSettings: [bar(2, undefined, 'quarter'), bar(2, undefined, 'eighth')] });
    await flush();
    await runClock(act, ctx, 3);
    expect(times(ctx.starts).slice(0, 6)).toEqual([0.025, 0.525, 1.025, 1.275, 1.525, 2.025]); // bar 3 is the quarter bar again
  });

  test('applies swing as long-short on even/odd beats within each bar', async () => {
    mount({ swing: 0.2, circleSettings: [bar(4)] });
    await flush();
    await runClock(act, ctx, 4.6);
    expect(times(ctx.starts).slice(0, 5)).toEqual([0.025, 0.625, 1.025, 1.625, 2.025]);
  });

  test('a tempo change takes effect on the next scheduled beat without restarting the bar', async () => {
    const { rerender, props } = mount({ circleSettings: [bar(4)] });
    await flush();
    await runClock(act, ctx, 1.2);
    const before = ctx.starts.length;
    rerender({ ...props, tempo: 60 });
    await runClock(act, ctx, 4);
    const t = times(ctx.starts);
    const lastOld = t[before - 1];
    // the beat that was already scheduled in the look-ahead keeps its time; later ones are one second apart
    const later = t.slice(before + 1);
    later.forEach((time, i) => {
      const prev = i === 0 ? t[before] : later[i - 1];
      expect(time - prev).toBeCloseTo(1, 5);
    });
    expect(t[before] - lastOld).toBeCloseTo(0.5, 5);
  });

  test('edits to the accents become audible at the next bar, not mid-bar', async () => {
    const { rerender, props } = mount({ circleSettings: [bar(2, [3, 1])] });
    await flush();
    await runClock(act, ctx, 0.3); // bar 1 is already in flight
    rerender({ ...props, circleSettings: [bar(2, [2, 2])] });
    await runClock(act, ctx, 2.2);
    expect(ctx.starts.slice(0, 6).map(levelOf)).toEqual([3, 1, 2, 2, 2, 2]);
  });

  test('adding a circle during playback extends the cycle', async () => {
    const { rerender, props } = mount({ circleSettings: [bar(2)] });
    await flush();
    await runClock(act, ctx, 1.2);
    rerender({ ...props, circleSettings: [bar(2), bar(1, [2])] });
    await runClock(act, ctx, 4);
    expect(ctx.starts.map(levelOf).slice(0, 8)).toEqual([3, 1, 3, 1, 2, 3, 1, 2]);
  });

  test('removing a circle during playback wraps a stale cursor to the remaining circles', async () => {
    const { rerender, props } = mount({ circleSettings: [bar(1, [3]), bar(1, [2]), bar(1, [1])] });
    await flush();
    await runClock(act, ctx, 0.6); // cursor is inside circle 1 or 2
    rerender({ ...props, circleSettings: [bar(1, [3]), bar(1, [2])] });
    await runClock(act, ctx, 3);
    const levels = ctx.starts.map(levelOf);
    expect(levels.slice(-4).every(l => l === 3 || l === 2)).toBe(true);
    expect(levels.slice(-4)[0]).not.toBe(levels.slice(-4)[1]);
  });

  test('with no circles nothing is scheduled and nothing throws', async () => {
    mount({ circleSettings: [] });
    await flush();
    await runClock(act, ctx, 1);
    expect(ctx.starts).toEqual([]);
  });
});

describe('visual callbacks', () => {
  test('onCircleChange / onAnySubTrigger fire at the audible time with circle and beat indices', async () => {
    const onCircleChange = jest.fn();
    const onAnySubTrigger = jest.fn();
    const { result } = mount({ circleSettings: [bar(2), bar(1)], onCircleChange, onAnySubTrigger });
    await flush();
    // start announces circle 0 immediately
    expect(onCircleChange).toHaveBeenCalledWith(0);
    onCircleChange.mockClear();
    await runClock(act, ctx, 1.6);
    expect(onAnySubTrigger.mock.calls.map(c => c[0]).slice(0, 3)).toEqual([0, 1, 0]);
    expect(onCircleChange.mock.calls.map(c => c[0]).slice(0, 3)).toEqual([0, 0, 1]);
    expect(result.current.currentSubdivision).toBeGreaterThanOrEqual(0);
  });

  test('currentSubdivision follows the beat that is sounding', async () => {
    const { result } = mount({ circleSettings: [bar(3)] });
    await flush();
    await runClock(act, ctx, 0.1);
    expect(result.current.currentSubdivision).toBe(0);
    await runClock(act, ctx, 0.5);
    expect(result.current.currentSubdivision).toBe(1);
    await runClock(act, ctx, 0.5);
    expect(result.current.currentSubdivision).toBe(2);
  });

  test('muted beats (accent 0) still deliver the visual callback', async () => {
    const onAnySubTrigger = jest.fn();
    mount({ circleSettings: [bar(2, [0, 0])], onAnySubTrigger });
    await flush();
    await runClock(act, ctx, 1.1);
    expect(ctx.starts).toEqual([]);
    expect(onAnySubTrigger).toHaveBeenCalledTimes(3);
  });
});

describe('training mode interplay', () => {
  test('macroMode 1 mutes the bars after measuresUntilMute and resumes after muteDurationMeasures', async () => {
    const silent = [];
    const handler = e => silent.push(e.detail.subIndex);
    window.addEventListener('silent-beat-played', handler);
    mount({ macroMode: 1, measuresUntilMute: 2, muteDurationMeasures: 1, circleSettings: [bar(2)] });
    await flush();
    await runClock(act, ctx, 7.1);
    window.removeEventListener('silent-beat-played', handler);
    // bars: [0.025,0.525] audible, [1.025,1.525] audible, [2.025,2.525] silent, [3.025..] audible
    // two audible bars, one silent bar (2.025/2.525), two audible bars, one silent bar (5.025/5.525), ...
    expect(times(ctx.starts).slice(0, 10)).toEqual([0.025, 0.525, 1.025, 1.525, 3.025, 3.525, 4.025, 4.525, 6.025, 6.525]);
    expect(silent.slice(0, 4)).toEqual([0, 1, 0, 1]);
  });

  test('speedMode 1 raises the tempo through setTempo after measuresUntilSpeedUp bars', async () => {
    const setTempo = jest.fn();
    mount({ speedMode: 1, measuresUntilSpeedUp: 2, tempoIncreasePercent: 10, tempo: 100, setTempo, circleSettings: [bar(2)] });
    await flush();
    await runClock(act, ctx, 3);
    expect(setTempo).toHaveBeenCalledWith(110);
  });

  test('stateful tempo: after the automatic increase the beats come closer together', async () => {
    const useStatefulTempo = () => {
      const [tempo, setTempo] = React.useState(120);
      return useMultiCircleMetronomeLogic({
        tempo, setTempo, isPaused: false, swing: 0, volume: 1, circleSettings: [bar(1)],
        speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 100
      });
    };
    renderHook(useStatefulTempo);
    await flush();
    await runClock(act, ctx, 3);
    const t = times(ctx.starts);
    const gaps = t.slice(1).map((v, i) => Number((v - t[i]).toFixed(3)));
    expect(gaps[0]).toBe(0.5);
    expect(gaps[gaps.length - 1]).toBe(0.25); // 120 -> 240 (capped), then stable
  });

  test('resets training counters on every start', async () => {
    const { result, rerender, props } = mount({ macroMode: 1, measuresUntilMute: 2, muteDurationMeasures: 9, circleSettings: [bar(1)] });
    await flush();
    await runClock(act, ctx, 1.2);
    expect(result.current.isSilencePhaseRef.current).toBe(true);
    rerender({ ...props, isPaused: true });
    rerender({ ...props, isPaused: false });
    await flush();
    // the restart zeroes the counters; the first look-ahead pass then completes exactly one 1-beat bar
    expect(result.current.measureCountRef.current).toBe(1);
    expect(result.current.muteMeasureCountRef.current).toBe(0);
    expect(result.current.isSilencePhaseRef.current).toBe(false);
  });
});

describe('pause, resume and unmount', () => {
  test('pausing stops audio and cancels pending visual callbacks; resuming starts from circle 0 again', async () => {
    const onCircleChange = jest.fn();
    const { rerender, props } = mount({ circleSettings: [bar(1, [3]), bar(1, [2])], onCircleChange });
    await flush();
    await runClock(act, ctx, 0.6);
    const countAtPause = ctx.starts.length;
    expect(countAtPause).toBeGreaterThan(0);
    rerender({ ...props, onCircleChange, isPaused: true });
    expect(jest.getTimerCount()).toBe(0);
    ctx.sources.forEach(s => expect(s.stop).toHaveBeenCalledWith(0));
    await runClock(act, ctx, 2);
    expect(ctx.starts).toHaveLength(countAtPause);

    onCircleChange.mockClear();
    const resumeAt = ctx.currentTime;
    rerender({ ...props, onCircleChange, isPaused: false });
    await flush();
    expect(onCircleChange).toHaveBeenCalledWith(0);
    await runClock(act, ctx, 0.2);
    expect(ctx.starts.length).toBe(countAtPause + 1);
    expect(ctx.starts[countAtPause].time).toBeCloseTo(resumeAt + 0.025, 5);
    expect(levelOf(ctx.starts[countAtPause])).toBe(3);
  });

  test('stopping while the AudioContext is still resuming prevents the start', async () => {
    let finish;
    resumeAudioContext.mockImplementation(() => new Promise(r => { finish = r; }));
    const { rerender, props } = mount();
    await flush();
    rerender({ ...props, isPaused: true });
    await act(async () => { finish(true); });
    expect(ctx.starts).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('unmount stops the look-ahead timer and all pending callbacks', async () => {
    const { unmount } = mount();
    await flush();
    await runClock(act, ctx, 0.3);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('a paused mount never schedules anything', async () => {
    mount({ isPaused: true });
    await flush();
    await runClock(act, ctx, 1);
    expect(ctx.starts).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('AudioContext and sample failure paths', () => {
  test('a suspended context is resumed before the first click', async () => {
    ctx = createFakeAudioContext({ state: 'suspended' });
    mount();
    await flush();
    await runClock(act, ctx, 0.2);
    expect(ctx.resume).toHaveBeenCalled();
    expect(ctx.starts).toHaveLength(1);
  });

  test('if the context cannot be resumed no sound is scheduled and nothing is left running', async () => {
    resumeAudioContext.mockResolvedValue(false);
    mount();
    await flush();
    await runClock(act, ctx, 1);
    expect(ctx.starts).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('if initialisation fails the engine logs and stays silent', async () => {
    initAudioContext.mockImplementation(() => null);
    const { result } = mount();
    await flush();
    await runClock(act, ctx, 1);
    expect(ctx.starts).toEqual([]);
    expect(result.current.audioCtx).toBeNull();
  });

  test('if the click samples cannot be loaded nothing is scheduled', async () => {
    loadClickBuffers.mockResolvedValue(false);
    global.fetch = jest.fn(async () => { throw new Error('offline'); });
    mount();
    await flush();
    await runClock(act, ctx, 1);
    expect(ctx.starts).toEqual([]);
    delete global.fetch;
  });

  test('when resuming throws, startScheduler logs the error and does not start', async () => {
    resumeAudioContext.mockRejectedValue(new Error('denied'));
    mount();
    await flush();
    await runClock(act, ctx, 0.5);
    expect(console.error).toHaveBeenCalledWith('Unable to start sequence playback:', expect.any(Error));
    expect(ctx.starts).toEqual([]);
  });

  test('the look-ahead loop does not schedule while the context is suspended mid-playback', async () => {
    mount({ circleSettings: [bar(1)] });
    await flush();
    await runClock(act, ctx, 0.3);
    const n = ctx.starts.length;
    ctx.state = 'suspended';
    await runClock(act, ctx, 2);
    expect(ctx.starts).toHaveLength(n);
  });

  test('audio initialisation runs once on mount and is not repeated by circle edits', async () => {
    const { rerender, props } = mount();
    await flush();
    rerender({ ...props, circleSettings: [bar(5)] });
    await flush();
    expect(initAudioContext).toHaveBeenCalledTimes(1);
  });
});

describe('returned API', () => {
  test('exposes tempo, tap tempo and a never-transitioning flag', async () => {
    const setTempo = jest.fn();
    const { result } = mount({ tempo: 133, setTempo });
    await flush();
    expect(result.current.actualBpm).toBe(133);
    expect(result.current.isTransitioning()).toBe(false);
    expect(typeof result.current.tapTempo).toBe('function');
    expect(typeof result.current.startScheduler).toBe('function');
    expect(typeof result.current.reloadSounds).toBe('function');
    expect(result.current.getBeatMultiplier()).toBe(1);
  });

  test('getCurrentSubIntervalSec combines tempo, beat mode and swing', async () => {
    const { result } = mount({ tempo: 120, swing: 0.25, circleSettings: [bar(4, undefined, 'eighth')] });
    await flush();
    expect(result.current.getBeatMultiplier()).toBe(2);
    expect(result.current.getCurrentSubIntervalSec(0)).toBeCloseTo(0.25 * 1.25, 10);
    expect(result.current.getCurrentSubIntervalSec(1)).toBeCloseTo(0.25 * 0.75, 10);
  });

  test('startScheduler is a no-op while already running (no duplicate timers or clicks)', async () => {
    const { result } = mount({ circleSettings: [bar(4)] });
    await flush();
    const timers = jest.getTimerCount();
    await act(async () => { await result.current.startScheduler(); });
    expect(jest.getTimerCount()).toBe(timers);
    await runClock(act, ctx, 0.1);
    expect(ctx.starts).toHaveLength(1);
  });

  test('stopScheduler tolerates nodes whose cancel/stop/disconnect throw', async () => {
    const { result } = mount();
    await flush();
    result.current.nodeRefs.current.push({ cancel() { throw new Error('x'); } }, { stop() { throw new Error('y'); } }, {});
    expect(() => act(() => { result.current.stopScheduler(); })).not.toThrow();
    expect(result.current.nodeRefs.current).toEqual([]);
    expect(result.current.currentSubdivision).toBe(0);
  });
});
