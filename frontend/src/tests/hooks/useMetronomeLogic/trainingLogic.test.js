import {
  forceTrainingUpdate,
  shouldMuteThisBeat,
  handleMeasureBoundary,
  manualTempoAcceleration
} from '../../../hooks/useMetronomeLogic/trainingLogic';
import { silenceConsole } from '../../helpers/metronome-fakeAudio';

let restoreConsole;
beforeEach(() => {
  restoreConsole = silenceConsole();
});
afterEach(() => {
  restoreConsole();
  delete window.isSilencePhaseRef;
  delete window.forceTrainingUpdate;
  jest.restoreAllMocks();
});

describe('forceTrainingUpdate', () => {
  test('dispatches window, document and force events with merged detail', () => {
    const onMeasure = jest.fn();
    const onState = jest.fn();
    const onForce = jest.fn();
    window.addEventListener('training-measure-update', onMeasure);
    document.addEventListener('training-state-changed', onState);
    window.addEventListener('force-training-update', onForce);
    window.isSilencePhaseRef = { current: true };

    forceTrainingUpdate({ event: 'x' });

    for (const fn of [onMeasure, onState, onForce]) {
      expect(fn).toHaveBeenCalledTimes(1);
      const { detail } = fn.mock.calls[0][0];
      expect(detail.event).toBe('x');
      expect(detail.silencePhase).toBe(true);
      expect(typeof detail.timestamp).toBe('number');
    }
    window.removeEventListener('training-measure-update', onMeasure);
    document.removeEventListener('training-state-changed', onState);
    window.removeEventListener('force-training-update', onForce);
  });

  test('calls the global window.forceTrainingUpdate hook when present', () => {
    window.forceTrainingUpdate = jest.fn();
    forceTrainingUpdate();
    expect(window.forceTrainingUpdate).toHaveBeenCalledTimes(1);
  });

  test('swallows dispatch errors and warns', () => {
    jest.spyOn(window, 'dispatchEvent').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => forceTrainingUpdate()).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith(
      '[Training] Error forcing update:',
      expect.any(Error)
    );
  });
});

describe('shouldMuteThisBeat', () => {
  test('mode 0 never mutes and ignores the silence ref', () => {
    expect(shouldMuteThisBeat({ macroMode: 0, isSilencePhaseRef: { current: true } })).toBe(false);
    expect(window.isSilencePhaseRef).toBeUndefined();
  });

  test('mode 1 mutes exactly while the silence phase is active', () => {
    const ref = { current: false };
    expect(shouldMuteThisBeat({ macroMode: 1, isSilencePhaseRef: ref })).toBe(false);
    ref.current = true;
    expect(shouldMuteThisBeat({ macroMode: 1, isSilencePhaseRef: ref })).toBe(true);
    expect(window.isSilencePhaseRef).toBe(ref);
  });

  test('mode 1 without a ref does not mute', () => {
    expect(shouldMuteThisBeat({ macroMode: 1 })).toBe(false);
  });

  test.each([
    [0.29, 0.3, true],
    [0.3, 0.3, false], // strict less-than: boundary does not mute
    [0.0, 0.3, true],
    [0.99, 0.5, false]
  ])('mode 2: random %f with probability %f -> %s', (random, probability, expected) => {
    jest.spyOn(Math, 'random').mockReturnValue(random);
    const ref = { current: false };
    expect(shouldMuteThisBeat({ macroMode: 2, muteProbability: probability, isSilencePhaseRef: ref })).toBe(expected);
    expect(ref.current).toBe(expected);
  });

  test('mode 2 falls back to probability 0.3 when none is given', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    expect(shouldMuteThisBeat({ macroMode: 2 })).toBe(true);
    Math.random.mockReturnValue(0.4);
    expect(shouldMuteThisBeat({ macroMode: 2, muteProbability: 0 })).toBe(false); // 0 is falsy -> 0.3
    Math.random.mockReturnValue(0.2);
    expect(shouldMuteThisBeat({ macroMode: 2, muteProbability: 0 })).toBe(true); // characterization: current behaviour, see report
  });

  test('mode 2 only fires a UI update when the silence state changes', () => {
    const onForce = jest.fn();
    window.addEventListener('force-training-update', onForce);
    const ref = { current: false };
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    shouldMuteThisBeat({ macroMode: 2, muteProbability: 0.5, isSilencePhaseRef: ref });
    shouldMuteThisBeat({ macroMode: 2, muteProbability: 0.5, isSilencePhaseRef: ref });
    expect(onForce).toHaveBeenCalledTimes(1);
    expect(onForce.mock.calls[0][0].detail).toMatchObject({ mode: 'random', value: true });
    Math.random.mockReturnValue(0.9);
    shouldMuteThisBeat({ macroMode: 2, muteProbability: 0.5, isSilencePhaseRef: ref });
    expect(onForce).toHaveBeenCalledTimes(2);
    expect(ref.current).toBe(false);
    window.removeEventListener('force-training-update', onForce);
  });

  test('unknown mode does not mute', () => {
    expect(shouldMuteThisBeat({ macroMode: 7, isSilencePhaseRef: { current: true } })).toBe(false);
  });
});

