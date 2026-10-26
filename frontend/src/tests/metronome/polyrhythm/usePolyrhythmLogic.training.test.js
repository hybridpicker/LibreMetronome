import { act, cleanup } from '@testing-library/react';
import { initAudioContext, loadClickBuffers } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../services/soundSetService';
import { createFakeContext, startedHits, loadBuffersInto } from '../../helpers/polyrhythm-audio';
import { advance, mountPolyrhythm, silenceConsole, clearGlobals } from '../../helpers/polyrhythm-harness';

jest.mock('../../../hooks/useMetronomeLogic/audioBuffers');
jest.mock('../../../services/soundSetService', () => ({ getActiveSoundSet: jest.fn(async () => null) }));

const T0 = 0.21; // 10 ms isPaused debounce + 0.2 s start lead

// 2 inner / 2 outer at 120 BPM -> one measure is exactly 1 s
const SMALL = { innerBeats: 2, outerBeats: 2, innerAccents: [3, 1], outerAccents: [3, 1] };

function captureEvents(name) {
  const events = [];
  const listener = e => events.push(e.detail);
  window.addEventListener(name, listener);
  return { events, stop: () => window.removeEventListener(name, listener) };
}

describe('usePolyrhythmLogic training', () => {
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
    jest.restoreAllMocks();
    jest.clearAllMocks();
    clearGlobals();
  });

  test('fixed silence: plays N measures, mutes M measures, then plays again', async () => {
    const silent = captureEvents('silent-beat-played');
    const { ctx, result } = mountPolyrhythm({
      ...SMALL, isPaused: false, macroMode: 1, measuresUntilMute: 2, muteDurationMeasures: 1
    });
    // measure k is scheduled at T0 + k - 0.1; run into measure 3 scheduling
    await advance(ctx, 3800);
    silent.stop();

    const starts = startedHits(ctx).map(h => Number((h.time - T0).toFixed(3)));
    const measuresPlayed = [...new Set(starts.map(t => Math.floor(t + 1e-6)))];
    // measures 0 and 1 play, measure 2 is the silence phase, measure 3 plays again
    expect(measuresPlayed).toEqual([0, 1, 3]);
    // two downbeat hits (inner + outer) and one second beat each per measure
    expect(starts.filter(t => Math.floor(t + 1e-6) === 0)).toHaveLength(4);

    // silence measure: one 'both' event for the downbeats and one 'muted' per remaining beat
    expect(silent.events.map(e => e.circle)).toEqual(['both', 'inner', 'outer']);
    expect(silent.events[0].subIndex).toBe(0);
    expect(silent.events[0].when).toBeCloseTo(T0 + 2, 6);
    expect(result.current.isSilencePhaseRef.current).toBe(false);
  });

  test('training counters are published through events and the global ref', async () => {
    const updates = captureEvents('training-measure-update');
    const { ctx, result } = mountPolyrhythm({
      ...SMALL, isPaused: false, macroMode: 1, measuresUntilMute: 2, muteDurationMeasures: 2
    });
    await advance(ctx, 1700); // measures 0 and 1 scheduled -> silence phase begins
    updates.stop();
    expect(result.current.isSilencePhaseRef.current).toBe(true);
    expect(window.isSilencePhaseRef).toBe(result.current.isSilencePhaseRef);
    expect(result.current.measureCountRef.current).toBe(2);
    expect(updates.events.some(d => d.isSilencePhase === true && d.measureCount === 2)).toBe(true);
    expect(updates.events[0]).toEqual(expect.objectContaining({
      measureCount: expect.any(Number), muteMeasureCount: expect.any(Number), timestamp: expect.any(Number)
    }));
  });

  test('silence phase lasting two measures counts mute measures and resets the cycle', async () => {
    const { ctx, result } = mountPolyrhythm({
      ...SMALL, isPaused: false, macroMode: 1, measuresUntilMute: 1, muteDurationMeasures: 2
    });
    // measure 0 plays (count 1 -> silence), measure 1 silent (mute 1), measure 2 silent (mute 2 -> ends)
    await advance(ctx, 2000);
    expect(result.current.isSilencePhaseRef.current).toBe(true);
    expect(result.current.muteMeasureCountRef.current).toBe(1);
    await advance(ctx, 1000);
    expect(result.current.isSilencePhaseRef.current).toBe(false);
    expect(result.current.muteMeasureCountRef.current).toBe(0);
    expect(result.current.measureCountRef.current).toBe(0);
  });

  test('random silence mutes by probability', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const { ctx } = mountPolyrhythm({ ...SMALL, isPaused: false, macroMode: 2, muteProbability: 0.5 });
    await advance(ctx, 1500);
    expect(ctx.sources).toHaveLength(0);
    Math.random.mockReturnValue(0.9);
    await advance(ctx, 1500);
    expect(startedHits(ctx).length).toBeGreaterThan(0);
  });

  test('auto speed-up raises the tempo after the configured number of measures', async () => {
    const tempoEvents = captureEvents('metronome-set-tempo');
    const { ctx, result } = mountPolyrhythm({
      ...SMALL, isPaused: false, speedMode: 1, measuresUntilSpeedUp: 2, tempoIncreasePercent: 10
    });
    await advance(ctx, 1700); // two measures scheduled
    tempoEvents.stop();
    expect(tempoEvents.events).toEqual([{ tempo: 132 }]);
    expect(result.current.actualBpm).toBe(132);
    expect(result.current.measureCountRef.current).toBe(0);

    await advance(ctx, 1500);
    const downbeats = startedHits(ctx).filter(h => h.buffer === 'first').map(h => h.time);
    const starts = [...new Set(downbeats.map(t => Number(t.toFixed(6))))].sort((a, b) => a - b);
    // characterization: current behaviour, see report. Measure starts are computed as
    // startTime + n * currentMeasureDuration, so after the tempo change the grid is re-based on
    // the origin: measure 2 begins only 2*(60/132)*2 - 1.0 s after measure 1 instead of a full measure.
    const newMeasure = 2 * 60 / 132;
    expect(starts[1] - starts[0]).toBeCloseTo(1, 6);
    expect(starts[2] - starts[1]).toBeCloseTo(2 * newMeasure - 1, 6);
    expect(starts[3] - starts[2]).toBeCloseTo(newMeasure, 6);
  });

  test('auto speed-up is capped at 240 BPM and does nothing when the tempo cannot change', async () => {
    const tempoEvents = captureEvents('metronome-set-tempo');
    const { ctx } = mountPolyrhythm({
      ...SMALL, tempo: 240, isPaused: false, speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 5
    });
    await advance(ctx, 1500);
    tempoEvents.stop();
    expect(tempoEvents.events).toEqual([]);
  });

  test('auto speed-up never raises the tempo beyond 240 in one step', async () => {
    const tempoEvents = captureEvents('metronome-set-tempo');
    const { ctx } = mountPolyrhythm({
      ...SMALL, tempo: 230, isPaused: false, speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 50
    });
    await advance(ctx, 600);
    tempoEvents.stop();
    expect(tempoEvents.events[0]).toEqual({ tempo: 240 });
  });

  test('no speed-up happens during a silence phase', async () => {
    const tempoEvents = captureEvents('metronome-set-tempo');
    const { ctx } = mountPolyrhythm({
      ...SMALL, isPaused: false, macroMode: 1, measuresUntilMute: 1, muteDurationMeasures: 5,
      speedMode: 1, measuresUntilSpeedUp: 2, tempoIncreasePercent: 10
    });
    await advance(ctx, 3000);
    tempoEvents.stop();
    expect(tempoEvents.events).toEqual([]);
  });

  test('training state is polled every 300 ms for late listeners', async () => {
    const updates = captureEvents('training-measure-update');
    const docEvents = [];
    const docListener = e => docEvents.push(e.detail);
    document.addEventListener('training-state-changed', docListener);
    const { ctx } = mountPolyrhythm({ ...SMALL, isPaused: true });
    updates.events.length = 0;
    await advance(ctx, 900);
    document.removeEventListener('training-state-changed', docListener);
    updates.stop();
    expect(updates.events).toHaveLength(3);
    expect(docEvents).toHaveLength(3);
  });
});

