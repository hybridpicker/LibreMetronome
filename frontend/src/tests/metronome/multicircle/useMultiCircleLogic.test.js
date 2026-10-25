// Characterization of the legacy Sequence logic hook (useMultiCircleLogic). The hook is only
// re-exported from MultiCircleMode/index.js; the app's MultiCircleMetronome does not use it.
// useMetronomeLogic (owned by another area) is replaced by a controllable stand-in.
import { renderHook, act } from '@testing-library/react';
import useMultiCircleLogic from '../../../components/metronome/MultiCircleMode/hooks/useMultiCircleLogic';
import { useMultiCircleLogic as reExported } from '../../../components/metronome/MultiCircleMode/hooks';
import useMetronomeLogic from '../../../hooks/useMetronomeLogic';

jest.mock('../../../hooks/useMetronomeLogic', () => jest.fn());

const bar = (subdivisions, beatMode = 'quarter') => ({
  subdivisions, beatMode, accents: Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
});

let logic;
let setters;

function makeAudioCtx(state = 'running') {
  return {
    state,
    currentTime: 10,
    resume: jest.fn(async () => { /* state stays as configured by the test */ }),
    suspend: jest.fn(async () => {})
  };
}

function setup(overrides = {}) {
  setters = {
    setTempo: jest.fn(),
    setIsPaused: jest.fn(),
    setPlayingCircle: jest.fn(),
    setCircleSettings: jest.fn(),
    registerTogglePlay: jest.fn(),
    registerTapTempo: jest.fn()
  };
  const props = {
    tempo: 120, isPaused: false, swing: 0, volume: 1,
    circleSettings: [bar(4), bar(3)], activeCircle: 0, playingCircle: 0,
    macroMode: 0, speedMode: 0, measuresUntilMute: 2, muteDurationMeasures: 1, muteProbability: 0.3,
    tempoIncreasePercent: 10, measuresUntilSpeedUp: 2,
    ...setters, ...overrides
  };
  const view = renderHook(p => useMultiCircleLogic(p), { initialProps: props });
  return { ...view, props };
}

/** Drive the "current subdivision" through the given values, one rerender each. */
function feed(view, props, values) {
  values.forEach(v => {
    logic.currentSubdivision = v;
    view.rerender({ ...props });
  });
}

/** Apply a functional state update given to a jest.fn setter on a starting value. */
const applyUpdater = (setter, prev, call = 0) => setter.mock.calls[call][0](prev);

beforeEach(() => {
  jest.useFakeTimers();
  ['log', 'warn', 'error'].forEach(k => jest.spyOn(console, k).mockImplementation(() => {}));
  logic = {
    currentSubdivision: 0,
    startScheduler: jest.fn(),
    stopScheduler: jest.fn(),
    audioCtx: makeAudioCtx(),
    currentSubStartRef: { current: 5 },
    tapTempo: jest.fn()
  };
  useMetronomeLogic.mockReset().mockImplementation(() => logic);
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete window.isSilencePhaseRef;
});

test('is re-exported from the hooks barrel', () => {
  expect(reExported).toBe(useMultiCircleLogic);
});

describe('wiring into useMetronomeLogic', () => {
  test('passes the playing circle\'s settings and sequence flags', () => {
    setup({ circleSettings: [bar(5, 'eighth'), bar(3)], playingCircle: 0, swing: 0.1 });
    const args = useMetronomeLogic.mock.calls[0][0];
    expect(args).toMatchObject({
      tempo: 120, subdivisions: 5, accents: [3, 1, 1, 1, 1], beatMultiplier: 2,
      analogMode: false, gridMode: false, multiCircleMode: true, swing: 0.1
    });
  });

  test('falls back to 4 beats and [3,1,1,1] when the circle is missing', () => {
    setup({ circleSettings: [bar(4)], playingCircle: 7 });
    const args = useMetronomeLogic.mock.calls[0][0];
    expect(args.beatMultiplier).toBe(2); // characterization: current behaviour, see report (undefined beatMode is not "quarter")
    expect(args.subdivisions).toBe(4);
    expect(args.accents).toEqual([3, 1, 1, 1]);
  });

  test('publishes the silence-phase ref globally and removes it on unmount', () => {
    const { result, unmount } = setup();
    expect(window.isSilencePhaseRef).toBe(result.current.isSilencePhaseRef);
    unmount();
    expect(window.isSilencePhaseRef).toBeUndefined();
  });

  test('refreshes the playing settings one render after the playing circle changes', () => {
    const { rerender, props } = setup();
    rerender({ ...props, playingCircle: 1 });
    // characterization: current behaviour, see report. The ref is updated in an effect, after the
    // render that already called useMetronomeLogic, so the first render still sees circle 0.
    expect(useMetronomeLogic.mock.calls.at(-1)[0].subdivisions).toBe(4);
    rerender({ ...props, playingCircle: 1 });
    const last = useMetronomeLogic.mock.calls.at(-1)[0];
    expect(last.subdivisions).toBe(3);
    expect(last.accents).toEqual([3, 1, 1]);
  });

  test('ignores a playing circle that is out of range', () => {
    const { rerender, props } = setup();
    rerender({ ...props, playingCircle: 5 });
    expect(useMetronomeLogic.mock.calls.at(-1)[0].subdivisions).toBe(4);
  });
});