describe('handleMeasureBoundary: macro timing silence', () => {
  function setup(overrides = {}) {
    return {
      macroMode: 1,
      speedMode: 0,
      measureCountRef: { current: 0 },
      muteMeasureCountRef: { current: 0 },
      isSilencePhaseRef: { current: false },
      measuresUntilMute: 2,
      muteDurationMeasures: 1,
      setTempo: jest.fn(),
      tempoRef: { current: 100 },
      tempoIncreasePercent: 5,
      measuresUntilSpeedUp: 2,
      ...overrides
    };
  }

  test('is a no-op returning true when both modes are off', () => {
    const cfg = setup({ macroMode: 0, speedMode: 0 });
    expect(handleMeasureBoundary(cfg)).toBe(true);
    expect(cfg.measureCountRef.current).toBe(0);
  });

  test('plays N measures, is silent for M measures, then resets (N=2, M=1)', () => {
    const cfg = setup();
    const timeline = [];
    for (let i = 1; i <= 7; i += 1) {
      handleMeasureBoundary(cfg);
      timeline.push([
        cfg.measureCountRef.current,
        cfg.muteMeasureCountRef.current,
        cfg.isSilencePhaseRef.current
      ]);
    }
    expect(timeline).toEqual([
      [1, 0, false],
      [2, 0, true], // silence starts at the boundary where count reaches N
      [0, 0, false], // next boundary: one silent measure done -> audible again, counters reset
      [1, 0, false],
      [2, 0, true],
      [0, 0, false],
      [1, 0, false]
    ]);
  });

  test('longer silence (M=3) counts mute measures and ends exactly at M', () => {
    const cfg = setup({ measuresUntilMute: 1, muteDurationMeasures: 3 });
    handleMeasureBoundary(cfg); // count 1 -> silence on
    expect(cfg.isSilencePhaseRef.current).toBe(true);
    handleMeasureBoundary(cfg);
    expect(cfg.muteMeasureCountRef.current).toBe(1);
    handleMeasureBoundary(cfg);
    expect(cfg.muteMeasureCountRef.current).toBe(2);
    expect(cfg.isSilencePhaseRef.current).toBe(true);
    handleMeasureBoundary(cfg);
    expect(cfg.isSilencePhaseRef.current).toBe(false);
    expect(cfg.muteMeasureCountRef.current).toBe(0);
    expect(cfg.measureCountRef.current).toBe(0);
  });

  test('fires silence-start and silence-end events with previous/new state', () => {
    const onForce = jest.fn();
    window.addEventListener('force-training-update', onForce);
    const cfg = setup({ measuresUntilMute: 1 });
    handleMeasureBoundary(cfg);
    handleMeasureBoundary(cfg);
    const details = onForce.mock.calls.map((c) => c[0].detail);
    expect(details).toContainEqual(expect.objectContaining({ event: 'silence-start', prevState: false, newState: true }));
    expect(details).toContainEqual(expect.objectContaining({ event: 'silence-end', prevState: true, newState: false }));
    window.removeEventListener('force-training-update', onForce);
  });

  test('publishes the silence ref on window', () => {
    const cfg = setup();
    handleMeasureBoundary(cfg);
    expect(window.isSilencePhaseRef).toBe(cfg.isSilencePhaseRef);
  });

  test('works without optional refs (no mute counter, no measure counter)', () => {
    const cfg = setup({ measureCountRef: undefined, muteMeasureCountRef: undefined });
    expect(handleMeasureBoundary(cfg)).toBe(true);
    // never enters silence without a measure counter
    expect(cfg.isSilencePhaseRef.current).toBe(false);
    cfg.isSilencePhaseRef.current = true;
    expect(handleMeasureBoundary(cfg)).toBe(true);
    expect(cfg.isSilencePhaseRef.current).toBe(true); // cannot end without mute counter
  });

  test('macro mode 2 only counts measures and never toggles silence itself', () => {
    const cfg = setup({ macroMode: 2 });
    handleMeasureBoundary(cfg);
    handleMeasureBoundary(cfg);
    handleMeasureBoundary(cfg);
    expect(cfg.measureCountRef.current).toBe(3);
    expect(cfg.isSilencePhaseRef.current).toBe(false);
  });

  test('macro mode 1 without a silence ref only counts measures', () => {
    const cfg = setup({ isSilencePhaseRef: undefined });
    expect(handleMeasureBoundary(cfg)).toBe(true);
    expect(cfg.measureCountRef.current).toBe(1);
  });
});

