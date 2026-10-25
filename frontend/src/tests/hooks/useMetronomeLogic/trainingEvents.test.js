// Which UI events handleMeasureBoundary / forceTrainingUpdate dispatch (found by mutation testing).
import { handleMeasureBoundary, forceTrainingUpdate } from '../../../hooks/useMetronomeLogic/trainingLogic';
import { silenceConsole } from '../../helpers/metronome-fakeAudio';

const ref = (current) => ({ current });

describe('training UI events', () => {
  let restoreConsole;
  let updates;
  const onUpdate = (event) => updates.push(event.detail);

  beforeEach(() => {
    restoreConsole = silenceConsole();
    updates = [];
    window.addEventListener('training-measure-update', onUpdate);
  });

  afterEach(() => {
    window.removeEventListener('training-measure-update', onUpdate);
    delete window.isSilencePhaseRef;
    restoreConsole();
  });

  const boundary = (overrides) => handleMeasureBoundary({
    macroMode: 0,
    speedMode: 0,
    measureCountRef: null,
    measuresUntilMute: 2,
    isSilencePhaseRef: null,
    muteMeasureCountRef: null,
    muteDurationMeasures: 1,
    setTempo: jest.fn(),
    tempoRef: ref(100),
    tempoIncreasePercent: 5,
    measuresUntilSpeedUp: 2,
    ...overrides
  });

  test('forceTrainingUpdate also dispatches a bubbling training-state-changed event on the document', () => {
    const seen = jest.fn();
    window.addEventListener('training-state-changed', seen);
    forceTrainingUpdate({ event: 'x' });
    window.removeEventListener('training-state-changed', seen);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0][0].detail).toMatchObject({ event: 'x' });
  });

  test('forceTrainingUpdate calls a registered global update function', () => {
    window.forceTrainingUpdate = jest.fn();
    forceTrainingUpdate();
    expect(window.forceTrainingUpdate).toHaveBeenCalledTimes(1);
    delete window.forceTrainingUpdate;
  });

  test('a measure without any counter dispatches nothing (fixed silence)', () => {
    expect(boundary({ macroMode: 1 })).toBe(true);
    expect(boundary({ macroMode: 1, isSilencePhaseRef: ref(false) })).toBe(true);
    expect(updates).toEqual([]);
  });

  test('a measure without a measure counter dispatches nothing (speed training)', () => {
    boundary({ speedMode: 1 });
    boundary({ speedMode: 1, isSilencePhaseRef: ref(true) });
    boundary({ speedMode: 1, isSilencePhaseRef: ref(false) });
    expect(updates).toEqual([]);
  });

  test('counting a silent measure requests a UI update even without a measure counter', () => {
    boundary({
      macroMode: 1,
      isSilencePhaseRef: ref(true),
      muteMeasureCountRef: ref(0),
      muteDurationMeasures: 5
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ event: 'measure-boundary' });
  });

  test('silence without a mute counter changes nothing', () => {
    boundary({ macroMode: 1, isSilencePhaseRef: ref(true), muteDurationMeasures: 5 });
    expect(updates).toEqual([]);
  });

  test('entering the silence phase without a mute counter still announces the change', () => {
    const silence = ref(false);
    boundary({ macroMode: 1, isSilencePhaseRef: silence, measureCountRef: ref(1), measuresUntilMute: 2 });
    expect(silence.current).toBe(true);
    expect(updates.map((d) => d.event)).toEqual(['silence-start', 'measure-boundary']);
  });

  test('a speed-up restarts the measure counter and requests a UI update', () => {
    const count = ref(1);
    boundary({ speedMode: 1, measureCountRef: count, measuresUntilSpeedUp: 2 });
    expect(count.current).toBe(0);
    expect(updates.map((d) => d.event)).toEqual(['measure-boundary']);
  });
});
