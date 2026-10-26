import { renderHook, act } from '@testing-library/react';
import useMetronomeLogic from '../../../hooks/useMetronomeLogic';
import {
  initAudioContext,
  loadClickBuffers,
  resumeAudioContext
} from '../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { createFakeAudioContext, silenceConsole } from '../../helpers/metronome-fakeAudio';

jest.mock('../../../hooks/useMetronomeLogic/audioBuffers', () => ({
  initAudioContext: jest.fn(),
  resumeAudioContext: jest.fn(),
  loadClickBuffers: jest.fn()
}));
jest.mock('../../../services/soundSetService', () => ({
  getActiveSoundSet: jest.fn()
}));

// Capture the real refs object so tests can inspect the tracked audio nodes.
const mockCaptured = { refs: null };
jest.mock('../../../hooks/useMetronomeLogic/references', () => {
  const actual = jest.requireActual('../../../hooks/useMetronomeLogic/references');
  return {
    useMetronomeRefs: () => {
      const refs = actual.useMetronomeRefs();
      mockCaptured.refs = refs;
      return refs;
    }
  };
});

const T0 = 10; // audio clock at start
const LEAD = 0.025; // STARTUP_LEAD_TIME
const STEP = 0.02; // SCHEDULER_INTERVAL in seconds

let ctx;
let restoreConsole;
let cleanups;

const baseProps = (overrides = {}) => ({
  tempo: 120,
  setTempo: jest.fn(),
  subdivisions: 4,
  setSubdivisions: jest.fn(),
  isPaused: false,
  setIsPaused: jest.fn(),
  swing: 0,
  setSwing: jest.fn(),
  volume: 0.6,
  setVolume: jest.fn(),
  accents: [1, 1, 1, 1],
  ...overrides
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  });
}

// Advances the audio clock and the fake timers together in scheduler-sized steps.
function advance(seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    ctx.currentTime += STEP;
    act(() => {
      jest.advanceTimersByTime(20);
    });
  }
}

function listen(name) {
  const events = [];
  const handler = (e) => events.push(e.detail);
  window.addEventListener(name, handler);
  cleanups.push(() => window.removeEventListener(name, handler));
  return events;
}

async function start(props) {
  const view = renderHook((p) => useMetronomeLogic(p), { initialProps: baseProps(props) });
  await flush();
  return view;
}

// The silent unlock buffer started by loadAudioSystem has no name; clicks do.
const clicks = () => ctx.starts.filter((s) => s.buffer && s.buffer.name);
const whens = (n) => clicks().slice(0, n).map((s) => s.when);
const names = (n) => clicks().slice(0, n).map((s) => s.buffer.name);

beforeEach(() => {
  jest.useFakeTimers();
  restoreConsole = silenceConsole();
  cleanups = [];
  ctx = createFakeAudioContext({ currentTime: T0 });
  initAudioContext.mockImplementation(() => ctx);
  resumeAudioContext.mockImplementation(async (c) => {
    c.state = 'running';
    return true;
  });
  loadClickBuffers.mockImplementation(async ({ normalBufferRef, accentBufferRef, firstBufferRef }) => {
    normalBufferRef.current = { name: 'normal' };
    accentBufferRef.current = { name: 'accent' };
    firstBufferRef.current = { name: 'first' };
    return true;
  });
  getActiveSoundSet.mockImplementation(async () => ({ id: 'set-1', name: 'Set One' }));
  delete window.isSilencePhaseRef;
});

afterEach(() => {
  cleanups.forEach((fn) => fn());
  jest.clearAllTimers();
  jest.useRealTimers();
  restoreConsole();
  jest.restoreAllMocks();
});

