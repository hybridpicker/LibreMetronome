import {
  runScheduler,
  scheduleAtAudioTime,
  scheduleSubdivision
} from '../../hooks/useMetronomeLogic/scheduler';

describe('professional timing scheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('defers visual state until the audio reaches the output', () => {
    const callback = jest.fn();
    const nodeRefs = { current: [] };
    const audioCtx = { currentTime: 10, outputLatency: 0.02 };

    scheduleAtAudioTime({ audioCtx, when: 10.05, callback, nodeRefs });

    jest.advanceTimersByTime(69);
    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(nodeRefs.current).toHaveLength(0);
  });

  test('cancels a pending visual beat when playback stops', () => {
    const callback = jest.fn();
    const nodeRefs = { current: [] };

    scheduleAtAudioTime({
      audioCtx: { currentTime: 2, baseLatency: 0.01 },
      when: 2.05,
      callback,
      nodeRefs
    });
    nodeRefs.current[0].cancel();
    jest.runAllTimers();

    expect(callback).not.toHaveBeenCalled();
  });

  test('records scheduled audio time instead of scheduler invocation time', () => {
    const starts = [];
    const audioCtx = {
      currentTime: 1,
      outputLatency: 0,
      destination: {},
      createBufferSource: () => ({
        connect() { return this; },
        disconnect() {},
        start(when) { starts.push(when); }
      }),
      createGain: () => ({
        gain: { setValueAtTime() {} },
        connect() { return this; },
        disconnect() {}
      })
    };
    const playedBeatTimesRef = { current: [] };

    scheduleSubdivision({
      subIndex: 0,
      when: 1.125,
      audioCtx,
      analogMode: true,
      gridMode: false,
      multiCircleMode: false,
      volumeRef: { current: 0.8 },
      normalBufferRef: { current: {} },
      accentBufferRef: { current: {} },
      firstBufferRef: { current: {} },
      playedBeatTimesRef,
      nodeRefs: { current: [] },
      shouldMute: false
    });

    expect(starts).toEqual([1.125]);
    expect(playedBeatTimesRef.current).toEqual([1125]);
  });

  test('keeps advancing from the audio timeline without immediate UI mutation', () => {
    const scheduleSubFn = jest.fn();
    const nextNoteTimeRef = { current: 5.05 };
    const currentSubRef = { current: 0 };

    runScheduler({
      audioCtxRef: { current: { currentTime: 5 } },
      nextNoteTimeRef,
      currentSubRef,
      getCurrentSubIntervalSec: () => 0.5,
      handleMeasureBoundary: jest.fn(),
      scheduleSubFn,
      subdivisionsRef: { current: 4 },
      multiCircleMode: false,
      nodeRefs: { current: [] },
      schedulerRunningRef: { current: true }
    });

    expect(scheduleSubFn).toHaveBeenCalledWith(0, 5.05, expect.any(Object));
    expect(nextNoteTimeRef.current).toBeCloseTo(5.55);
    expect(currentSubRef.current).toBe(1);
  });
  test('skips overdue clicks after a UI stall while preserving beat phase', () => {
    const scheduleSubFn = jest.fn();
    const nextNoteTimeRef = { current: 5.05 };
    const currentSubRef = { current: 0 };
    runScheduler({
      audioCtxRef: { current: { currentTime: 6 } },
      nextNoteTimeRef, currentSubRef,
      getCurrentSubIntervalSec: () => 0.25,
      handleMeasureBoundary: jest.fn(), scheduleSubFn,
      subdivisionsRef: { current: 4 }, multiCircleMode: false,
      nodeRefs: { current: [] }, schedulerRunningRef: { current: true }
    });
    expect(scheduleSubFn).toHaveBeenCalledTimes(1);
    expect(scheduleSubFn).toHaveBeenCalledWith(0, 6.05, expect.any(Object));
    expect(nextNoteTimeRef.current).toBeCloseTo(6.3);
  });

  test.each([15, 120, 240])('preserves the audio grid for ten minutes at %i BPM', (bpm) => {
    const ctx = { currentTime: 0 };
    const starts = [];
    const interval = 60 / bpm;
    const refs = {
      audioCtxRef: { current: ctx }, nextNoteTimeRef: { current: 0.05 },
      currentSubRef: { current: 0 }, getCurrentSubIntervalSec: () => interval,
      handleMeasureBoundary: jest.fn(), scheduleSubFn: (_, when) => starts.push(when),
      subdivisionsRef: { current: 4 }, nodeRefs: { current: [] },
      schedulerRunningRef: { current: true }
    };
    // Uneven scheduler invocations simulate ordinary main-thread jitter.
    for (let tick = 0; ctx.currentTime < 600; tick++) {
      runScheduler(refs);
      ctx.currentTime += tick % 3 === 0 ? 0.035 : 0.02;
    }
    starts.forEach((when, index) => expect(when).toBeCloseTo(0.05 + index * interval, 8));
    expect(starts.length).toBeGreaterThanOrEqual(600 / interval);
  });

});