describe('editing helpers', () => {
  test('handleSetSubdivisions rewrites the active circle with a first-beat accent pattern', () => {
    const { result } = setup({ activeCircle: 1 });
    act(() => result.current.handleSetSubdivisions(5));
    const next = applyUpdater(setters.setCircleSettings, [bar(4), bar(3)]);
    expect(next[1]).toEqual({ subdivisions: 5, beatMode: 'quarter', accents: [3, 1, 1, 1, 1] });
    expect(next[0]).toEqual(bar(4));
  });

  test.each([0, -1, 10, 100])('handleSetSubdivisions(%i) is rejected', value => {
    const { result } = setup();
    act(() => result.current.handleSetSubdivisions(value));
    expect(setters.setCircleSettings).not.toHaveBeenCalled();
  });

  test.each([1, 9])('handleSetSubdivisions accepts the boundary value %i', value => {
    const { result } = setup();
    act(() => result.current.handleSetSubdivisions(value));
    expect(applyUpdater(setters.setCircleSettings, [bar(4)])[0].subdivisions).toBe(value);
  });

  test('handleSetSubdivisions keeps state when there are no circles or the active one is gone', () => {
    const { result } = setup({ activeCircle: 4 });
    act(() => result.current.handleSetSubdivisions(5));
    const prev = [bar(4)];
    expect(applyUpdater(setters.setCircleSettings, prev)).toBe(prev);
    expect(applyUpdater(setters.setCircleSettings, [])).toEqual([]);
    expect(applyUpdater(setters.setCircleSettings, null)).toBeNull();
  });

  test('addCircle appends a default 4/4 circle up to three circles', () => {
    const { result } = setup();
    act(() => result.current.addCircle());
    const grown = applyUpdater(setters.setCircleSettings, [bar(4), bar(3)]);
    expect(grown).toHaveLength(3);
    expect(grown[2]).toEqual(bar(4));
    const full = [bar(4), bar(3), bar(2)];
    expect(applyUpdater(setters.setCircleSettings, full)).toBe(full);
    expect(applyUpdater(setters.setCircleSettings, null)).toBeNull();
  });

  describe('removeCircle', () => {
    test('does nothing with a single circle', () => {
      const { result } = setup({ circleSettings: [bar(4)] });
      act(() => result.current.removeCircle(0));
      expect(setters.setCircleSettings).not.toHaveBeenCalled();
      expect(setters.setPlayingCircle).not.toHaveBeenCalled();
    });

    test('removing the playing circle resets playback to circle 0', () => {
      const { result } = setup({ playingCircle: 1 });
      act(() => result.current.removeCircle(1));
      expect(applyUpdater(setters.setCircleSettings, [bar(4), bar(3)])).toEqual([bar(4)]);
      expect(setters.setPlayingCircle).toHaveBeenCalledWith(0);
    });

    test('removing a circle before the playing one shifts the playing index down', () => {
      const { result } = setup({ circleSettings: [bar(4), bar(3), bar(2)], playingCircle: 2 });
      act(() => result.current.removeCircle(0));
      expect(applyUpdater(setters.setPlayingCircle, 2)).toBe(1);
    });

    test('removing a circle after the playing one leaves the playing index alone', () => {
      const { result } = setup({ circleSettings: [bar(4), bar(3), bar(2)], playingCircle: 0 });
      act(() => result.current.removeCircle(2));
      expect(setters.setPlayingCircle).not.toHaveBeenCalled();
    });
  });

  describe('updateAccent', () => {
    test('cycles the accent of the active circle 0 -> 1 -> 2 -> 0 and turns a first beat (3) into a normal beat (1)', () => {
      const { result } = setup({ activeCircle: 0 });
      act(() => result.current.updateAccent(1));
      const prev = [{ ...bar(4), accents: [3, 0, 1, 2] }, bar(3)];
      expect(applyUpdater(setters.setCircleSettings, prev)[0].accents).toEqual([3, 1, 1, 2]);
      expect(applyUpdater(setters.setCircleSettings, [{ ...bar(4), accents: [3, 1, 1, 1] }])[0].accents).toEqual([3, 2, 1, 1]);
      act(() => result.current.updateAccent(0));
      expect(applyUpdater(setters.setCircleSettings, [bar(4)], 1)[0].accents).toEqual([1, 1, 1, 1]); // (3 + 1) % 3 = 1
    });

    test('ignores out-of-range beats, missing accents, and a vanished active circle', () => {
      const { result } = setup({ activeCircle: 0 });
      act(() => result.current.updateAccent(9));
      const prev = [bar(4)];
      expect(applyUpdater(setters.setCircleSettings, prev)).toBe(prev);
      expect(applyUpdater(setters.setCircleSettings, [{ subdivisions: 4 }])).toEqual([{ subdivisions: 4 }]);
      expect(applyUpdater(setters.setCircleSettings, [])).toEqual([]);

      const gone = setup({ activeCircle: 3 });
      act(() => gone.result.current.updateAccent(0));
      expect(applyUpdater(setters.setCircleSettings, prev)).toBe(prev);
    });

    test('"remove" delegates to removeCircle with the circle index', () => {
      const { result } = setup({ playingCircle: 0 });
      act(() => result.current.updateAccent('remove', 1));
      expect(applyUpdater(setters.setCircleSettings, [bar(4), bar(3)])).toEqual([bar(4)]);
    });
  });
});

