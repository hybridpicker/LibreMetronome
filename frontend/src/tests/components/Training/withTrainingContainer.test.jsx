import React from 'react';
import { render, screen, act } from '@testing-library/react';
import withTrainingContainer from '../../../components/Training/withTrainingContainer';

let mockContainerProps;
jest.mock('../../../components/Training/TrainingActiveContainer', () => (props) => {
  mockContainerProps = props;
  return <div data-testid="training-container" />;
});

let wrappedProps;
const Metronome = (props) => {
  wrappedProps = props;
  return <div data-testid="metronome" />;
};
const Wrapped = withTrainingContainer(Metronome);

const dispatch = (type, detail) => act(() => {
  window.dispatchEvent(new CustomEvent(type, { detail }));
});
const measure = () => dispatch('training-measure-update');
// eslint-disable-next-line testing-library/no-node-access
const wrapper = () => screen.getByTestId('metronome').parentElement;

describe('withTrainingContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockContainerProps = undefined;
    wrappedProps = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('prop wiring', () => {
    test('always renders the wrapped metronome and shows no training UI while training is off', () => {
      render(<Wrapped tempo={90} />);
      expect(screen.getByTestId('metronome')).toBeInTheDocument();
      expect(screen.queryByTestId('training-container')).not.toBeInTheDocument();
      expect(wrapper()).toHaveAttribute('data-training-active', 'false');
    });

    test('passes unrelated props through and applies training defaults', () => {
      render(<Wrapped tempo={90} mode="grid" />);
      expect(wrappedProps).toMatchObject({
        tempo: 90,
        mode: 'grid',
        macroMode: 0,
        speedMode: 0,
        measuresUntilMute: 4,
        muteDurationMeasures: 2,
        muteProbability: 0.3,
        tempoIncreasePercent: 5,
        measuresUntilSpeedUp: 4
      });
      expect(wrappedProps.setTrainingSettings).toBeUndefined();
      expect(typeof wrappedProps.forceTrainingUpdate).toBe('function');
    });

    test('hands the same local refs to the wrapped component and the training container', () => {
      render(<Wrapped macroMode={1} />);
      expect(wrappedProps.isSilencePhaseRef).toBe(mockContainerProps.isSilencePhaseRef);
      expect(wrappedProps.measureCountRef).toBe(mockContainerProps.measureCountRef);
      expect(wrappedProps.muteMeasureCountRef).toBe(mockContainerProps.muteMeasureCountRef);
    });

    test('ignores refs passed in by the parent', () => {
      const parentRef = { current: 'parent' };
      render(<Wrapped isSilencePhaseRef={parentRef} measureCountRef={parentRef} muteMeasureCountRef={parentRef} />);
      expect(wrappedProps.isSilencePhaseRef).not.toBe(parentRef);
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
    });

    test('shows the training container once a mode is active and forwards parameters', () => {
      render(<Wrapped speedMode={1} isPaused={false} tempoIncreasePercent={8} measuresUntilSpeedUp={6} />);
      expect(screen.getByTestId('training-container')).toBeInTheDocument();
      expect(wrapper()).toHaveAttribute('data-training-active', 'true');
      expect(mockContainerProps).toMatchObject({
        macroMode: 0, speedMode: 1, tempoIncreasePercent: 8, measuresUntilSpeedUp: 6,
        measuresUntilMute: 4, muteDurationMeasures: 2, isPaused: false
      });
    });

    test('follows changes of the training props', () => {
      const { rerender } = render(<Wrapped macroMode={0} />);
      rerender(<Wrapped macroMode={2} measuresUntilMute={9} muteDurationMeasures={5} />);
      expect(screen.getByTestId('training-container')).toBeInTheDocument();
      expect(wrappedProps).toMatchObject({ macroMode: 2, measuresUntilMute: 9, muteDurationMeasures: 5 });
      rerender(<Wrapped macroMode={0} />);
      expect(screen.queryByTestId('training-container')).not.toBeInTheDocument();
    });

    test('forceTrainingUpdate bumps the forceUpdate counter of the container', () => {
      render(<Wrapped macroMode={1} />);
      const before = mockContainerProps.forceUpdate;
      act(() => { wrappedProps.forceTrainingUpdate(); });
      expect(mockContainerProps.forceUpdate).toBe(before + 1);
    });
  });

  describe('global handles', () => {
    test('publishes window.trainingRefs and window.isSilencePhaseRef while mounted', () => {
      const { unmount } = render(<Wrapped />);
      expect(window.isSilencePhaseRef).toBe(wrappedProps.isSilencePhaseRef);
      expect(window.trainingRefs.silenceRef).toBe(wrappedProps.isSilencePhaseRef);
      expect(window.trainingRefs.measureCountRef).toBe(wrappedProps.measureCountRef);
      expect(window.trainingRefs.muteCountRef).toBe(wrappedProps.muteMeasureCountRef);
      expect(typeof window.trainingRefs.forceUpdate).toBe('function');
      unmount();
      expect(window.trainingRefs).toBeUndefined();
      expect(window.isSilencePhaseRef).toBeUndefined();
    });
  });

  describe('training-settings-update event', () => {
    test('switches the macro mode, resets the refs and informs the parent', () => {
      const setTrainingSettings = jest.fn();
      render(<Wrapped setTrainingSettings={setTrainingSettings} />);
      wrappedProps.isSilencePhaseRef.current = true;
      wrappedProps.measureCountRef.current = 5;
      wrappedProps.muteMeasureCountRef.current = 3;
      dispatch('training-settings-update', { macroMode: 1 });
      expect(screen.getByTestId('training-container')).toBeInTheDocument();
      expect(wrappedProps.macroMode).toBe(1);
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
      // reset to 0, then the new mode counts its first measure straight away (see report)
      expect(wrappedProps.measureCountRef.current).toBe(1);
      expect(wrappedProps.muteMeasureCountRef.current).toBe(0);
      expect(setTrainingSettings.mock.calls[0][0]({ macroMode: 0, speedMode: 1 })).toEqual({ macroMode: 1, speedMode: 1 });
    });

    test('switches the speed mode and resets the counters through the mode-change effect', () => {
      const setTrainingSettings = jest.fn();
      render(<Wrapped setTrainingSettings={setTrainingSettings} />);
      wrappedProps.measureCountRef.current = 5;
      dispatch('training-settings-update', { speedMode: 2 });
      expect(wrappedProps.speedMode).toBe(2);
      expect(wrappedProps.measureCountRef.current).toBe(0);
      expect(setTrainingSettings.mock.calls[0][0]({ macroMode: 1 })).toEqual({ macroMode: 1, speedMode: 2 });
    });

    test('handles both modes in one event and works without a parent callback', () => {
      render(<Wrapped />);
      dispatch('training-settings-update', { macroMode: 1, speedMode: 1 });
      expect(wrappedProps).toMatchObject({ macroMode: 1, speedMode: 1 });
    });

    test('an event with neither mode only forces a UI update', () => {
      render(<Wrapped macroMode={1} />);
      const before = mockContainerProps.forceUpdate;
      dispatch('training-settings-update', {});
      expect(wrappedProps.macroMode).toBe(1);
      expect(mockContainerProps.forceUpdate).toBeGreaterThan(before);
    });

    test('the listener is removed on unmount', () => {
      const setTrainingSettings = jest.fn();
      const { unmount } = render(<Wrapped setTrainingSettings={setTrainingSettings} />);
      unmount();
      dispatch('training-settings-update', { macroMode: 1 });
      expect(setTrainingSettings).not.toHaveBeenCalled();
    });
  });

  describe('training-param-update event', () => {
    test.each([
      ['measuresUntilMute', 'measuresUntilMute', 7],
      ['muteDurationMeasures', 'muteDurationMeasures', 6],
      ['measuresUntilSpeedUp', 'measuresUntilSpeedUp', 11],
      ['tempoIncreasePercent', 'tempoIncreasePercent', 13]
    ])('%s updates the local value and the parent settings', (type, key, value) => {
      const setTrainingSettings = jest.fn();
      render(<Wrapped macroMode={1} speedMode={1} setTrainingSettings={setTrainingSettings} />);
      wrappedProps.measureCountRef.current = 3;
      wrappedProps.isSilencePhaseRef.current = true;
      dispatch('training-param-update', { type, newValue: value });
      expect(wrappedProps[key]).toBe(value);
      expect(mockContainerProps[key]).toBe(value);
      expect(setTrainingSettings.mock.calls[0][0]({ other: 1 })).toEqual({ other: 1, [key]: value });
      expect(wrappedProps.measureCountRef.current).toBe(0);
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
    });

    test.each([
      ['measuresUntilMute'], ['muteDurationMeasures'], ['measuresUntilSpeedUp'], ['tempoIncreasePercent']
    ])('%s works without a parent callback', (type) => {
      render(<Wrapped macroMode={1} />);
      expect(() => dispatch('training-param-update', { type, newValue: 2 })).not.toThrow();
      expect(wrappedProps[type]).toBe(2);
    });

    test('an unknown type changes nothing but still resets the counters', () => {
      const setTrainingSettings = jest.fn();
      render(<Wrapped macroMode={1} setTrainingSettings={setTrainingSettings} />);
      wrappedProps.measureCountRef.current = 3;
      dispatch('training-param-update', { type: 'bogus', newValue: 99 });
      expect(setTrainingSettings).not.toHaveBeenCalled();
      expect(wrappedProps.measuresUntilMute).toBe(4);
      expect(wrappedProps.measureCountRef.current).toBe(0);
    });
  });

  describe('measure counting state machine', () => {
    test('fixed silence: plays N measures, mutes M measures, then plays again', () => {
      render(<Wrapped macroMode={1} measuresUntilMute={2} muteDurationMeasures={2} />);
      const { isSilencePhaseRef: silent, measureCountRef: played, muteMeasureCountRef: muted } = wrappedProps;
      // characterization: current behaviour, see report - mounting already counts one measure
      expect([played.current, silent.current]).toEqual([1, false]);
      measure();
      expect([played.current, silent.current, muted.current]).toEqual([2, true, 0]);
      measure();
      expect([silent.current, muted.current]).toEqual([true, 1]);
      measure();
      expect([silent.current, muted.current, played.current]).toEqual([false, 2, 0]);
      measure();
      expect([played.current, silent.current]).toEqual([1, false]);
      measure();
      expect(silent.current).toBe(true);
    });

    test('fixed silence with a one-measure play phase mutes immediately', () => {
      render(<Wrapped macroMode={1} measuresUntilMute={1} muteDurationMeasures={1} />);
      expect(wrappedProps.isSilencePhaseRef.current).toBe(true);
      measure();
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
      measure();
      expect(wrappedProps.isSilencePhaseRef.current).toBe(true);
    });

    test('random silence mutes a measure when the dice roll is below the probability', () => {
      const random = jest.spyOn(Math, 'random');
      render(<Wrapped macroMode={2} muteProbability={0.3} />);
      random.mockReturnValue(0.29);
      measure();
      expect(wrappedProps.isSilencePhaseRef.current).toBe(true);
      random.mockReturnValue(0.3);
      measure();
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
    });

    test('random silence with probability 0 never mutes, with probability 1 always mutes', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.999999);
      const { unmount } = render(<Wrapped macroMode={2} muteProbability={1} />);
      measure();
      expect(wrappedProps.isSilencePhaseRef.current).toBe(true);
      unmount();
      jest.spyOn(Math, 'random').mockReturnValue(0);
      render(<Wrapped macroMode={2} muteProbability={0} />);
      measure();
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
    });

    test('auto speed-up cycles the measure counter every N measures', () => {
      render(<Wrapped speedMode={1} measuresUntilSpeedUp={3} />);
      const played = wrappedProps.measureCountRef;
      expect(played.current).toBe(1);
      measure();
      expect(played.current).toBe(2);
      measure();
      expect(played.current).toBe(0);
      measure();
      expect(played.current).toBe(1);
    });

    test('manual speed mode and inactive modes do not count measures', () => {
      render(<Wrapped speedMode={2} />);
      measure();
      expect(wrappedProps.measureCountRef.current).toBe(0);
    });

    test('no mode active: measure events are ignored and no initial update happens', () => {
      render(<Wrapped />);
      measure();
      expect(wrappedProps.measureCountRef.current).toBe(0);
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
    });

    test('speed counting is skipped during a silence phase', () => {
      render(<Wrapped macroMode={1} speedMode={1} measuresUntilMute={1} muteDurationMeasures={3} measuresUntilSpeedUp={100} />);
      // mount: play counter 1 reaches the threshold, silence starts; speed counting is skipped
      expect(wrappedProps.isSilencePhaseRef.current).toBe(true);
      expect(wrappedProps.measureCountRef.current).toBe(1);
      measure();
      expect(wrappedProps.measureCountRef.current).toBe(1);
    });

    test('changing the playback state resets the counters', () => {
      const { rerender } = render(<Wrapped macroMode={1} measuresUntilMute={5} isPaused={false} />);
      measure();
      measure();
      expect(wrappedProps.measureCountRef.current).toBe(3);
      rerender(<Wrapped macroMode={1} measuresUntilMute={5} isPaused />);
      expect(wrappedProps.measureCountRef.current).toBe(0);
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
    });

    test('locally edited thresholds do not change the counting thresholds', () => {
      // characterization: current behaviour, see report - the state machine reads the
      // measuresUntilMute prop, not the locally edited value
      render(<Wrapped macroMode={1} measuresUntilMute={3} muteDurationMeasures={2} />);
      dispatch('training-param-update', { type: 'measuresUntilMute', newValue: 1 });
      expect(wrappedProps.measuresUntilMute).toBe(1);
      measure();
      measure();
      expect(wrappedProps.isSilencePhaseRef.current).toBe(false);
    });

    test('the measure listener is removed on unmount', () => {
      const { unmount } = render(<Wrapped macroMode={1} />);
      const refs = wrappedProps.measureCountRef;
      unmount();
      const before = refs.current;
      measure();
      expect(refs.current).toBe(before);
    });
  });

  describe('polling', () => {
    test('while training is active the UI is refreshed every 150 ms', () => {
      render(<Wrapped macroMode={1} />);
      const before = mockContainerProps.forceUpdate;
      act(() => { jest.advanceTimersByTime(149); });
      expect(mockContainerProps.forceUpdate).toBe(before);
      act(() => { jest.advanceTimersByTime(1); });
      expect(mockContainerProps.forceUpdate).toBe(before + 1);
      act(() => { jest.advanceTimersByTime(300); });
      expect(mockContainerProps.forceUpdate).toBe(before + 3);
    });

    test('while training is off the poll does nothing', () => {
      render(<Wrapped />);
      act(() => { jest.advanceTimersByTime(1000); });
      expect(wrapper()).toHaveAttribute('data-training-active', 'false');
      expect(screen.queryByTestId('training-container')).not.toBeInTheDocument();
    });

    test('the interval is cleared on unmount', () => {
      const { unmount } = render(<Wrapped macroMode={1} />);
      unmount();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
