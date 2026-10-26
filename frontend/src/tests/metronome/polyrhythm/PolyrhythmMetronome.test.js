/* eslint-disable testing-library/no-node-access -- the ratio display is plain divs without roles; read it via its container */
import React from 'react';
import { render, screen, act, fireEvent, cleanup, within } from '@testing-library/react';
import PolyrhythmMetronome from '../../../components/metronome/PolyrhythmMode/PolyrhythmMetronome';
import usePolyrhythmLogic from '../../../components/metronome/PolyrhythmMode/usePolyrhythmLogic';
import { initAudioContext, resumeAudioContext } from '../../../hooks/useMetronomeLogic/audioBuffers';
import { useVizCardSize } from '../../../utils/layoutSize';

jest.mock('../../../components/metronome/PolyrhythmMode/usePolyrhythmLogic');
jest.mock('../../../hooks/useMetronomeLogic/audioBuffers');
jest.mock('../../../hooks/useMetronomeLogic/tapFeedback', () => ({ playTapFeedback: jest.fn() }));
jest.mock('../../../utils/layoutSize', () => ({ useVizCardSize: jest.fn() }));
// The training container is not under test here: render the wrapped component directly.
jest.mock('../../../components/Training/withTrainingContainer', () => ({
  __esModule: true,
  default: Component => Component
}));

function makeLogic(overrides = {}) {
  return {
    innerCurrentSubdivision: 0,
    outerCurrentSubdivision: 0,
    isSilencePhaseRef: { current: false },
    measureCountRef: { current: 0 },
    muteMeasureCountRef: { current: 0 },
    tapTempo: jest.fn(),
    reloadSounds: jest.fn(() => Promise.resolve(true)),
    startScheduler: jest.fn(),
    stopScheduler: jest.fn(),
    ...overrides
  };
}

function setup(propOverrides = {}, logicOverrides = {}) {
  const logic = makeLogic(logicOverrides);
  usePolyrhythmLogic.mockReturnValue(logic);
  const props = {
    tempo: 100,
    setTempo: jest.fn(),
    isPaused: true,
    setIsPaused: jest.fn(),
    swing: 0,
    volume: 0.5,
    setVolume: jest.fn(),
    registerTogglePlay: jest.fn(),
    registerTapTempo: jest.fn(),
    ...propOverrides
  };
  const utils = render(<PolyrhythmMetronome {...props} />);
  const lastLogicArgs = () => usePolyrhythmLogic.mock.calls[usePolyrhythmLogic.mock.calls.length - 1][0];
  const rerenderWith = next => utils.rerender(<PolyrhythmMetronome {...props} {...next} />);
  return { logic, props, lastLogicArgs, rerenderWith, ...utils };
}

// Clicks a ring-size chip and lets the 150 ms debounce plus the 200 ms transition elapse.
const chooseBeats = (circle, num) => {
  fireEvent.click(screen.getByRole('button', { name: `Set ${circle} rhythm to ${num} beats` }));
  act(() => { jest.advanceTimersByTime(150); });
};