describe('end of bar handling and circle switching', () => {
  test('a full bar (1,2,3,0) advances to the next circle and stops the scheduler', () => {
    const view = setup();
    feed(view, view.props, [1, 2, 3]);
    expect(setters.setPlayingCircle).not.toHaveBeenCalled();
    feed(view, view.props, [0]);
    expect(setters.setPlayingCircle).toHaveBeenCalledWith(1);
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
  });

  test('wraps from the last circle back to the first', () => {
    const view = setup({ playingCircle: 1 });
    feed(view, view.props, [1, 2, 0]);
    expect(setters.setPlayingCircle).toHaveBeenCalledWith(0);
  });

  test('the first observed value never counts as a boundary', () => {
    const view = setup();
    feed(view, view.props, [0]);
    expect(setters.setPlayingCircle).not.toHaveBeenCalled();
  });

  test('does nothing while paused or with a single circle', () => {
    const paused = setup({ isPaused: true });
    feed(paused, paused.props, [1, 0]);
    expect(setters.setPlayingCircle).not.toHaveBeenCalled();

    const single = setup({ circleSettings: [bar(4)] });
    feed(single, single.props, [1, 0]);
    expect(setters.setPlayingCircle).not.toHaveBeenCalled();
  });

  test('two bar ends within 500 ms switch circles only once', () => {
    const view = setup();
    feed(view, view.props, [1, 0]);
    act(() => { jest.advanceTimersByTime(100); }); // clears the transition flag
    feed(view, view.props, [1, 0]);
    expect(setters.setPlayingCircle).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(600); });
    feed(view, view.props, [1, 0]);
    expect(setters.setPlayingCircle).toHaveBeenCalledTimes(2);
  });

  test('the bar end is ignored while the 100 ms transition flag is set', () => {
    const view = setup();
    feed(view, view.props, [1, 0]);
    expect(view.result.current.isTransitioningRef.current).toBe(true);
    act(() => { jest.advanceTimersByTime(100); });
    expect(view.result.current.isTransitioningRef.current).toBe(false);
  });

  test('characterization: the delayed restart of the scheduler never runs because the flag is still set', () => {
    // see report: useMultiCircleLogic.js:289-299 checks !isTransitioningRef (cleared only after 100 ms)
    const view = setup();
    feed(view, view.props, [1, 0]);
    act(() => { jest.advanceTimersByTime(300); });
    expect(logic.startScheduler).not.toHaveBeenCalled();
  });

  test('no restart is attempted when there is no audio context', () => {
    logic.audioCtx = null;
    const view = setup();
    feed(view, view.props, [1, 0]);
    act(() => { jest.advanceTimersByTime(300); });
    expect(logic.startScheduler).not.toHaveBeenCalled();
    expect(setters.setPlayingCircle).toHaveBeenCalledWith(1);
  });

  test('the switch updates the playing settings used by the next render', () => {
    const view = setup({ circleSettings: [bar(4), bar(6, 'eighth')] });
    feed(view, view.props, [1, 0]);
    // playingCircle prop is still 0 (parent state), but the ref already holds circle 1's settings
    view.rerender({ ...view.props, playingCircle: 1 });
    const args = useMetronomeLogic.mock.calls.at(-1)[0];
    expect(args.subdivisions).toBe(6);
    expect(args.beatMultiplier).toBe(2);
  });
});