describe('usePolyrhythmLogic tap tempo', () => {
  let now;
  beforeEach(() => {
    jest.useFakeTimers();
    silenceConsole();
    now = 10000;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    clearGlobals();
  });

  const tapAll = (result, gaps) => {
    const out = [];
    out.push(result.current.tapTempo());
    gaps.forEach(gap => {
      now += gap;
      out.push(result.current.tapTempo());
    });
    return out;
  };

  test('first tap only records, second tap sets the tempo from the interval', () => {
    const setTempo = jest.fn();
    const sets = captureEvents('metronome-set-tempo');
    const { result } = mountPolyrhythm({ isPaused: true, setTempo });
    expect(tapAll(result, [500])).toEqual([null, 120]);
    sets.stop();
    expect(setTempo).toHaveBeenCalledWith(120);
    expect(sets.events).toEqual([{ tempo: 120 }]);
  });

  test('the tempo is also usable without a setTempo callback', () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    expect(tapAll(result, [600])).toEqual([null, 100]);
  });

  test('three taps average the intervals', () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    expect(tapAll(result, [400, 600])[2]).toBe(120);
  });

  test('four and five taps use the plain average', () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    const out = tapAll(result, [500, 500, 500, 500]);
    expect(out.slice(3)).toEqual([120, 120]);
  });

  test('six taps drop fastest and slowest, snap to a common tempo and clamp', () => {
    const setTempo = jest.fn();
    const { result } = mountPolyrhythm({ isPaused: true, setTempo });
    // intervals: 100(outlier fast), 508, 510, 506, 900(outlier slow) -> filtered avg 508 -> 118.1 BPM -> snaps to 120
    const out = tapAll(result, [100, 508, 510, 506, 900]);
    expect(out[5]).toBe(120);
    expect(setTempo).toHaveBeenLastCalledWith(120);
  });

  test('six taps away from a common tempo keep the rounded value', () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    // filtered avg 800 ms -> 75 BPM
    const out = tapAll(result, [790, 800, 810, 800, 800]);
    expect(out[5]).toBe(75);
  });

  test('very fast taps are clamped to 240 BPM', () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    const out = tapAll(result, [100, 100, 100, 100, 100]);
    expect(out[5]).toBe(240);
  });

  test('only the last six taps count', () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    // first interval is far off; once the 7th tap arrives the 1st tap is dropped
    const out = tapAll(result, [1900, 500, 500, 500, 500, 500]);
    expect(out[6]).toBe(120);
  });

  test('a pause longer than two seconds restarts the measurement', () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    expect(tapAll(result, [500])).toEqual([null, 120]);
    now += 2001;
    expect(result.current.tapTempo()).toBeNull();
    now += 1000;
    expect(result.current.tapTempo()).toBe(60);
  });

  test('a 2000 ms gap is still accepted and gives 30 BPM', () => {
    const { result } = mountPolyrhythm({ isPaused: true });
    expect(tapAll(result, [2000])).toEqual([null, 30]);
  });
});