describe('PolyrhythmMetronome', () => {
  let logSpies;
  beforeEach(() => {
    jest.useFakeTimers();
    logSpies = ['log', 'warn', 'error'].map(m => jest.spyOn(console, m).mockImplementation(() => {}));
    useVizCardSize.mockReturnValue([{ current: null }, { width: 600, height: 600 }]);
    initAudioContext.mockReturnValue({ state: 'running' });
    resumeAudioContext.mockResolvedValue(true);
  });
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    logSpies.forEach(s => s.mockRestore());
    jest.clearAllMocks();
    delete window.isSilencePhaseRef;
  });

  describe('rendering and logic wiring', () => {
    test('starts with a 4:3 ratio and the default first-beat accent patterns', () => {
      const { lastLogicArgs } = setup();
      expect(screen.getByText('Polyrhythm').parentElement).toHaveTextContent('4:3');
      expect(screen.getByText('4 Beats')).toBeInTheDocument();
      expect(screen.getByText('3 Beats')).toBeInTheDocument();
      const args = lastLogicArgs();
      expect(args.innerBeats).toBe(4);
      expect(args.outerBeats).toBe(3);
      expect(args.innerAccents).toEqual([3, 1, 1, 1]);
      expect(args.outerAccents).toEqual([3, 1, 1]);
      expect(args.soundsSwapped).toBe(false);
    });

    test('forwards tempo, volume, swing and training settings to the logic hook', () => {
      const { lastLogicArgs } = setup({
        tempo: 90, volume: 0.3, swing: 0.2, macroMode: 1, speedMode: 2, measuresUntilMute: 4,
        muteDurationMeasures: 3, muteProbability: 0.6, tempoIncreasePercent: 8, measuresUntilSpeedUp: 5
      });
      expect(lastLogicArgs()).toEqual(expect.objectContaining({
        tempo: 90, volume: 0.3, swing: 0.2, macroMode: 1, speedMode: 2, measuresUntilMute: 4,
        muteDurationMeasures: 3, muteProbability: 0.6, tempoIncreasePercent: 8, measuresUntilSpeedUp: 5, isPaused: true
      }));
    });

    test('defaults the training settings when they are not provided', () => {
      const { lastLogicArgs } = setup();
      expect(lastLogicArgs()).toEqual(expect.objectContaining({
        macroMode: 0, speedMode: 0, measuresUntilMute: 2, muteDurationMeasures: 1,
        muteProbability: 0.3, tempoIncreasePercent: 5, measuresUntilSpeedUp: 2
      }));
    });

    test('draws one beat key per beat in both rings', () => {
      setup();
      expect(screen.getAllByRole('button', { name: /^Inner rhythm, beat/ })).toHaveLength(4);
      expect(screen.getAllByRole('button', { name: /^Outer rhythm, beat/ })).toHaveLength(3);
      expect(screen.getByRole('button', { name: 'Inner rhythm, beat 1: first beat. Activate to change accent.' })).toBeInTheDocument();
    });

    test('draws no rings until the visualisation area has a size', () => {
      useVizCardSize.mockReturnValue([{ current: null }, { width: 0, height: 0 }]);
      setup();
      expect(screen.queryByRole('button', { name: /^Select inner rhythm/ })).not.toBeInTheDocument();
    });

    test('shows the accelerate button only for speed training modes 1 and 2', () => {
      setup({ speedMode: 0 });
      expect(screen.queryByRole('button', { name: /Accelerate tempo/ })).not.toBeInTheDocument();
      cleanup();
      setup({ speedMode: 2 });
      expect(screen.getByRole('button', { name: 'Accelerate tempo in Manual Speed Training Mode' })).toBeInTheDocument();
    });

    test('works when the logic hook returns nothing', () => {
      usePolyrhythmLogic.mockReturnValue(undefined);
      render(<PolyrhythmMetronome tempo={100} setTempo={jest.fn()} isPaused setIsPaused={jest.fn()} volume={0.5} setVolume={jest.fn()} />);
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
      expect(screen.getByText('Polyrhythm')).toBeInTheDocument();
    });
  });

  describe('transport', () => {
    test('pressing Start resumes the audio context inside the gesture and unpauses', () => {
      const { props } = setup({ isPaused: true });
      const ctx = { state: 'suspended' };
      initAudioContext.mockReturnValue(ctx);
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      expect(resumeAudioContext).toHaveBeenCalledWith(ctx);
      expect(props.setIsPaused).toHaveBeenCalledWith(false);
    });

    test('pressing Pause stops the scheduler first and pauses', () => {
      const { props, logic } = setup({ isPaused: false });
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
      expect(resumeAudioContext).not.toHaveBeenCalled();
      expect(props.setIsPaused).toHaveBeenCalledWith(true);
    });

    test('the play button reflects the playing state', () => {
      setup({ isPaused: false });
      expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('registers the toggle and tap functions with the parent and unregisters tap on unmount', () => {
      const { props, logic, unmount } = setup();
      expect(props.registerTogglePlay).toHaveBeenCalledWith(expect.any(Function));
      expect(props.registerTapTempo).toHaveBeenCalledWith(logic.tapTempo);
      unmount();
      expect(props.registerTapTempo).toHaveBeenLastCalledWith(null);
    });

    test('the registered toggle behaves like the play button', () => {
      const { props } = setup({ isPaused: true });
      const toggle = props.registerTogglePlay.mock.calls[props.registerTogglePlay.mock.calls.length - 1][0];
      act(() => toggle());
      expect(props.setIsPaused).toHaveBeenCalledWith(false);
    });

    test('works without registration callbacks', () => {
      setup({ registerTogglePlay: undefined, registerTapTempo: undefined });
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });
  });

  describe('tap tempo', () => {
    test('uses the hook implementation and announces the tap globally', () => {
      const { logic } = setup();
      const handler = jest.fn();
      window.addEventListener('metronome-tap-tempo', handler);
      fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
      window.removeEventListener('metronome-tap-tempo', handler);
      expect(logic.tapTempo).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.handled).toBe(true);
    });

    test('still dispatches the global event when the hook has no tapTempo', () => {
      setup({}, { tapTempo: null });
      const handler = jest.fn();
      window.addEventListener('metronome-tap-tempo', handler);
      fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
      window.removeEventListener('metronome-tap-tempo', handler);
      expect(handler.mock.calls[0][0].detail.handled).toBe(false);
    });

    test('a missing tapTempo is replaced by a no-op default and still counts as handled', () => {
      // characterization: current behaviour, see report (destructuring default makes the "no implementation" branch dead for undefined)
      setup({}, { tapTempo: undefined });
      const handler = jest.fn();
      window.addEventListener('metronome-tap-tempo', handler);
      fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
      window.removeEventListener('metronome-tap-tempo', handler);
      expect(handler.mock.calls[0][0].detail.handled).toBe(true);
    });
  });

  describe('beat count controls', () => {
    test('choosing a beat count disables the controls, restarts after 200 ms and updates the ratio', () => {
      const { logic, lastLogicArgs } = setup({ isPaused: false });
      chooseBeats('inner', 5);
      expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Tap Tempo' })).toBeDisabled();
      expect(lastLogicArgs().innerBeats).toBe(5);
      expect(lastLogicArgs().innerAccents).toEqual([3, 1, 1, 1, 1]);
      expect(logic.startScheduler).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(199); });
      expect(logic.startScheduler).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(1); });
      expect(logic.startScheduler).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Tap Tempo' })).toBeEnabled();
      expect(screen.getByText('Polyrhythm').parentElement).toHaveTextContent('5:3');
    });

    test('the outer circle can be changed too and a paused metronome is not restarted', () => {
      const { logic, lastLogicArgs } = setup({ isPaused: true });
      chooseBeats('outer', 7);
      act(() => { jest.advanceTimersByTime(200); });
      expect(lastLogicArgs().outerBeats).toBe(7);
      expect(lastLogicArgs().outerAccents).toEqual([3, 1, 1, 1, 1, 1, 1]);
      expect(logic.stopScheduler).not.toHaveBeenCalled();
      expect(logic.startScheduler).not.toHaveBeenCalled();
    });

    test('the active choice is marked as pressed', () => {
      setup();
      expect(screen.getByRole('button', { name: 'Set inner rhythm to 4 beats' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Set inner rhythm to 5 beats' })).toHaveAttribute('aria-pressed', 'false');
    });

    test('steppers move one beat at a time', () => {
      const { lastLogicArgs } = setup();
      const inner = within(screen.getByRole('group', { name: 'Inner beats' }));
      fireEvent.click(inner.getByRole('button', { name: 'More inner beats' }));
      act(() => { jest.advanceTimersByTime(350); });
      expect(lastLogicArgs().innerBeats).toBe(5);
      fireEvent.click(inner.getByRole('button', { name: 'Fewer inner beats' }));
      act(() => { jest.advanceTimersByTime(350); });
      expect(lastLogicArgs().innerBeats).toBe(4);
      const outer = within(screen.getByRole('group', { name: 'Outer beats' }));
      fireEvent.click(outer.getByRole('button', { name: 'More outer beats' }));
      act(() => { jest.advanceTimersByTime(350); });
      expect(lastLogicArgs().outerBeats).toBe(4);
      fireEvent.click(outer.getByRole('button', { name: 'Fewer outer beats' }));
      act(() => { jest.advanceTimersByTime(350); });
      expect(lastLogicArgs().outerBeats).toBe(3);
    });

    test('steppers are disabled at the limits 2 and 9', () => {
      setup();
      chooseBeats('inner', 2);
      act(() => { jest.advanceTimersByTime(200); });
      expect(screen.getByRole('button', { name: 'Fewer inner beats' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'More inner beats' })).toBeEnabled();
      chooseBeats('outer', 9);
      act(() => { jest.advanceTimersByTime(200); });
      expect(screen.getByRole('button', { name: 'More outer beats' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Fewer outer beats' })).toBeEnabled();
    });

    test('ignores another change while a transition is running', () => {
      const { lastLogicArgs } = setup();
      chooseBeats('inner', 5);
      // controls are disabled during the transition
      expect(screen.getByRole('button', { name: 'Set inner rhythm to 6 beats' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Set inner rhythm to 6 beats' }));
      act(() => { jest.advanceTimersByTime(500); });
      expect(lastLogicArgs().innerBeats).toBe(5);
    });
  });

  describe('circle selection and accents', () => {
    test('selecting the other ring stops, switches and restarts after 100 ms', () => {
      const { logic } = setup({ isPaused: false });
      const outerSelect = screen.getByRole('button', { name: 'Select outer rhythm, 3 beats' });
      expect(screen.getByRole('button', { name: 'Select inner rhythm, 4 beats' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(outerSelect);
      expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Select outer rhythm, 3 beats' })).toHaveAttribute('aria-pressed', 'true');
      act(() => { jest.advanceTimersByTime(99); });
      expect(logic.startScheduler).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(1); });
      expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    });

    test('selecting the already active ring does nothing', () => {
      const { logic } = setup({ isPaused: false });
      fireEvent.click(screen.getByRole('button', { name: 'Select inner rhythm, 4 beats' }));
      expect(logic.stopScheduler).not.toHaveBeenCalled();
    });

    test('selecting a ring while paused does not touch the scheduler', () => {
      const { logic } = setup({ isPaused: true });
      fireEvent.click(screen.getByRole('button', { name: 'Select outer rhythm, 3 beats' }));
      act(() => { jest.advanceTimersByTime(100); });
      expect(logic.stopScheduler).not.toHaveBeenCalled();
      expect(logic.startScheduler).not.toHaveBeenCalled();
    });

    test('a beat key cycles muted -> normal -> accent -> first -> muted', () => {
      const { lastLogicArgs } = setup({ isPaused: false });
      const key = () => screen.getByRole('button', { name: /^Inner rhythm, beat 2:/ });
      expect(key()).toHaveAccessibleName('Inner rhythm, beat 2: normal. Activate to change accent.');
      const cycle = [[2, 'accent'], [3, 'first beat'], [0, 'muted'], [1, 'normal']];
      cycle.forEach(([value, name]) => {
        fireEvent.click(key());
        act(() => { jest.advanceTimersByTime(100); });
        expect(lastLogicArgs().innerAccents[1]).toBe(value);
        expect(key()).toHaveAccessibleName(`Inner rhythm, beat 2: ${name}. Activate to change accent.`);
      });
    });

    test('toggling an outer accent leaves the inner pattern alone and restarts the scheduler', () => {
      const { logic, lastLogicArgs } = setup({ isPaused: false });
      fireEvent.click(screen.getByRole('button', { name: /^Outer rhythm, beat 3:/ }));
      expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
      act(() => { jest.advanceTimersByTime(100); });
      expect(lastLogicArgs().outerAccents).toEqual([3, 1, 2]);
      expect(lastLogicArgs().innerAccents).toEqual([3, 1, 1, 1]);
      expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    });

    test('accent changes while paused leave the scheduler alone', () => {
      const { logic } = setup({ isPaused: true });
      fireEvent.click(screen.getByRole('button', { name: /^Inner rhythm, beat 2:/ }));
      act(() => { jest.advanceTimersByTime(100); });
      expect(logic.stopScheduler).not.toHaveBeenCalled();
      expect(logic.startScheduler).not.toHaveBeenCalled();
    });

    test('a second accent change during the transition is ignored', () => {
      const { lastLogicArgs } = setup();
      fireEvent.click(screen.getByRole('button', { name: /^Inner rhythm, beat 2:/ }));
      fireEvent.click(screen.getByRole('button', { name: /^Inner rhythm, beat 2:/ }));
      expect(lastLogicArgs().innerAccents[1]).toBe(2);
    });

    test('changing the beat count resets that ring\'s custom accents', () => {
      const { lastLogicArgs } = setup();
      fireEvent.click(screen.getByRole('button', { name: /^Inner rhythm, beat 2:/ }));
      act(() => { jest.advanceTimersByTime(100); });
      expect(lastLogicArgs().innerAccents).toEqual([3, 2, 1, 1]);
      chooseBeats('inner', 3);
      act(() => { jest.advanceTimersByTime(200); });
      expect(lastLogicArgs().innerAccents).toEqual([3, 1, 1]);
    });
  });

  describe('swap circles', () => {
    test('exchanges beat counts and accents, flips the sound swap and restarts after 200 ms', () => {
      const { logic, lastLogicArgs } = setup({ isPaused: false });
      fireEvent.click(screen.getByRole('button', { name: /^Inner rhythm, beat 2:/ }));
      act(() => { jest.advanceTimersByTime(100); });
      logic.stopScheduler.mockClear();
      logic.startScheduler.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'Swap Inner and Outer Beat Patterns' }));
      expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
      const args = lastLogicArgs();
      expect(args.innerBeats).toBe(3);
      expect(args.outerBeats).toBe(4);
      expect(args.soundsSwapped).toBe(true);
      expect(screen.getByText('Polyrhythm').parentElement).toHaveTextContent('3:4');
      act(() => { jest.advanceTimersByTime(199); });
      expect(logic.startScheduler).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(1); });
      expect(logic.startScheduler).toHaveBeenCalledTimes(1);

      // swapping twice returns the original assignment
      fireEvent.click(screen.getByRole('button', { name: 'Swap Inner and Outer Beat Patterns' }));
      act(() => { jest.advanceTimersByTime(200); });
      expect(lastLogicArgs().innerBeats).toBe(4);
      expect(lastLogicArgs().soundsSwapped).toBe(false);
    });

    test('swapping while paused does not touch the scheduler', () => {
      const { logic } = setup({ isPaused: true });
      fireEvent.click(screen.getByRole('button', { name: 'Swap Inner and Outer Beat Patterns' }));
      act(() => { jest.advanceTimersByTime(200); });
      expect(logic.stopScheduler).not.toHaveBeenCalled();
      expect(logic.startScheduler).not.toHaveBeenCalled();
    });

    test('is disabled while a transition runs', () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: 'Swap Inner and Outer Beat Patterns' }));
      expect(screen.getByRole('button', { name: 'Swap Inner and Outer Beat Patterns' })).toBeDisabled();
    });
  });

  describe('accelerate', () => {
    test('increases the tempo by the training percentage (capped at +10 BPM) and resets the measure counter', () => {
      const measureCountRef = { current: 7 };
      const { props } = setup({ isPaused: false, speedMode: 1, tempoIncreasePercent: 5, tempo: 100 }, { measureCountRef });
      const updated = jest.fn();
      window.addEventListener('training-measure-update', updated);
      fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo/ }));
      window.removeEventListener('training-measure-update', updated);
      expect(props.setTempo).toHaveBeenCalledWith(105);
      expect(measureCountRef.current).toBe(0);
      expect(updated).toHaveBeenCalled();
    });

    test('does nothing while paused', () => {
      const { props } = setup({ isPaused: true, speedMode: 1 });
      fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo/ }));
      expect(props.setTempo).not.toHaveBeenCalled();
    });
  });

  describe('training events and container refs', () => {
    test('mirrors the logic refs into the training container refs, now and every 500 ms', () => {
      const containerMeasure = { current: -1 };
      const containerMute = { current: -1 };
      const containerSilence = { current: null };
      const measureCountRef = { current: 3 };
      const muteMeasureCountRef = { current: 1 };
      const isSilencePhaseRef = { current: true };
      setup(
        { measureCountRef: containerMeasure, muteMeasureCountRef: containerMute, isSilencePhaseRef: containerSilence },
        { measureCountRef, muteMeasureCountRef, isSilencePhaseRef }
      );
      expect(containerMeasure.current).toBe(3);
      expect(containerMute.current).toBe(1);
      expect(containerSilence.current).toBe(true);
      measureCountRef.current = 4;
      isSilencePhaseRef.current = false;
      act(() => { jest.advanceTimersByTime(499); });
      expect(containerMeasure.current).toBe(3);
      act(() => { jest.advanceTimersByTime(1); });
      expect(containerMeasure.current).toBe(4);
      expect(containerSilence.current).toBe(false);
      expect(window.isSilencePhaseRef).toBe(containerSilence);
    });

    test('publishes its own silence ref globally when no container ref is given', () => {
      const isSilencePhaseRef = { current: false };
      setup({}, { isSilencePhaseRef });
      act(() => { jest.advanceTimersByTime(500); });
      expect(window.isSilencePhaseRef).toBe(isSilencePhaseRef);
    });

    test('a macroMode change resets silence state and announces it', () => {
      const measureCountRef = { current: 5 };
      const muteMeasureCountRef = { current: 2 };
      const isSilencePhaseRef = { current: true };
      setup({ macroMode: 1 }, { measureCountRef, muteMeasureCountRef, isSilencePhaseRef });
      const updated = jest.fn();
      window.addEventListener('training-measure-update', updated);
      act(() => {
        window.dispatchEvent(new CustomEvent('training-param-update', { detail: { type: 'macroMode', newValue: 2 } }));
      });
      window.removeEventListener('training-measure-update', updated);
      expect(measureCountRef.current).toBe(0);
      expect(muteMeasureCountRef.current).toBe(0);
      expect(isSilencePhaseRef.current).toBe(false);
      expect(updated).toHaveBeenCalledTimes(1);
    });

    test('an unchanged macroMode value is ignored', () => {
      const measureCountRef = { current: 5 };
      setup({ macroMode: 1 }, { measureCountRef });
      act(() => {
        window.dispatchEvent(new CustomEvent('training-mode-toggle', { detail: { type: 'macroMode', newValue: 1 } }));
      });
      expect(measureCountRef.current).toBe(5);
    });

    test('a speedMode change resets only the measure counter', () => {
      const measureCountRef = { current: 5 };
      const muteMeasureCountRef = { current: 2 };
      setup({ speedMode: 0 }, { measureCountRef, muteMeasureCountRef });
      act(() => {
        window.dispatchEvent(new CustomEvent('training-param-update', { detail: { type: 'speedMode', newValue: 1 } }));
      });
      expect(measureCountRef.current).toBe(0);
      expect(muteMeasureCountRef.current).toBe(2);
    });

    test('unrelated training parameters are ignored and listeners are removed on unmount', () => {
      const measureCountRef = { current: 5 };
      const { unmount } = setup({}, { measureCountRef });
      act(() => {
        window.dispatchEvent(new CustomEvent('training-param-update', { detail: { type: 'other', newValue: 1 } }));
      });
      expect(measureCountRef.current).toBe(5);
      unmount();
      act(() => {
        window.dispatchEvent(new CustomEvent('training-param-update', { detail: { type: 'speedMode', newValue: 1 } }));
      });
      expect(measureCountRef.current).toBe(5);
    });

    test('reloads sounds when the sound set trigger increments, not on mount with 0', () => {
      const { logic, rerenderWith } = setup({ soundSetReloadTrigger: 0 });
      expect(logic.reloadSounds).not.toHaveBeenCalled();
      rerenderWith({ soundSetReloadTrigger: 1 });
      expect(logic.reloadSounds).toHaveBeenCalledTimes(1);
    });

    test('announces playback start with tempo and inner beats, only while playing', () => {
      const started = jest.fn();
      window.addEventListener('polyrhythm-playback-start', started);
      const { rerenderWith } = setup({ isPaused: true, tempo: 100 });
      expect(started).not.toHaveBeenCalled();
      rerenderWith({ isPaused: false });
      window.removeEventListener('polyrhythm-playback-start', started);
      expect(started).toHaveBeenCalledTimes(1);
      expect(started.mock.calls[0][0].detail).toEqual(expect.objectContaining({ tempo: 100, innerBeats: 4 }));
    });
  });

  describe('beat callbacks passed to the logic', () => {
    test('first inner beats fire the global first-beat event at most once per 500 ms', () => {
      const { lastLogicArgs } = setup({ isPaused: false });
      const fired = jest.fn();
      window.addEventListener('polyrhythm-first-beat', fired);
      const onInner = lastLogicArgs().onInnerBeatTriggered;
      const nowSpy = jest.spyOn(performance, 'now');
      nowSpy.mockReturnValue(10000);
      onInner(0);
      nowSpy.mockReturnValue(10300);
      onInner(0);
      nowSpy.mockReturnValue(10600);
      onInner(0);
      onInner(2); // non-first beats never fire the event
      window.removeEventListener('polyrhythm-first-beat', fired);
      nowSpy.mockRestore();
      expect(fired).toHaveBeenCalledTimes(2);
    });

    test('the outer beat callback is a harmless no-op', () => {
      const { lastLogicArgs } = setup();
      expect(() => lastLogicArgs().onOuterBeatTriggered(0)).not.toThrow();
    });
  });

  describe('sliders', () => {
    test('tempo and volume show their formatted values', () => {
      setup({ tempo: 88, volume: 0.25 });
      expect(screen.getByText(/88/)).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    });

    test('the tempo slider updates the parent', () => {
      const { props } = setup({ tempo: 100 });
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '140' } });
      expect(props.setTempo).toHaveBeenCalledWith(140);
    });

    test('editing the volume parses a percentage', () => {
      const { props } = setup({ volume: 0.5 });
      fireEvent.click(screen.getByText(/50%/));
      const input = screen.getByLabelText('Edit Volume value');
      fireEvent.change(input, { target: { value: '80' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(props.setVolume).toHaveBeenCalledWith(0.8);
    });
  });
});