describe('training counters in the hook', () => {
  test('macroMode 1 starts the silence phase after measuresUntilMute bars and ends it after muteDurationMeasures', () => {
    const view = setup({ macroMode: 1, measuresUntilMute: 2, muteDurationMeasures: 1 });
    const bars = () => { feed(view, view.props, [1, 0]); act(() => { jest.advanceTimersByTime(700); }); };
    bars();
    expect(view.result.current.isSilencePhaseRef.current).toBe(false);
    expect(view.result.current.measureCountRef.current).toBe(1);
    bars();
    expect(view.result.current.isSilencePhaseRef.current).toBe(true);
    expect(window.isSilencePhaseRef).toBe(view.result.current.isSilencePhaseRef);
    bars();
    expect(view.result.current.isSilencePhaseRef.current).toBe(false);
    expect(view.result.current.measureCountRef.current).toBe(0);
    expect(view.result.current.muteMeasureCountRef.current).toBe(0);
  });

  test('speedMode 1 raises the tempo by the percentage and resets the counter', () => {
    const view = setup({ speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 25, tempo: 100 });
    feed(view, view.props, [1, 0]);
    expect(setters.setTempo).toHaveBeenCalledWith(125);
    expect(view.result.current.measureCountRef.current).toBe(0);
  });

  test('the tempo is capped at 240', () => {
    const view = setup({ speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 100, tempo: 200 });
    feed(view, view.props, [1, 0]);
    expect(setters.setTempo).toHaveBeenCalledWith(240);
  });

  test('no tempo increase while the silence phase is active', () => {
    const view = setup({ macroMode: 1, measuresUntilMute: 1, muteDurationMeasures: 3, speedMode: 1, measuresUntilSpeedUp: 1 });
    feed(view, view.props, [1, 0]);
    expect(view.result.current.isSilencePhaseRef.current).toBe(true);
    expect(setters.setTempo).not.toHaveBeenCalled();
  });
});