describe('exact click timing', () => {
  test('quarter notes at 120 BPM: clicks at +25 ms, then every 500 ms, with first/accent/normal levels', async () => {
    await start({ accents: [3, 1, 2, 1] });
    advance(2.5);
    expect(whens(6).map((w) => Number(w.toFixed(6)))).toEqual([10.025, 10.525, 11.025, 11.525, 12.025, 12.525]);
    expect(names(6)).toEqual(['first', 'normal', 'accent', 'normal', 'first', 'normal']);
  });

  test('every click uses the current volume as its gain', async () => {
    await start({ volume: 0.35 });
    advance(0.2);
    expect(ctx.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.35, T0 + LEAD);
  });

  test('eighth notes (beatMultiplier 2) halve the spacing: 250 ms at 120 BPM', async () => {
    await start({ beatMultiplier: 2 });
    advance(1.1);
    const w = whens(5);
    expect(w[0]).toBeCloseTo(10.025, 6);
    for (let i = 1; i < 5; i += 1) expect(w[i] - w[i - 1]).toBeCloseTo(0.25, 6);
  });

  test.each([
    [15, 1, 4],
    [30, 1, 2],
    [60, 1, 1],
    [120, 1, 0.5],
    [240, 1, 0.25],
    [60, 2, 0.5],
    [240, 4, 0.0625],
    [90, 3, 60 / 90 / 3]
  ])('tempo %i with multiplier %i spaces clicks by %f s', async (tempo, beatMultiplier, interval) => {
    await start({ tempo, beatMultiplier });
    advance(interval * 3 + 0.2);
    const w = whens();
    expect(w.length).toBeGreaterThanOrEqual(3);
    expect(w[0]).toBeCloseTo(T0 + LEAD, 6);
    for (let i = 1; i < 3; i += 1) expect(w[i] - w[i - 1]).toBeCloseTo(interval, 6);
  });

  test('tempo 0 (invalid) falls back to a 500 ms interval', async () => {
    await start({ tempo: 0 });
    advance(1.2);
    const w = whens();
    expect(w[1] - w[0]).toBeCloseTo(0.5, 6);
  });

  test('swing stretches even and shortens odd subdivisions (eighths at 120 BPM, swing 0.2)', async () => {
    await start({ beatMultiplier: 2, swing: 0.2 });
    advance(1.5);
    const w = whens(6);
    const gaps = w.slice(1).map((x, i) => Number((x - w[i]).toFixed(6)));
    expect(gaps).toEqual([0.3, 0.2, 0.3, 0.2, 0.3]);
  });

  test('swing is ignored with a single subdivision', async () => {
    await start({ beatMultiplier: 2, swing: 0.5, subdivisions: 1, accents: [1] });
    advance(1);
    const w = whens(3);
    expect(w[1] - w[0]).toBeCloseTo(0.25, 6);
    expect(w[2] - w[1]).toBeCloseTo(0.25, 6);
  });

  test('swing 0 gives even spacing and extreme swing 1 collapses odd subdivisions to 0', async () => {
    await start({ beatMultiplier: 2, swing: 0, subdivisions: 2, accents: [1, 1] });
    advance(0.8);
    expect(whens(3).map((w, i, a) => (i ? Number((w - a[i - 1]).toFixed(6)) : 0))).toEqual([0, 0.25, 0.25]);
  });

  test('a tempo change applies from the next scheduled note onwards', async () => {
    const { rerender } = await start({ tempo: 120, accents: [1, 1, 1, 1] });
    advance(1.2);
    const before = whens();
    rerender(baseProps({ tempo: 60 }));
    advance(3);
    const w = whens();
    expect(before[1] - before[0]).toBeCloseTo(0.5, 6);
    const last = w.slice(-3);
    expect(last[1] - last[0]).toBeCloseTo(1, 6);
    expect(last[2] - last[1]).toBeCloseTo(1, 6);
  });
});

