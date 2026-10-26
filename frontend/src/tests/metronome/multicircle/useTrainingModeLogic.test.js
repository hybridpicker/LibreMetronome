import { renderHook, act } from '@testing-library/react';
import { useTrainingModeLogic } from '../../../components/metronome/MultiCircleMode/hooks/useTrainingModeLogic';

const base = {
  macroMode: 0, speedMode: 0, measuresUntilMute: 2, muteDurationMeasures: 1,
  muteProbability: 0.3, measuresUntilSpeedUp: 2, tempoIncreasePercent: 10
};

function setup(overrides = {}, tempo = 100) {
  const setTempo = jest.fn();
  const tempoRef = { current: tempo };
  const view = renderHook(props => useTrainingModeLogic({ ...base, tempoRef, setTempo, ...props }), { initialProps: overrides });
  const boundary = () => act(() => { view.result.current.handleMeasureBoundary(); });
  return { ...view, setTempo, tempoRef, boundary };
}

describe('useTrainingModeLogic', () => {
  let events;
  const listener = e => events.push(e.type);
  beforeEach(() => {
    events = [];
    window.addEventListener('training-measure-update', listener);
  });
  afterEach(() => {
    window.removeEventListener('training-measure-update', listener);
    delete window.isSilencePhaseRef;
  });

  test('starts with zeroed counters and no silence', () => {
    const { result } = setup();
    expect(result.current.measureCountRef.current).toBe(0);
    expect(result.current.muteMeasureCountRef.current).toBe(0);
    expect(result.current.isSilencePhaseRef.current).toBe(false);
    expect(result.current.lastTempoIncreaseTimeRef.current).toBe(0);
  });

  test('with training off it only counts measures, notifies the UI and returns true', () => {
    const { result, setTempo } = setup();
    let ret;
    act(() => { ret = result.current.handleMeasureBoundary(); });
    expect(ret).toBe(true);
    expect(result.current.measureCountRef.current).toBe(1);
    expect(events).toEqual(['training-measure-update']);
    expect(setTempo).not.toHaveBeenCalled();
    expect(result.current.isSilencePhaseRef.current).toBe(false);
  });

  describe('macro (silence) mode', () => {
    test('enters silence after measuresUntilMute and exits after muteDurationMeasures', () => {
      const { result, boundary } = setup({ macroMode: 1, measuresUntilMute: 2, muteDurationMeasures: 2 });
      boundary();
      expect(result.current.isSilencePhaseRef.current).toBe(false);
      boundary(); // measure 2 -> silence starts
      expect(result.current.isSilencePhaseRef.current).toBe(true);
      expect(window.isSilencePhaseRef).toBe(result.current.isSilencePhaseRef);
      expect(result.current.muteMeasureCountRef.current).toBe(0);
      boundary(); // silent measure 1
      expect(result.current.isSilencePhaseRef.current).toBe(true);
      expect(result.current.muteMeasureCountRef.current).toBe(1);
      boundary(); // silent measure 2 -> ends
      expect(result.current.isSilencePhaseRef.current).toBe(false);
      expect(result.current.muteMeasureCountRef.current).toBe(0);
      expect(result.current.measureCountRef.current).toBe(0);
    });

    test('boundary values: measuresUntilMute=1 mutes after the very first measure', () => {
      const { result, boundary } = setup({ macroMode: 1, measuresUntilMute: 1, muteDurationMeasures: 1 });
      boundary();
      expect(result.current.isSilencePhaseRef.current).toBe(true);
      boundary();
      expect(result.current.isSilencePhaseRef.current).toBe(false);
    });

    test('random macro mode (2) does not drive the silence phase here', () => {
      const { result, boundary } = setup({ macroMode: 2, measuresUntilMute: 1 });
      boundary();
      boundary();
      expect(result.current.isSilencePhaseRef.current).toBe(false);
    });
  });

  describe('speed mode', () => {
    test('raises the tempo by the percentage after measuresUntilSpeedUp and resets the counter', () => {
      const { result, setTempo, boundary } = setup({ speedMode: 1, measuresUntilSpeedUp: 2, tempoIncreasePercent: 10 }, 100);
      boundary();
      expect(setTempo).not.toHaveBeenCalled();
      boundary();
      expect(setTempo).toHaveBeenCalledWith(110);
      expect(result.current.measureCountRef.current).toBe(0);
    });

    test('caps the tempo at 240', () => {
      const { setTempo, boundary } = setup({ speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 50 }, 200);
      boundary();
      expect(setTempo).toHaveBeenCalledWith(240);
    });

    test('does not change anything when the tempo is already at the cap or the increase rounds to 0', () => {
      const atCap = setup({ speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 10 }, 240);
      atCap.boundary();
      expect(atCap.setTempo).not.toHaveBeenCalled();
      expect(atCap.result.current.measureCountRef.current).toBe(1);

      const tiny = setup({ speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 1 }, 20);
      tiny.boundary();
      expect(tiny.setTempo).not.toHaveBeenCalled();
    });

    test('does not raise the tempo during a silence phase', () => {
      const { setTempo, boundary } = setup({ macroMode: 1, measuresUntilMute: 1, muteDurationMeasures: 5, speedMode: 1, measuresUntilSpeedUp: 1 }, 100);
      boundary(); // silence starts, tempo increase is suppressed
      expect(setTempo).not.toHaveBeenCalled();
      boundary();
      expect(setTempo).not.toHaveBeenCalled();
    });

    test('reads the latest tempo from tempoRef at the moment of the boundary', () => {
      const { setTempo, tempoRef, boundary } = setup({ speedMode: 1, measuresUntilSpeedUp: 1, tempoIncreasePercent: 10 }, 100);
      tempoRef.current = 150;
      boundary();
      expect(setTempo).toHaveBeenCalledWith(165);
    });
  });

  test('uses new settings after a rerender (callback identity follows props)', () => {
    const { result, rerender, setTempo } = setup({ speedMode: 0 }, 100);
    const first = result.current.handleMeasureBoundary;
    rerender({ speedMode: 1, measuresUntilSpeedUp: 1 });
    expect(result.current.handleMeasureBoundary).not.toBe(first);
    act(() => { result.current.handleMeasureBoundary(); });
    expect(setTempo).toHaveBeenCalledWith(110);
  });
});