describe('handleMeasureBoundary: speed trainer', () => {
  function speedCfg(tempo, overrides = {}) {
    return {
      macroMode: 0,
      speedMode: 1,
      measureCountRef: { current: 0 },
      muteMeasureCountRef: { current: 0 },
      isSilencePhaseRef: { current: false },
      setTempo: jest.fn(),
      tempoRef: { current: tempo },
      tempoIncreasePercent: 5,
      measuresUntilSpeedUp: 2,
      ...overrides
    };
  }

  test('does not change tempo before N measures, then raises it and resets the counter', () => {
    const cfg = speedCfg(100);
    handleMeasureBoundary(cfg);
    expect(cfg.setTempo).not.toHaveBeenCalled();
    expect(cfg.measureCountRef.current).toBe(1);
    handleMeasureBoundary(cfg);
    expect(cfg.setTempo).toHaveBeenCalledTimes(1);
    expect(cfg.setTempo).toHaveBeenCalledWith(105);
    expect(cfg.measureCountRef.current).toBe(0);
  });

  test.each([
    // tempo, percent, expected
    [100, 5, 105],
    [97, 5, 102], // round(101.85)
    [40, 1, null], // round(40.4)=40 -> no change
    [50, 1, 51], // round(50.5)=51 (Math.round half up)
    [100, 50, 105], // capped to +5 BPM
    [178, 5, 180], // capped at 180
    [180, 5, null], // already at the training ceiling
    [200, 5, null], // above ceiling: never lowered
    [240, 5, null]
  ])('tempo %i with +%i%% -> %s', (tempo, percent, expected) => {
    const cfg = speedCfg(tempo, { tempoIncreasePercent: percent, measuresUntilSpeedUp: 1 });
    handleMeasureBoundary(cfg);
    expect(cfg.setTempo.mock.calls).toEqual(expected === null ? [] : [[expected]]);
    // the counter resets even when the tempo did not change
    expect(cfg.measureCountRef.current).toBe(0);
  });

  test('skips the speed-up while in the silence phase and keeps counting', () => {
    const cfg = speedCfg(100, { measuresUntilSpeedUp: 1 });
    cfg.isSilencePhaseRef.current = true;
    handleMeasureBoundary(cfg);
    expect(cfg.setTempo).not.toHaveBeenCalled();
    expect(cfg.measureCountRef.current).toBe(1);
  });

  test('without setTempo or tempoRef the counter is still reset', () => {
    const cfg = speedCfg(100, { measuresUntilSpeedUp: 1, setTempo: undefined });
    expect(handleMeasureBoundary(cfg)).toBe(true);
    expect(cfg.measureCountRef.current).toBe(0);
    const cfg2 = speedCfg(100, { measuresUntilSpeedUp: 1, tempoRef: undefined });
    expect(handleMeasureBoundary(cfg2)).toBe(true);
    expect(cfg2.setTempo).not.toHaveBeenCalled();
    expect(cfg2.measureCountRef.current).toBe(0);
  });

  test('works without any silence ref', () => {
    const cfg = speedCfg(100, { measuresUntilSpeedUp: 1, isSilencePhaseRef: undefined });
    handleMeasureBoundary(cfg);
    expect(cfg.setTempo).toHaveBeenCalledWith(105);
  });

  test('without a measure counter the speed trainer never fires', () => {
    const cfg = speedCfg(100, { measureCountRef: undefined });
    handleMeasureBoundary(cfg);
    expect(cfg.setTempo).not.toHaveBeenCalled();
  });

  test('emits a measure-boundary update when counters changed', () => {
    const onForce = jest.fn();
    window.addEventListener('force-training-update', onForce);
    handleMeasureBoundary(speedCfg(100));
    expect(onForce.mock.calls.map((c) => c[0].detail.event)).toContain('measure-boundary');
    window.removeEventListener('force-training-update', onForce);
  });

  test('macro silence and speed-up can combine: speed-up waits until silence ends', () => {
    const cfg = speedCfg(100, {
      macroMode: 1,
      measuresUntilMute: 2,
      muteDurationMeasures: 1,
      measuresUntilSpeedUp: 2
    });
    handleMeasureBoundary(cfg); // count 1
    handleMeasureBoundary(cfg); // count 2 -> silence starts, speed-up skipped (silent)
    expect(cfg.isSilencePhaseRef.current).toBe(true);
    expect(cfg.setTempo).not.toHaveBeenCalled();
    handleMeasureBoundary(cfg); // silence ends, counters reset, count 0 -> no speed-up yet
    expect(cfg.isSilencePhaseRef.current).toBe(false);
    expect(cfg.setTempo).not.toHaveBeenCalled();
  });
});