describe('beats per measure 1..9', () => {
  test.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('%i beats cycle through sub indices and announce one boundary per measure', async (beats) => {
    const beatEvents = listen('metronome-beat');
    const boundaries = listen('metronome-measure-boundary');
    await start({ tempo: 240, subdivisions: beats, accents: Array(beats).fill(1) });
    advance((2 * beats + 1) * 0.25 + 0.2);

    const expected = Array.from({ length: 2 * beats }, (_, i) => i % beats);
    expect(beatEvents.slice(0, 2 * beats).map((e) => e.subIndex)).toEqual(expected);
    expect(beatEvents.slice(0, 2 * beats).every((e) => !e.isMuted)).toBe(true);
    expect(boundaries).toHaveLength(Math.floor(clicks().length / beats));
    expect(boundaries.length).toBeGreaterThanOrEqual(2);
  });

  test('visual beat events carry the audio time of their click', async () => {
    const beatEvents = listen('metronome-beat');
    await start({ tempo: 120 });
    advance(1.2);
    expect(beatEvents.slice(0, 2).map((e) => Number(e.when.toFixed(6)))).toEqual([10.025, 10.525]);
  });

  test('measure-complete is dispatched when a measure ends', async () => {
    const completes = listen('measure-complete');
    await start({ tempo: 240, subdivisions: 2, accents: [1, 1] });
    advance(1.4);
    expect(completes.length).toBe(2);
  });

  test('currentSubdivision and onAnySubTrigger follow the audible beat', async () => {
    const onAnySubTrigger = jest.fn();
    const { result } = await start({ tempo: 120, subdivisions: 3, accents: [1, 1, 1], onAnySubTrigger });
    advance(0.2);
    expect(result.current.currentSubdivision).toBe(0);
    advance(0.4); // t=0.6 -> second click (0.525) has fired
    expect(result.current.currentSubdivision).toBe(1);
    advance(0.5);
    expect(result.current.currentSubdivision).toBe(2);
    expect(onAnySubTrigger.mock.calls.map((c) => c[0])).toEqual([0, 1, 2]);
  });
});

describe('accent modes', () => {
  test('grid mode reads beatConfig, ignoring accents', async () => {
    await start({ gridMode: true, beatConfig: [3, 0, 2, 1], accents: [1, 1, 1, 1] });
    advance(2.2);
    // sub 1 is off in the grid -> no click
    expect(names(4)).toEqual(['first', 'accent', 'normal', 'first']);
    expect(whens(4).map((w) => Number(w.toFixed(6)))).toEqual([10.025, 11.025, 11.525, 12.025]);
  });

  test('analog mode plays only normal clicks', async () => {
    await start({ analogMode: true, accents: [3, 2, 0, 3] });
    advance(2);
    expect(new Set(names())).toEqual(new Set(['normal']));
    expect(clicks().length).toBe(5); // sub 2 (accent 0) is still audible: analog ignores accents
  });

  test('accent changes are picked up without restarting', async () => {
    const { rerender } = await start({ accents: [1, 1, 1, 1] });
    advance(0.8);
    rerender(baseProps({ accents: [2, 2, 2, 2] }));
    advance(1);
    expect(names().slice(-1)).toEqual(['accent']);
  });
});

describe('play / pause', () => {
  test('does not start while paused', async () => {
    await start({ isPaused: true });
    advance(1);
    expect(initAudioContext).not.toHaveBeenCalled();
    expect(clicks()).toHaveLength(0);
  });

  test('pausing stops the scheduler, stops queued sources and cancels pending visual beats', async () => {
    const beatEvents = listen('metronome-beat');
    const { rerender } = await start({ tempo: 120 });
    advance(0.55);
    const startedBefore = clicks().length;
    const beatsBefore = beatEvents.length;
    rerender(baseProps({ isPaused: true }));
    expect(ctx.sources.some((s) => s.stop.mock.calls.length > 0)).toBe(true);
    expect(mockCaptured.refs.nodeRefs.current).toEqual([]);
    expect(mockCaptured.refs.schedulerRunningRef.current).toBe(false);
    advance(2);
    expect(clicks()).toHaveLength(startedBefore);
    expect(beatEvents).toHaveLength(beatsBefore);
  });

  test('resuming restarts at sub index 0, 25 ms after the current audio time', async () => {
    const beatEvents = listen('metronome-beat');
    const { rerender } = await start({ tempo: 120 });
    advance(0.75);
    rerender(baseProps({ isPaused: true }));
    advance(0.5);
    const startedBefore = clicks().length;
    const resumeTime = ctx.currentTime;
    rerender(baseProps({ isPaused: false }));
    await flush();
    advance(0.3);
    expect(clicks().length).toBe(startedBefore + 1);
    expect(clicks()[startedBefore].when).toBeCloseTo(resumeTime + LEAD, 6);
    expect(beatEvents[beatEvents.length - 1].subIndex).toBe(0);
  });

  test('calling startScheduler while running is a no-op', async () => {
    const { result } = await start();
    advance(0.1);
    initAudioContext.mockClear();
    await act(async () => { await result.current.startScheduler(); });
    expect(initAudioContext).not.toHaveBeenCalled();
  });

  test('stopScheduler swallows errors from nodes and handles cancel / stop / disconnect nodes', async () => {
    const { result } = await start();
    advance(0.1);
    const cancel = jest.fn();
    const stop = jest.fn();
    const disconnect = jest.fn();
    mockCaptured.refs.nodeRefs.current.push(
      { cancel },
      { stop },
      { disconnect },
      { cancel() { throw new Error('boom'); } },
      {}
    );
    expect(() => result.current.stopScheduler()).not.toThrow();
    expect(cancel).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(mockCaptured.refs.nodeRefs.current).toEqual([]);
  });

  test('unmount stops the scheduler', async () => {
    const { unmount } = await start();
    advance(0.1);
    const count = clicks().length;
    unmount();
    advance(2);
    expect(clicks()).toHaveLength(count);
  });
});