describe('handlePlayPause', () => {
  /** Run handlePlayPause and the functional update it hands to setIsPaused. */
  const press = (view, prevPaused) => {
    act(() => view.result.current.handlePlayPause());
    return applyUpdater(setters.setIsPaused, prevPaused);
  };

  test('start: resets counters, selects circle 0, starts the scheduler and returns "not paused"', () => {
    const view = setup({ isPaused: true, playingCircle: 1, macroMode: 1 });
    view.result.current.isSilencePhaseRef.current = true;
    view.result.current.measureCountRef.current = 7;
    view.result.current.muteMeasureCountRef.current = 3;
    expect(press(view, true)).toBe(false);
    expect(setters.setPlayingCircle).toHaveBeenCalledWith(0);
    expect(logic.currentSubStartRef.current).toBe(0);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    expect(view.result.current.isSilencePhaseRef.current).toBe(false);
    expect(view.result.current.measureCountRef.current).toBe(0);
    expect(view.result.current.muteMeasureCountRef.current).toBe(0);
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(false);
  });

  test('start with a suspended context resumes it before starting', async () => {
    logic.audioCtx = makeAudioCtx('suspended');
    const view = setup({ isPaused: true });
    press(view, true);
    expect(logic.startScheduler).not.toHaveBeenCalled();
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(true);
    await act(async () => { await Promise.resolve(); });
    expect(logic.audioCtx.resume).toHaveBeenCalledTimes(1);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(false);
  });

  test('start with a context that cannot be resumed logs and releases the lock without starting', async () => {
    logic.audioCtx = makeAudioCtx('suspended');
    logic.audioCtx.resume.mockRejectedValue(new Error('denied'));
    const view = setup({ isPaused: true });
    press(view, true);
    await act(async () => { await Promise.resolve(); });
    expect(logic.startScheduler).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Error resuming AudioContext:', expect.any(Error));
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(false);
  });

  test('start without any audio context still tries to start the scheduler', () => {
    logic.audioCtx = null;
    const view = setup({ isPaused: true });
    press(view, true);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('start with a missing logic object does not throw', () => {
    useMetronomeLogic.mockImplementation(() => null);
    const view = setup({ isPaused: true });
    expect(() => press(view, true)).not.toThrow();
  });

  test('stop: stops the scheduler, suspends a running context, selects circle 0, returns "paused"', async () => {
    const view = setup({ isPaused: false, playingCircle: 1 });
    expect(press(view, false)).toBe(true);
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
    expect(logic.audioCtx.suspend).toHaveBeenCalledTimes(1);
    expect(setters.setPlayingCircle).toHaveBeenCalledWith(0);
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(true);
    await act(async () => { await Promise.resolve(); });
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(false);
  });

  test('stop releases the lock even if suspend rejects', async () => {
    logic.audioCtx.suspend.mockRejectedValue(new Error('x'));
    const view = setup({ isPaused: false });
    press(view, false);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(console.error).toHaveBeenCalledWith('Error suspending AudioContext:', expect.any(Error));
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(false);
  });

  test('stop with a non-running context releases the lock immediately', () => {
    logic.audioCtx = makeAudioCtx('suspended');
    const view = setup({ isPaused: false });
    press(view, false);
    expect(logic.audioCtx.suspend).not.toHaveBeenCalled();
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(false);
  });

  test('a second press while the first is still resuming is ignored', () => {
    logic.audioCtx = makeAudioCtx('suspended');
    logic.audioCtx.resume.mockReturnValue(new Promise(() => {}));
    const view = setup({ isPaused: true });
    press(view, true);
    act(() => view.result.current.handlePlayPause());
    expect(setters.setIsPaused).toHaveBeenCalledTimes(1);
  });

  test('the 2 s safety timeout releases a stuck lock', () => {
    logic.audioCtx = makeAudioCtx('suspended');
    logic.audioCtx.resume.mockReturnValue(new Promise(() => {}));
    const view = setup({ isPaused: true });
    press(view, true);
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(true);
    act(() => { jest.advanceTimersByTime(1999); });
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(true);
    act(() => { jest.advanceTimersByTime(1); });
    expect(view.result.current.isProcessingPlayPauseRef.current).toBe(false);
  });
});

describe('registration with the parent', () => {
  test('registers the toggle and tap-tempo callbacks and unregisters them on unmount', () => {
    const { result, unmount } = setup();
    expect(setters.registerTogglePlay).toHaveBeenCalledWith(result.current.handlePlayPause);
    expect(setters.registerTapTempo).toHaveBeenCalledWith(logic.tapTempo);
    unmount();
    expect(setters.registerTogglePlay).toHaveBeenLastCalledWith(null);
    expect(setters.registerTapTempo).toHaveBeenLastCalledWith(null);
  });

  test('works without registration callbacks and without tapTempo', () => {
    logic.tapTempo = undefined;
    const { unmount } = setup({ registerTogglePlay: undefined, registerTapTempo: undefined });
    expect(() => unmount()).not.toThrow();
  });

  test('does not register tap tempo when the logic has none', () => {
    logic.tapTempo = undefined;
    setup();
    expect(setters.registerTapTempo).not.toHaveBeenCalledWith(expect.any(Function));
  });
});