describe('manualTempoAcceleration', () => {
  test.each([
    [100, 5, 105],
    [100, 10, 110],
    [100, 50, 110], // capped to +10 BPM
    [175, 10, 180], // capped at 180
    [180, 10, 180],
    [200, 10, 180] // characterization: current behaviour, see report (lowers tempo above 180)
  ])('tempo %i with +%i%% -> %i', (tempo, percent, expected) => {
    const setTempo = jest.fn();
    const result = manualTempoAcceleration({ tempoIncreasePercent: percent, tempoRef: { current: tempo }, setTempo });
    expect(result).toBe(expected);
    expect(setTempo).toHaveBeenCalledWith(expected);
  });

  test('defaults to +5% when no percentage is given (0 included)', () => {
    const setTempo = jest.fn();
    expect(manualTempoAcceleration({ tempoRef: { current: 100 }, setTempo })).toBe(105);
    expect(manualTempoAcceleration({ tempoIncreasePercent: 0, tempoRef: { current: 100 }, setTempo })).toBe(105);
  });

  test('emits a manual-tempo-increase update with old and new tempo', () => {
    const onForce = jest.fn();
    window.addEventListener('force-training-update', onForce);
    manualTempoAcceleration({ tempoIncreasePercent: 5, tempoRef: { current: 100 }, setTempo: jest.fn() });
    expect(onForce.mock.calls[0][0].detail).toMatchObject({
      event: 'manual-tempo-increase',
      oldTempo: 100,
      newTempo: 105
    });
    window.removeEventListener('force-training-update', onForce);
  });

  test('throws on invalid refs', () => {
    expect(() => manualTempoAcceleration({ tempoRef: { current: undefined }, setTempo: jest.fn() })).toThrow('Invalid tempoRef');
    expect(() => manualTempoAcceleration({ tempoRef: { current: 100 } })).toThrow('setTempo must be a function');
  });
});