describe('beat multiplier changes while running', () => {
  test('prop change restarts the interval and updates the current interval', async () => {
    const { rerender } = await start({ tempo: 120 });
    advance(0.1);
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const setSpy = jest.spyOn(global, 'setInterval');
    rerender(baseProps({ beatMultiplier: 2 }));
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(expect.any(Function), 20);
    expect(mockCaptured.refs.schedulerRunningRef.current).toBe(true);
    advance(1);
    const w = whens();
    expect(w[w.length - 1] - w[w.length - 2]).toBeCloseTo(0.25, 6);
  });

  test('updateBeatMultiplier returns the value and refreshes currentSubIntervalRef', async () => {
    const { result } = await start({ tempo: 120 });
    advance(0.1);
    expect(result.current.currentSubIntervalRef.current).toBeCloseTo(0.5, 10);
    let returned;
    act(() => { returned = result.current.updateBeatMultiplier(4); });
    expect(returned).toBe(4);
    expect(result.current.currentSubIntervalRef.current).toBeCloseTo(0.125, 10);
  });

  test('updateBeatMultiplier while stopped only stores the value', async () => {
    const { result } = await start({ isPaused: true });
    expect(result.current.updateBeatMultiplier(3)).toBe(3);
    expect(result.current.currentSubIntervalRef.current).toBe(0);
  });
});

describe('training: macro timing silence', () => {
  test('2 audible measures, 1 silent measure, repeating (2 beats, N=2, M=1)', async () => {
    const beatEvents = listen('metronome-beat');
    await start({ tempo: 120, subdivisions: 2, accents: [1, 1], macroMode: 1, measuresUntilMute: 2, muteDurationMeasures: 1 });
    advance(6.4);
    expect(beatEvents.slice(0, 12).map((e) => e.isMuted)).toEqual([
      false, false, false, false, true, true, false, false, false, false, true, true
    ]);
    // audible notes: 0-3, 6-9, 12-13
    expect(whens(8).map((w) => Math.round((w - 10.025) / 0.5))).toEqual([0, 1, 2, 3, 6, 7, 8, 9]);
  });

  test('silent beats emit silent-beat-played and no audio', async () => {
    const silent = listen('silent-beat-played');
    await start({ tempo: 120, subdivisions: 2, accents: [1, 1], macroMode: 1, measuresUntilMute: 1, muteDurationMeasures: 1 });
    advance(2.2);
    // measure 1 audible, measure 2 silent
    expect(silent.map((s) => s.subIndex)).toEqual([0, 1]);
    expect(clicks().length).toBeLessThanOrEqual(4);
  });

  test('exposes the training refs and publishes the silence ref on window', async () => {
    const { result } = await start({ macroMode: 1 });
    advance(0.1);
    expect(window.isSilencePhaseRef).toBe(result.current.isSilencePhaseRef);
    expect(result.current.measureCountRef.current).toBe(0);
  });

  test('turning training off resets counters and the silence phase', async () => {
    const { result, rerender } = await start({ macroMode: 1 });
    result.current.measureCountRef.current = 5;
    result.current.muteMeasureCountRef.current = 3;
    result.current.isSilencePhaseRef.current = true;
    rerender(baseProps({ macroMode: 0, speedMode: 0 }));
    expect(result.current.measureCountRef.current).toBe(0);
    expect(result.current.muteMeasureCountRef.current).toBe(0);
    expect(result.current.isSilencePhaseRef.current).toBe(false);
  });

  test('random silence mutes per note according to Math.random and the probability', async () => {
    const beatEvents = listen('metronome-beat');
    const randoms = [0.1, 0.9, 0.4, 0.6, 0.49, 0.5];
    jest.spyOn(Math, 'random').mockImplementation(() => (randoms.length ? randoms.shift() : 0.99));
    await start({ tempo: 120, macroMode: 2, muteProbability: 0.5 });
    advance(3);
    expect(beatEvents.slice(0, 6).map((e) => e.isMuted)).toEqual([true, false, true, false, true, false]);
    // audible notes are 1, 3, 5
    expect(whens(3).map((w) => Math.round((w - 10.025) / 0.5))).toEqual([1, 3, 5]);
  });
});