describe('usePolyrhythmLogic reloadSounds', () => {
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

  test('reloads the buffers for the active sound set', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: true });
    await advance(ctx, 5); // let the mount-time load settle
    loadClickBuffers.mockClear();
    getActiveSoundSet.mockResolvedValue({ id: 'new' });
    let ok;
    await act(async () => { ok = await result.current.reloadSounds(); });
    expect(ok).toBe(true);
    expect(loadClickBuffers).toHaveBeenCalledTimes(1);
    expect(loadClickBuffers.mock.calls[0][0].soundSet).toEqual({ id: 'new' });
  });

  test('re-creates a closed audio context before loading', async () => {
    const ctx = createFakeContext();
    const { result } = mountPolyrhythm({ isPaused: true }, ctx);
    const fresh = createFakeContext();
    ctx.state = 'closed';
    initAudioContext.mockReturnValue(fresh);
    await act(async () => { await result.current.reloadSounds(); });
    expect(loadClickBuffers.mock.calls[loadClickBuffers.mock.calls.length - 1][0].audioCtx).toBe(fresh);
  });

  test('falls back to the default sounds when the sound set fails', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: true });
    await advance(ctx, 5); // let the mount-time load settle
    loadClickBuffers.mockClear();
    getActiveSoundSet.mockRejectedValue(new Error('x'));
    let ok;
    await act(async () => { ok = await result.current.reloadSounds(); });
    expect(ok).toBe(true);
    expect(loadClickBuffers).toHaveBeenCalledTimes(1);
    expect(loadClickBuffers.mock.calls[0][0]).not.toHaveProperty('soundSet');
  });

  test('reports false when even the fallback fails', async () => {
    const { ctx, result } = mountPolyrhythm({ isPaused: true });
    await advance(ctx, 5);
    loadClickBuffers.mockReset();
    loadClickBuffers.mockRejectedValue(new Error('nope'));
    let ok;
    await act(async () => { ok = await result.current.reloadSounds(); });
    expect(ok).toBe(false);
    expect(spies[2]).toHaveBeenCalledWith('Failed to load fallback sounds:', expect.any(Error));
  });

  test('loadBuffersInto helper fills all three buffer refs', () => {
    const refs = { normalBufferRef: {}, accentBufferRef: {}, firstBufferRef: {} };
    loadBuffersInto(refs);
    expect(refs.firstBufferRef.current.name).toBe('first');
  });
});

describe('usePolyrhythmLogic UI callbacks', () => {
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

  test('beat callbacks and highlighted subdivisions follow the audio time of each hit', async () => {
    const onInner = jest.fn();
    const onOuter = jest.fn();
    const firstBeats = captureEvents('polyrhythm-first-beat');
    const { ctx, result } = mountPolyrhythm({
      ...SMALL, innerBeats: 3, innerAccents: [3, 1, 1], isPaused: false,
      onInnerBeatTriggered: onInner, onOuterBeatTriggered: onOuter
    });
    await advance(ctx, 230); // jest clock 0.23: the downbeat animation timer (due at 0.21) has fired
    expect(onInner).toHaveBeenCalledWith(0);
    expect(onOuter).toHaveBeenCalledWith(0);
    // highlight is set for the current beat then cleared after the 40 ms animation window
    await advance(ctx, 600);
    expect(onInner.mock.calls.map(c => c[0])).toEqual([0, 1]);
    expect(result.current.innerCurrentSubdivision).toBe(-1);
    firstBeats.stop();
    expect(firstBeats.events.length).toBeGreaterThanOrEqual(1);
    expect(firstBeats.events[0]).toEqual(expect.objectContaining({ bpm: 120, innerBeats: 3 }));
  });
});
