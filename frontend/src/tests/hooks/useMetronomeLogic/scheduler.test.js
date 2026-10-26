import {
  runScheduler,
  scheduleAtAudioTime,
  scheduleSubdivision
} from '../../../hooks/useMetronomeLogic/scheduler';
import { SCHEDULE_AHEAD_TIME } from '../../../hooks/useMetronomeLogic/constants';
import {
  createFakeAudioContext,
  createBufferRefs
} from '../../helpers/metronome-fakeAudio';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('scheduleAtAudioTime', () => {
  test('returns null without an audio context or callback', () => {
    expect(scheduleAtAudioTime({ audioCtx: null, when: 1, callback: () => {} })).toBeNull();
    expect(scheduleAtAudioTime({ audioCtx: { currentTime: 0 }, when: 1, callback: 'x' })).toBeNull();
  });

  test('delay is (when - now + outputLatency) in ms', () => {
    const callback = jest.fn();
    scheduleAtAudioTime({
      audioCtx: { currentTime: 10, outputLatency: 0.02 },
      when: 10.25,
      callback
    });
    jest.advanceTimersByTime(269);
    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('uses baseLatency when outputLatency is not a finite number', () => {
    const callback = jest.fn();
    scheduleAtAudioTime({
      audioCtx: { currentTime: 0, outputLatency: undefined, baseLatency: 0.25 },
      when: 0.5,
      callback
    });
    jest.advanceTimersByTime(749);
    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('assumes zero latency when neither latency value is available', () => {
    const callback = jest.fn();
    scheduleAtAudioTime({ audioCtx: { currentTime: 0, outputLatency: NaN }, when: 0.05, callback });
    jest.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('a time in the past fires on the next timer tick (delay clamped to 0)', () => {
    const callback = jest.fn();
    scheduleAtAudioTime({ audioCtx: { currentTime: 5 }, when: 1, callback });
    jest.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('tracks the handle in nodeRefs until it fires, and works without nodeRefs', () => {
    const nodeRefs = { current: [] };
    const handle = scheduleAtAudioTime({ audioCtx: { currentTime: 0 }, when: 0.01, callback: jest.fn(), nodeRefs });
    expect(nodeRefs.current).toEqual([handle]);
    jest.advanceTimersByTime(10);
    expect(nodeRefs.current).toEqual([]);

    const callback = jest.fn();
    scheduleAtAudioTime({ audioCtx: { currentTime: 0 }, when: 0.01, callback, nodeRefs: {} });
    jest.advanceTimersByTime(10);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('cancel() prevents the callback; cancelling after it fired is harmless', () => {
    const callback = jest.fn();
    const handle = scheduleAtAudioTime({ audioCtx: { currentTime: 0 }, when: 1, callback });
    handle.cancel();
    jest.runAllTimers();
    expect(callback).not.toHaveBeenCalled();

    const late = jest.fn();
    const h2 = scheduleAtAudioTime({ audioCtx: { currentTime: 0 }, when: 0.01, callback: late });
    jest.runAllTimers();
    expect(() => h2.cancel()).not.toThrow();
    expect(late).toHaveBeenCalledTimes(1);
  });
});

describe('scheduleSubdivision: which click is played', () => {
  function run(overrides = {}) {
    const audioCtx = overrides.audioCtx || createFakeAudioContext({ currentTime: 1 });
    const refs = createBufferRefs();
    const params = {
      subIndex: 0,
      when: 1.5,
      audioCtx,
      analogMode: false,
      gridMode: false,
      multiCircleMode: false,
      volumeRef: { current: 0.7 },
      ...refs,
      beatConfigRef: { current: null },
      accentsRef: { current: [] },
      shouldMute: false,
      playedBeatTimesRef: { current: [] },
      nodeRefs: { current: [] },
      ...overrides
    };
    scheduleSubdivision(params);
    return { audioCtx, refs, params };
  }

  const bufferNames = (audioCtx) => audioCtx.starts.map((s) => s.buffer.name);

  test.each([
    [3, ['first']],
    [2, ['accent']],
    [1, ['normal']],
    [0, []],
    [undefined, []],
    [4, []] // unknown level: silent
  ])('circle mode accent level %p plays %p', (level, expected) => {
    const { audioCtx } = run({ accentsRef: { current: [level] } });
    expect(bufferNames(audioCtx)).toEqual(expected);
  });

  test('circle mode reads the accent of the due subdivision index', () => {
    const { audioCtx } = run({ subIndex: 2, accentsRef: { current: [3, 1, 2, 0] } });
    expect(bufferNames(audioCtx)).toEqual(['accent']);
  });

  test('circle mode without an accents ref plays nothing', () => {
    const { audioCtx } = run({ accentsRef: undefined });
    expect(audioCtx.starts).toHaveLength(0);
  });

  test.each([
    [3, ['first']],
    [2, ['accent']],
    [1, ['normal']],
    [0, []],
    [undefined, []]
  ])('grid mode beatConfig state %p plays %p', (state, expected) => {
    const { audioCtx } = run({
      gridMode: true,
      subIndex: 1,
      beatConfigRef: { current: [0, state] },
      accentsRef: { current: [3, 3] } // must be ignored in grid mode
    });
    expect(bufferNames(audioCtx)).toEqual(expected);
  });

  test('grid mode without a beatConfig plays nothing', () => {
    const { audioCtx } = run({ gridMode: true, beatConfigRef: undefined });
    expect(audioCtx.starts).toHaveLength(0);
  });

  test('analog mode always plays the normal click, ignoring accents and beatConfig', () => {
    const { audioCtx } = run({
      analogMode: true,
      gridMode: true,
      accentsRef: { current: [3] },
      beatConfigRef: { current: [3] }
    });
    expect(bufferNames(audioCtx)).toEqual(['normal']);
  });

  test('nothing is scheduled when the selected buffer has not loaded', () => {
    const refs = createBufferRefs();
    refs.normalBufferRef.current = null;
    const { audioCtx } = run({ analogMode: true, ...refs });
    expect(audioCtx.starts).toHaveLength(0);
    expect(audioCtx.createBufferSource).not.toHaveBeenCalled();
  });
});

describe('scheduleSubdivision: timing, gain and bookkeeping', () => {
  const baseParams = (audioCtx, extra = {}) => ({
    subIndex: 0,
    when: 2,
    audioCtx,
    analogMode: true,
    gridMode: false,
    multiCircleMode: false,
    volumeRef: { current: 0.35 },
    ...createBufferRefs(),
    shouldMute: false,
    playedBeatTimesRef: { current: [] },
    nodeRefs: { current: [] },
    ...extra
  });

  test('starts the source exactly at the requested audio time with the current volume', () => {
    const ctx = createFakeAudioContext({ currentTime: 1 });
    scheduleSubdivision(baseParams(ctx, { when: 1.3333 }));
    expect(ctx.starts[0].when).toBe(1.3333);
    expect(ctx.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.35, 1.3333);
    expect(ctx.sources[0].connect).toHaveBeenCalled();
    expect(ctx.gains[0].connect).toHaveBeenCalledWith(ctx.destination);
  });

  test.each([
    ['in the past', 0.5],
    ['exactly now', 1]
  ])('a time %s is pushed to now + 1 ms', (_label, when) => {
    const ctx = createFakeAudioContext({ currentTime: 1 });
    const playedBeatTimesRef = { current: [] };
    scheduleSubdivision(baseParams(ctx, { when, playedBeatTimesRef }));
    expect(ctx.starts[0].when).toBeCloseTo(1.001, 10);
    expect(playedBeatTimesRef.current[0]).toBeCloseTo(1001, 6);
  });

  test('records the audio timeline position in ms and refreshes the bpm estimate', () => {
    const ctx = createFakeAudioContext({ currentTime: 0 });
    const playedBeatTimesRef = { current: [] };
    const updateActualBpm = jest.fn();
    scheduleSubdivision(baseParams(ctx, { when: 0.5, playedBeatTimesRef, updateActualBpm }));
    scheduleSubdivision(baseParams(ctx, { when: 1, playedBeatTimesRef, updateActualBpm }));
    expect(playedBeatTimesRef.current).toEqual([500, 1000]);
    expect(updateActualBpm).toHaveBeenCalledTimes(2);
  });

  test('works without optional playedBeatTimesRef / updateActualBpm / nodeRefs', () => {
    const ctx = createFakeAudioContext();
    expect(() => scheduleSubdivision(baseParams(ctx, {
      playedBeatTimesRef: undefined,
      updateActualBpm: 'not a function',
      nodeRefs: undefined
    }))).not.toThrow();
    expect(ctx.starts).toHaveLength(1);
  });

  test('tracks the source in nodeRefs and removes it (disconnecting) when playback ends', () => {
    const ctx = createFakeAudioContext();
    const nodeRefs = { current: [] };
    scheduleSubdivision(baseParams(ctx, { nodeRefs }));
    const source = ctx.sources[0];
    expect(nodeRefs.current).toContain(source);
    source.onended();
    expect(source.disconnect).toHaveBeenCalled();
    expect(ctx.gains[0].disconnect).toHaveBeenCalled();
    expect(nodeRefs.current).not.toContain(source);
  });

  test('onended survives a failing disconnect and an already cleared nodeRefs', () => {
    const ctx = createFakeAudioContext();
    const nodeRefs = { current: [] };
    scheduleSubdivision(baseParams(ctx, { nodeRefs }));
    const source = ctx.sources[0];
    source.disconnect.mockImplementation(() => { throw new Error('already disconnected'); });
    nodeRefs.current = [];
    expect(() => source.onended()).not.toThrow();
  });

  test('visual callbacks fire at the audio time, not at scheduling time', () => {
    const ctx = createFakeAudioContext({ currentTime: 3 });
    const onAnySubTrigger = jest.fn();
    const onBeatDue = jest.fn();
    scheduleSubdivision(baseParams(ctx, { subIndex: 2, when: 3.2, onAnySubTrigger, onBeatDue }));
    jest.advanceTimersByTime(199);
    expect(onAnySubTrigger).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onAnySubTrigger).toHaveBeenCalledWith(2);
    expect(onBeatDue).toHaveBeenCalledWith({ subIndex: 2, when: 3.2, isMuted: false });
  });

  test('a late beat gets its visual callback at the corrected time too', () => {
    const ctx = createFakeAudioContext({ currentTime: 3 });
    const onBeatDue = jest.fn();
    scheduleSubdivision(baseParams(ctx, { when: 2, onBeatDue }));
    jest.advanceTimersByTime(1);
    expect(onBeatDue).toHaveBeenCalledWith({ subIndex: 0, when: 3.001, isMuted: false });
  });

  test('a muted beat plays no audio and records no timing, but still signals visually', () => {
    const ctx = createFakeAudioContext({ currentTime: 0 });
    const onBeatDue = jest.fn();
    const onSilent = jest.fn();
    const updateActualBpm = jest.fn();
    const playedBeatTimesRef = { current: [] };
    window.addEventListener('silent-beat-played', onSilent);
    scheduleSubdivision(baseParams(ctx, { when: 0.1, shouldMute: true, onBeatDue, playedBeatTimesRef, updateActualBpm }));
    jest.advanceTimersByTime(100);
    window.removeEventListener('silent-beat-played', onSilent);

    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    expect(playedBeatTimesRef.current).toEqual([]);
    expect(updateActualBpm).not.toHaveBeenCalled();
    expect(onBeatDue).toHaveBeenCalledWith({ subIndex: 0, when: 0.1, isMuted: true });
    expect(onSilent).toHaveBeenCalledTimes(1);
    expect(onSilent.mock.calls[0][0].detail).toMatchObject({ subIndex: 0, when: 0.1 });
  });

  test('a non-muted beat does not emit silent-beat-played', () => {
    const ctx = createFakeAudioContext();
    const onSilent = jest.fn();
    window.addEventListener('silent-beat-played', onSilent);
    scheduleSubdivision(baseParams(ctx, { when: 0.01 }));
    jest.advanceTimersByTime(20);
    window.removeEventListener('silent-beat-played', onSilent);
    expect(onSilent).not.toHaveBeenCalled();
  });
});

describe('runScheduler', () => {
  function setup({ now = 0, next = 0.05, subs = 4, interval = 0.5, multiCircleMode = false, running = true } = {}) {
    const ctx = { currentTime: now };
    const scheduled = [];
    const params = {
      audioCtxRef: { current: ctx },
      nextNoteTimeRef: { current: next },
      currentSubRef: { current: 0 },
      getCurrentSubIntervalSec: jest.fn(() => interval),
      handleMeasureBoundary: jest.fn(),
      scheduleSubFn: jest.fn((sub, when) => scheduled.push([sub, when])),
      subdivisionsRef: { current: subs },
      multiCircleMode,
      nodeRefs: { current: [] },
      schedulerRunningRef: { current: running }
    };
    return { ctx, scheduled, params };
  }

  test('does nothing while stopped or without a context', () => {
    const stopped = setup({ running: false });
    runScheduler(stopped.params);
    expect(stopped.scheduled).toEqual([]);
    expect(stopped.params.nextNoteTimeRef.current).toBe(0.05);

    const noCtx = setup();
    noCtx.params.audioCtxRef.current = null;
    runScheduler(noCtx.params);
    expect(noCtx.scheduled).toEqual([]);

    runScheduler({ ...setup().params, schedulerRunningRef: undefined });
    runScheduler({ ...setup().params, audioCtxRef: undefined });
  });

  test('schedules only notes inside the 100 ms look-ahead window (strict upper bound)', () => {
    expect(SCHEDULE_AHEAD_TIME).toBe(0.1);
    const inside = setup({ now: 0, next: 0.0999 });
    runScheduler(inside.params);
    expect(inside.scheduled).toEqual([[0, 0.0999]]);

    const onEdge = setup({ now: 0, next: 0.1 });
    runScheduler(onEdge.params);
    expect(onEdge.scheduled).toEqual([]);
  });

  test('multi-circle mode widens the look-ahead by 20 % (120 ms)', () => {
    const normal = setup({ next: 0.11 });
    runScheduler(normal.params);
    expect(normal.scheduled).toEqual([]);

    const multi = setup({ next: 0.11, multiCircleMode: true });
    runScheduler(multi.params);
    expect(multi.scheduled).toEqual([[0, 0.11]]);
  });

  test('walks subdivision indices 0,1,2,3,0 and advances time by the per-index interval', () => {
    const intervals = [0.6, 0.4, 0.6, 0.4];
    const { params, scheduled } = setup({ now: 0, next: 0, interval: 0 });
    params.getCurrentSubIntervalSec = jest.fn((i) => intervals[i]);
    const ctx = params.audioCtxRef.current;
    const times = [];
    for (let tick = 0; tick < 60; tick += 1) {
      runScheduler(params);
      ctx.currentTime += 0.05;
    }
    times.push(...scheduled);
    expect(times.slice(0, 6).map(([s]) => s)).toEqual([0, 1, 2, 3, 0, 1]);
    const whens = times.slice(0, 6).map(([, w]) => w);
    [0, 0.6, 1.0, 1.6, 2.0, 2.6].forEach((expected, i) => expect(whens[i]).toBeCloseTo(expected, 10));
  });

  test('announces a measure boundary every time the index wraps (2 subdivisions)', () => {
    const { params } = setup({ now: 0, next: 0, subs: 2, interval: 0.04 });
    runScheduler(params);
    // window [0, 0.1): notes at 0, .04, .08 -> sub 0,1,0 ; wraps after note 1 and after note 3?
    // the wrap after the third note leaves index 1, so exactly one boundary so far
    expect(params.scheduleSubFn).toHaveBeenCalledTimes(3);
    expect(params.handleMeasureBoundary).toHaveBeenCalledTimes(1);
    expect(params.currentSubRef.current).toBe(1);
  });

  test('dispatches measure-complete at the boundary time (and skips it if already past)', () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    window.addEventListener('measure-complete', onComplete);
    const { params } = setup({ now: 0, next: 0.05, subs: 1, interval: 0.05 });
    runScheduler(params); // note 0.05 -> boundary at 0.1; loop ends (0.1 not < 0.1)
    expect(onComplete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(onComplete).toHaveBeenCalledTimes(1);
    window.removeEventListener('measure-complete', onComplete);
  });

  test('a stalled UI thread: overdue notes are skipped, phase is preserved', () => {
    const { params, scheduled } = setup({ now: 1, next: 0.2, subs: 4, interval: 0.25 });
    runScheduler(params);
    // overdue notes 0.2,0.45,0.7,0.95 are skipped (sub indices 0..3), then 1.2 is inside? window < 1.1 -> no
    expect(scheduled).toEqual([]);
    expect(params.currentSubRef.current).toBe(0); // 4 skipped notes wrapped around
    expect(params.nextNoteTimeRef.current).toBeCloseTo(1.2, 10);
    expect(params.handleMeasureBoundary).toHaveBeenCalledTimes(1);
  });

  test('stops mid-loop when the scheduler is switched off by a callback', () => {
    const { params } = setup({ now: 0, next: 0, interval: 0.01 });
    params.scheduleSubFn = jest.fn(() => { params.schedulerRunningRef.current = false; });
    runScheduler(params);
    expect(params.scheduleSubFn).toHaveBeenCalledTimes(1);
  });
});