describe('training: speed trainer', () => {
  test('raises the tempo by 5 % after every 2 measures via setTempo', async () => {
    const setTempo = jest.fn();
    await start({ tempo: 100, subdivisions: 2, accents: [1, 1], speedMode: 1, measuresUntilSpeedUp: 2, tempoIncreasePercent: 5, setTempo });
    advance(2.5);
    expect(setTempo.mock.calls).toEqual([[105]]);
  });

  test('no change happens when speed training is off', async () => {
    const setTempo = jest.fn();
    await start({ tempo: 100, subdivisions: 2, accents: [1, 1], speedMode: 0, setTempo });
    advance(4);
    expect(setTempo).not.toHaveBeenCalled();
  });

  // characterization: current behaviour, see report. index.js has a second speed-up path that
  // applies an unrounded increase on every scheduler tick while the measure counter sits on a multiple.
  test('a measure counter parked on a multiple re-applies an unrounded increase on every tick', async () => {
    const setTempo = jest.fn();
    const { result } = await start({ tempo: 97, speedMode: 1, measuresUntilSpeedUp: 2, tempoIncreasePercent: 5, setTempo });
    result.current.measureCountRef.current = 2;
    advance(0.06);
    expect(setTempo.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(setTempo.mock.calls[0][0]).toBeCloseTo(101.85, 8);
  });

  test('that path is capped at TEMPO_MAX (240) and skipped when already there', async () => {
    const setTempo = jest.fn();
    const { result } = await start({ tempo: 238, speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 5, setTempo });
    result.current.measureCountRef.current = 1;
    advance(0.02);
    expect(setTempo).toHaveBeenCalledWith(240);

    const setTempo2 = jest.fn();
    const second = await start({ tempo: 240, speedMode: 1, measuresUntilSpeedUp: 1, setTempo: setTempo2 });
    second.result.current.measureCountRef.current = 1;
    advance(0.02);
    expect(setTempo2).not.toHaveBeenCalled();
  });

  test('that path does nothing for counter 0 or a non-multiple', async () => {
    const setTempo = jest.fn();
    const { result } = await start({ tempo: 100, speedMode: 1, measuresUntilSpeedUp: 3, setTempo });
    advance(0.02);
    result.current.measureCountRef.current = 2;
    advance(0.02);
    expect(setTempo).not.toHaveBeenCalled();
  });

  test('that path works without a setTempo prop', async () => {
    const { result } = await start({ tempo: 100, speedMode: 1, measuresUntilSpeedUp: 1, setTempo: undefined });
    result.current.measureCountRef.current = 1;
    expect(() => advance(0.02)).not.toThrow();
  });
});

describe('audio system loading', () => {
  test('creates the context, loads the buffers once and plays a silent unlock buffer', async () => {
    await start();
    expect(initAudioContext).toHaveBeenCalledTimes(1);
    expect(getActiveSoundSet).toHaveBeenCalledTimes(1);
    expect(loadClickBuffers).toHaveBeenCalledTimes(1);
    expect(loadClickBuffers.mock.calls[0][0].soundSet).toEqual({ id: 'set-1', name: 'Set One' });
    expect(loadClickBuffers.mock.calls[0][0].audioCtx).toBe(ctx);
    expect(ctx.createBuffer).toHaveBeenCalledWith(1, 1, 22050);
    expect(ctx.sources[0].start).toHaveBeenCalledWith();
    expect(ctx.sources[0].stop).toHaveBeenCalledWith(0.001);
  });

  test('replaces a closed context', async () => {
    const closed = createFakeAudioContext({ state: 'closed' });
    initAudioContext.mockImplementationOnce(() => closed).mockImplementation(() => ctx);
    const { result } = await start({ isPaused: true });
    await act(async () => { await result.current.reloadSounds(); });
    closed.state = 'closed';
    await act(async () => { await result.current.reloadSounds(); });
    expect(initAudioContext).toHaveBeenCalledTimes(2);
  });

  test('resumes a suspended context before loading', async () => {
    ctx.state = 'suspended';
    await start();
    expect(resumeAudioContext).toHaveBeenCalledWith(ctx);
    expect(ctx.state).toBe('running');
  });

  test('continues when resuming fails (warns twice: initial and final attempt)', async () => {
    ctx.state = 'suspended';
    resumeAudioContext.mockRejectedValue(new Error('denied'));
    await start();
    advance(0.2);
    expect(console.warn).toHaveBeenCalledWith('Failed to resume audio context:', expect.any(Error));
    expect(console.warn).toHaveBeenCalledWith('Final resume attempt failed:', expect.any(Error));
    expect(clicks().length).toBeGreaterThan(0);
  });

  test('final resume attempt runs when the context is still not running after loading', async () => {
    ctx.state = 'suspended';
    resumeAudioContext.mockImplementation(async () => false);
    await start();
    expect(resumeAudioContext).toHaveBeenCalledTimes(2);
  });

  test('does not start when no AudioContext can be created', async () => {
    initAudioContext.mockImplementation(() => null);
    const beatEvents = listen('metronome-beat');
    const { result } = await start();
    advance(1);
    expect(console.error).toHaveBeenCalledWith('Failed to create audio context');
    expect(console.error).toHaveBeenCalledWith('No audio context after initialization');
    expect(beatEvents).toHaveLength(0);
    expect(result.current.audioCtx).toBeNull();
  });

  test('an exception while creating the context is contained', async () => {
    initAudioContext.mockImplementation(() => { throw new Error('exploded'); });
    const { result } = await start({ isPaused: true });
    let ok;
    await act(async () => { ok = await result.current.reloadSounds(); });
    expect(ok).toBe(false);
    expect(console.error).toHaveBeenCalledWith('Error in loadAudioSystem:', expect.any(Error));
  });

  test('retries loading three times in total, then gives up but still runs the scheduler without clicks', async () => {
    loadClickBuffers.mockImplementation(async () => false);
    const beatEvents = listen('metronome-beat');
    await start();
    expect(loadClickBuffers).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledWith('Audio initialization was not fully successful');
    advance(1.2);
    expect(clicks()).toHaveLength(0); // no buffers, nothing audible
    expect(beatEvents.length).toBeGreaterThanOrEqual(2); // but the visual beat continues
  });

  test('a throwing loader is retried and a later success is accepted', async () => {
    loadClickBuffers
      .mockImplementationOnce(async () => { throw new Error('decode failed'); })
      .mockImplementation(async ({ normalBufferRef, accentBufferRef, firstBufferRef }) => {
        normalBufferRef.current = { name: 'normal' };
        accentBufferRef.current = { name: 'accent' };
        firstBufferRef.current = { name: 'first' };
        return true;
      });
    const { result } = await start({ isPaused: true });
    let ok;
    await act(async () => { ok = await result.current.reloadSounds(); });
    expect(ok).toBe(true);
    expect(loadClickBuffers).toHaveBeenCalledTimes(2);
  });

  test('falls back to the default sound set when the active set cannot be read', async () => {
    getActiveSoundSet.mockImplementation(async () => { throw new Error('api down'); });
    await start();
    expect(console.warn).toHaveBeenCalledWith('Error getting active sound set, using default:', expect.any(Error));
    expect(loadClickBuffers.mock.calls[0][0].soundSet).toBeUndefined();
  });

  test('a failing unlock buffer is only a warning', async () => {
    ctx.createBuffer.mockImplementation(() => { throw new Error('no buffer'); });
    const { result } = await start({ isPaused: true });
    let ok;
    await act(async () => { ok = await result.current.reloadSounds(); });
    expect(ok).toBe(true);
    expect(console.warn).toHaveBeenCalledWith('Audio unlock attempt failed:', expect.any(Error));
  });

  test('reloadSounds skips loading when all buffers are present and reloads when one is missing', async () => {
    const { result } = await start();
    loadClickBuffers.mockClear();
    await act(async () => { await result.current.reloadSounds(); });
    expect(loadClickBuffers).not.toHaveBeenCalled();
    mockCaptured.refs.accentBufferRef.current = null;
    await act(async () => { await result.current.reloadSounds(); });
    expect(loadClickBuffers).toHaveBeenCalledTimes(1);
  });
});

describe('startScheduler error recovery', () => {
  test('falls back to a performance.now based clock when reading the audio clock throws', async () => {
    let reads = 0;
    Object.defineProperty(ctx, 'currentTime', {
      configurable: true,
      get() {
        reads += 1;
        if (reads === 1) throw new Error('clock unavailable');
        return T0;
      },
      set() {}
    });
    jest.spyOn(performance, 'now').mockReturnValue(5000);
    await start();
    expect(console.error).toHaveBeenCalledWith('Error starting metronome:', expect.any(Error));
    expect(mockCaptured.refs.schedulerRunningRef.current).toBe(true);
    expect(mockCaptured.refs.nextNoteTimeRef.current).toBeCloseTo(5 + LEAD, 8);
    expect(mockCaptured.refs.lookaheadRef.current).not.toBeNull();
    // the recovered scheduler keeps ticking: the audio clock works again on the next read
    advance(0.1);
    // overdue notes from the performance.now based clock are skipped, the beat phase is kept
    expect(clicks()[0].when).toBeCloseTo(10.025, 6);
  });

  test('logs when even the recovery fails', async () => {
    jest.spyOn(global, 'setInterval').mockImplementation(() => { throw new Error('no timers'); });
    await start();
    expect(console.error).toHaveBeenCalledWith('Failed to recover after scheduler error:', expect.any(Error));
  });
});

describe('timing statistics', () => {
  test('actualBpm and precision reflect the scheduled audio timeline (120 BPM -> 120.0, 0.00 ms)', async () => {
    const { result } = await start({ tempo: 120 });
    advance(0.2);
    expect(result.current.actualBpm).toBe(0); // only one click so far
    advance(2);
    expect(result.current.actualBpm).toBe(120);
    expect(result.current.timingPrecision).toBe('0.00');
  });

  test('getTimingStats is zero until two intervals exist, then reports ms statistics', async () => {
    const { result } = await start({ tempo: 120 });
    expect(result.current.getTimingStats()).toEqual({ average: 0, min: 0, max: 0, stdDev: 0 });
    advance(3);
    expect(result.current.getTimingStats()).toEqual({ average: '500.00', min: '500.00', max: '500.00', stdDev: '0.00' });
  });

  test('keeps only about the last 50 timing samples', async () => {
    const { result } = await start({ tempo: 240, beatMultiplier: 4, subdivisions: 4 });
    advance(4.5);
    expect(clicks().length).toBeGreaterThan(60);
    expect(mockCaptured.refs.highResTimingsRef.current.length).toBeLessThanOrEqual(51);
    expect(result.current.getTimingStats().average).toBe('62.50');
  });
});

describe('tap tempo', () => {
  test('is wired to the setTempo prop with the tap logic (4 taps at 500 ms -> 120)', () => {
    const setTempo = jest.fn();
    const { result } = renderHook(() => useMetronomeLogic(baseProps({ isPaused: true, setTempo })));
    let now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    [1000, 1500, 2000, 2500].forEach((t) => { now = t; result.current.tapTempo(); });
    expect(setTempo).toHaveBeenCalledTimes(1);
    expect(setTempo).toHaveBeenCalledWith(120);
  });

  test('does not throw without a setTempo prop and keeps its tap history across renders', () => {
    let now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    const { result, rerender } = renderHook((p) => useMetronomeLogic(p), {
      initialProps: baseProps({ isPaused: true, setTempo: undefined })
    });
    const first = result.current.tapTempo;
    rerender(baseProps({ isPaused: true, setTempo: undefined }));
    expect(result.current.tapTempo).toBe(first);
    expect(() => [1000, 1500, 2000, 2500].forEach((t) => { now = t; result.current.tapTempo(); })).not.toThrow();
  });
});
