import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MultiCircleMetronome from '../../../components/metronome/MultiCircleMode/MultiCircleMetronome';
import useMultiCircleMetronomeLogic from '../../../components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic';
import { useVizCardSize } from '../../../utils/layoutSize';

jest.mock('../../../components/Training/withTrainingContainer', () => Component => Component);
jest.mock('../../../components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic', () => jest.fn());
jest.mock('../../../utils/layoutSize', () => ({ useVizCardSize: jest.fn() }));
jest.mock('../../../hooks/useMetronomeLogic/tapFeedback', () => ({ playTapFeedback: jest.fn() }));

// A transparent stand-in for the ring renderer that exposes its props and callbacks.
const mockRenderedCircles = {};
jest.mock('../../../components/metronome/MultiCircleMode/CircleRenderer', () => {
  const React = require('react'); // eslint-disable-line global-require
  return function StubCircle(props) {
    mockRenderedCircles[props.idx] = props;
    return (
      <div data-testid={`circle-${props.idx}`}>
        <button type="button" onClick={() => props.setActiveCircle(props.idx)}>select {props.idx}</button>
        <button type="button" onClick={() => props.updateAccent(1, props.idx)}>accent {props.idx}</button>
        <button type="button" onClick={() => props.updateAccent(99, props.idx)}>accent-oob {props.idx}</button>
        <button type="button" onClick={() => props.updateAccent('remove', props.idx)}>remove {props.idx}</button>
      </div>
    );
  };
});

let logic;
let handlers;
const lastLogicArgs = () => useMultiCircleMetronomeLogic.mock.calls.at(-1)[0];
const circle = idx => mockRenderedCircles[idx];

const settle = () => act(async () => { await Promise.resolve(); });

function setup(overrides = {}) {
  handlers = {
    setTempo: jest.fn(), setIsPaused: jest.fn(), setSwing: jest.fn(), setVolume: jest.fn(),
    registerTogglePlay: jest.fn(), registerTapTempo: jest.fn()
  };
  const props = { tempo: 120, isPaused: true, swing: 0.1, volume: 0.5, ...handlers, ...overrides };
  const utils = render(<MultiCircleMetronome {...props} />);
  return { ...utils, props };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  Object.keys(mockRenderedCircles).forEach(k => delete mockRenderedCircles[k]);
  logic = {
    currentSubdivision: 2,
    audioCtx: { state: 'running' },
    safelyInitAudioContext: jest.fn(() => Promise.resolve()),
    stopScheduler: jest.fn(),
    tapTempo: jest.fn(),
    isTransitioning: jest.fn(() => false),
    reloadSounds: jest.fn(() => Promise.resolve(true)),
    isProcessingPlayPauseRef: { current: false }
  };
  useMultiCircleMetronomeLogic.mockReset().mockImplementation(() => logic);
  useVizCardSize.mockReset().mockReturnValue([{ current: null }, { width: 0, height: 0 }]);
  window.innerWidth = 1024;
  delete window.isSilencePhaseRef;
  delete window.currentTempo;
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('initial state', () => {
  test('starts with a 4-beat and a 3-beat quarter circle, the first one selected', () => {
    setup();
    expect(lastLogicArgs().circleSettings).toEqual([
      { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: 'quarter' },
      { subdivisions: 3, accents: [3, 1, 1], beatMode: 'quarter' }
    ]);
    expect(circle(0)).toMatchObject({ isActiveUI: true, isPlaying: false });
    expect(circle(1)).toMatchObject({ isActiveUI: false, isPlaying: false });
    expect(screen.getByText(/^2/, { selector: '.circle-actions-count' })).toHaveTextContent('2 circles');
  });

  test('hands the engine the tempo, swing, volume and training defaults', () => {
    setup();
    expect(lastLogicArgs()).toMatchObject({
      tempo: 120, swing: 0.1, volume: 0.5, isPaused: true, macroMode: 0, speedMode: 0,
      measuresUntilMute: 2, muteDurationMeasures: 1, muteProbability: 0.3,
      tempoIncreasePercent: 5, measuresUntilSpeedUp: 2, subdivisions: 4, beatMode: 'quarter',
      analogMode: false, gridMode: false
    });
  });

  test('passes the engine\'s state down to each circle', () => {
    logic.audioCtx = { state: 'running' };
    setup({ isPaused: false });
    expect(circle(0)).toMatchObject({ currentSubdivision: 2, audioCtxRunning: true, isTransitioning: false, isPaused: false, isPlaying: true });
    expect(circle(1)).toMatchObject({ isPlaying: false });
  });

  test('a missing or stopped engine degrades to safe values', () => {
    useMultiCircleMetronomeLogic.mockImplementation(() => null);
    setup();
    expect(circle(0)).toMatchObject({ currentSubdivision: 0, isTransitioning: false });
    expect(circle(0).audioCtxRunning).toBeFalsy();
  });

  test('an engine without audioCtx reports the context as not running; a transitioning engine is forwarded', () => {
    logic.audioCtx = { state: 'suspended' };
    logic.isTransitioning = jest.fn(() => true);
    setup();
    expect(circle(0).audioCtxRunning).toBe(false);
    expect(circle(0).isTransitioning).toBe(true);
  });

  test('engine without isTransitioning is treated as not transitioning', () => {
    delete logic.isTransitioning;
    setup();
    expect(circle(0).isTransitioning).toBe(false);
  });
});

describe('playing circle tracking', () => {
  test('follows onCircleChange from the engine and is cleared by pausing', () => {
    const { rerender, props } = setup({ isPaused: false });
    act(() => lastLogicArgs().onCircleChange(1));
    expect(circle(0).isPlaying).toBe(false);
    expect(circle(1).isPlaying).toBe(true);
    expect(lastLogicArgs().playingCircle).toBe(1);
    expect(lastLogicArgs().subdivisions).toBe(3);
    rerender(<MultiCircleMetronome {...props} isPaused />);
    expect(circle(1).isPlaying).toBe(false);
  });
});

describe('transport', () => {
  test('shows Start while paused and Pause (pressed) while playing', () => {
    const { rerender, props } = setup();
    expect(screen.getByRole('button', { name: 'Start' })).toHaveAttribute('aria-pressed', 'false');
    rerender(<MultiCircleMetronome {...props} isPaused={false} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Start prepares audio first, then selects circle 0 and unpauses', async () => {
    let finishInit;
    logic.safelyInitAudioContext = jest.fn(() => new Promise(r => { finishInit = r; }));
    setup();
    act(() => lastLogicArgs().onCircleChange(1));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(logic.safelyInitAudioContext).toHaveBeenCalledTimes(1);
    expect(handlers.setIsPaused).not.toHaveBeenCalled();
    await act(async () => { finishInit(); });
    expect(handlers.setIsPaused).toHaveBeenCalledWith(false);
    expect(circle(1).isPlaying).toBe(false);
  });

  test('Pause pauses, stops the scheduler and resets the playing circle to the first', () => {
    setup({ isPaused: false });
    act(() => lastLogicArgs().onCircleChange(1));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(handlers.setIsPaused).toHaveBeenCalledWith(true);
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
    expect(lastLogicArgs().playingCircle).toBe(0);
  });

  test('Pause works for an engine that has no stopScheduler', () => {
    delete logic.stopScheduler;
    setup({ isPaused: false });
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(handlers.setIsPaused).toHaveBeenCalledWith(true);
  });

  test('a press while the engine is still processing the last one is ignored', () => {
    logic.isProcessingPlayPauseRef.current = true;
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(logic.safelyInitAudioContext).not.toHaveBeenCalled();
    expect(handlers.setIsPaused).not.toHaveBeenCalled();
  });

  test('without an engine nothing happens', () => {
    useMultiCircleMetronomeLogic.mockImplementation(() => null);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(handlers.setIsPaused).not.toHaveBeenCalled();
  });

  test('characterization: an engine without safelyInitAudioContext makes Start a silent no-op', () => {
    // see report: MultiCircleMetronome.js handlePlayPause (optional call short-circuits `.then`)
    delete logic.safelyInitAudioContext;
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(handlers.setIsPaused).not.toHaveBeenCalled();
  });

  test('registers the toggle with the parent (keyboard shortcut) and unregisters on unmount', () => {
    const { unmount } = setup({ isPaused: false });
    const toggle = handlers.registerTogglePlay.mock.calls.at(-1)[0];
    act(() => toggle());
    expect(handlers.setIsPaused).toHaveBeenCalledWith(true);
    unmount();
    expect(handlers.registerTogglePlay).toHaveBeenLastCalledWith(null);
  });

  test('works without registration callbacks', () => {
    const { unmount } = setup({ registerTogglePlay: undefined, registerTapTempo: undefined });
    expect(() => unmount()).not.toThrow();
  });

  describe('tap tempo', () => {
    test('the Tap button calls the engine\'s tap tempo', () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
      expect(logic.tapTempo).toHaveBeenCalledTimes(1);
    });

    test('without an engine tap function a browser event with the timestamp is dispatched', () => {
      delete logic.tapTempo;
      const seen = [];
      const listener = e => seen.push(e.detail.timestamp);
      window.addEventListener('metronome-tap-tempo', listener);
      jest.spyOn(performance, 'now').mockReturnValue(4321);
      setup();
      fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
      window.removeEventListener('metronome-tap-tempo', listener);
      expect(seen).toEqual([4321]);
    });

    test('registers the engine\'s tap function with the parent and removes it on unmount', () => {
      const { unmount } = setup();
      expect(handlers.registerTapTempo).toHaveBeenCalledWith(logic.tapTempo);
      unmount();
      expect(handlers.registerTapTempo).toHaveBeenLastCalledWith(null);
    });

    test('does not register anything when the engine has no tap function', () => {
      delete logic.tapTempo;
      setup();
      expect(handlers.registerTapTempo).not.toHaveBeenCalledWith(expect.any(Function));
    });
  });
});

describe('editing circles', () => {
  test('Add appends a circle that alternates beat count (3<->4) and note value relative to the last one', () => {
    setup();
    const add = screen.getByRole('button', { name: 'Add rhythm circle' });
    fireEvent.click(add);
    fireEvent.click(add);
    const [, , third, fourth] = lastLogicArgs().circleSettings;
    expect(third).toEqual({ subdivisions: 4, accents: [3, 1, 1, 1], beatMode: 'eighth' });
    expect(fourth).toEqual({ subdivisions: 3, accents: [3, 1, 1], beatMode: 'quarter' });
    expect(screen.getByText('4', { selector: '.circle-actions-count' })).toBeInTheDocument();
  });

  test('Add is disabled at four circles on a phone-width window and unlimited otherwise', () => {
    window.innerWidth = 599;
    const { unmount } = setup();
    const add = () => screen.getByRole('button', { name: 'Add rhythm circle' });
    fireEvent.click(add());
    expect(add()).toBeEnabled();
    fireEvent.click(add());
    expect(lastLogicArgs().circleSettings).toHaveLength(4);
    expect(add()).toBeDisabled();
    unmount();

    window.innerWidth = 600;
    setup();
    for (let i = 0; i < 6; i += 1) fireEvent.click(add());
    expect(lastLogicArgs().circleSettings).toHaveLength(8);
    expect(add()).toBeEnabled();
  });

  test('Remove deletes the selected circle and is disabled for the last one', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove circle 1' }));
    expect(lastLogicArgs().circleSettings).toHaveLength(1);
    expect(lastLogicArgs().circleSettings[0].subdivisions).toBe(3);
    expect(screen.getByRole('button', { name: 'Remove circle 1' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove circle 1' }));
    expect(lastLogicArgs().circleSettings).toHaveLength(1);
  });

  describe('index bookkeeping when a circle is removed', () => {
    const withThree = () => {
      setup({ isPaused: false });
      fireEvent.click(screen.getByRole('button', { name: 'Add rhythm circle' }));
    };

    test('removing the selected circle selects the first one again', () => {
      withThree();
      fireEvent.click(screen.getByText('select 2'));
      fireEvent.click(screen.getByText('remove 2'));
      expect(circle(0).isActiveUI).toBe(true);
    });

    test('removing a circle before the selected one keeps the same circle selected', () => {
      withThree();
      fireEvent.click(screen.getByText('select 2'));
      fireEvent.click(screen.getByText('remove 0'));
      expect(lastLogicArgs().circleSettings).toHaveLength(2);
      expect(circle(1).isActiveUI).toBe(true);
    });

    test('removing a circle after the selected one leaves the selection alone', () => {
      withThree();
      fireEvent.click(screen.getByText('select 1'));
      fireEvent.click(screen.getByText('remove 2'));
      expect(circle(1).isActiveUI).toBe(true);
    });

    test('removing the playing circle moves playback to circle 0', () => {
      withThree();
      act(() => lastLogicArgs().onCircleChange(2));
      fireEvent.click(screen.getByText('remove 2'));
      expect(lastLogicArgs().playingCircle).toBe(0);
    });

    test('removing a circle before the playing one shifts the playing index down', () => {
      withThree();
      act(() => lastLogicArgs().onCircleChange(2));
      fireEvent.click(screen.getByText('remove 0'));
      expect(lastLogicArgs().playingCircle).toBe(1);
    });

    test('removing a circle after the playing one leaves it', () => {
      withThree();
      act(() => lastLogicArgs().onCircleChange(0));
      fireEvent.click(screen.getByText('remove 2'));
      expect(lastLogicArgs().playingCircle).toBe(0);
    });
  });

  describe('accent editing', () => {
    let events;
    const listener = e => events.push(e.detail);
    beforeEach(() => { events = []; window.addEventListener('accent-change', listener); });
    afterEach(() => window.removeEventListener('accent-change', listener));

    test('cycles 0 -> 1 -> 2 -> 3 -> 0 on the SELECTED circle', () => {
      setup();
      fireEvent.click(screen.getByText('accent 0'));
      expect(lastLogicArgs().circleSettings[0].accents).toEqual([3, 2, 1, 1]);
      fireEvent.click(screen.getByText('accent 0'));
      fireEvent.click(screen.getByText('accent 0'));
      expect(lastLogicArgs().circleSettings[0].accents).toEqual([3, 0, 1, 1]);
      fireEvent.click(screen.getByText('accent 0'));
      expect(lastLogicArgs().circleSettings[0].accents).toEqual([3, 1, 1, 1]);
    });

    test('edits the selected circle even if the click came from another circle', () => {
      // characterization: the circle index argument is ignored for accent edits
      setup();
      fireEvent.click(screen.getByText('accent 1'));
      expect(lastLogicArgs().circleSettings[0].accents).toEqual([3, 2, 1, 1]);
      expect(lastLogicArgs().circleSettings[1].accents).toEqual([3, 1, 1]);
    });

    test('announces the edit for debugging, including whether the circle is the playing one', () => {
      setup({ isPaused: false });
      fireEvent.click(screen.getByText('accent 0'));
      expect(events).toEqual([{ circleIndex: 0, beatIndex: 1, playingCircleIndex: 0, isPlayingCircle: true }]);
      fireEvent.click(screen.getByText('select 1'));
      fireEvent.click(screen.getByText('accent 1'));
      expect(events.at(-1)).toEqual({ circleIndex: 1, beatIndex: 1, playingCircleIndex: 0, isPlayingCircle: false });
    });

    test('a beat index beyond the bar changes nothing', () => {
      setup();
      fireEvent.click(screen.getByText('accent-oob 0'));
      expect(lastLogicArgs().circleSettings[0].accents).toEqual([3, 1, 1, 1]);
    });

    test('"remove" from the ring removes that circle instead of editing', () => {
      setup();
      fireEvent.click(screen.getByText('remove 1'));
      expect(lastLogicArgs().circleSettings).toHaveLength(1);
      expect(events).toEqual([]);
    });
  });

  test('the controls panel edits the selected circle: 7 beats resets its accents', () => {
    setup();
    fireEvent.click(screen.getByText('select 1'));
    fireEvent.click(screen.getByRole('button', { name: '7 beats per bar' }));
    expect(lastLogicArgs().circleSettings[1]).toEqual({ subdivisions: 7, beatMode: 'quarter', accents: [3, 1, 1, 1, 1, 1, 1] });
    expect(lastLogicArgs().circleSettings[0].subdivisions).toBe(4);
  });
});

describe('layout of the circles', () => {
  const area = (width, height) => useVizCardSize.mockReturnValue([{ current: null }, { width, height }]);
  // eslint-disable-next-line testing-library/no-node-access
  const container = () => document.querySelector('.circles-container');

  test('before the area is measured: 120px rings in two columns and no layout variables', () => {
    setup();
    expect(circle(0).ring).toBe(120);
    expect(container().getAttribute('style')).toBeNull();
  });

  test('a wide area puts two circles side by side with the ring capped at 260', () => {
    area(800, 400);
    setup();
    expect(circle(0).ring).toBe(260);
    expect(container().style.getPropertyValue('--seq-columns')).toBe('2');
    expect(container().style.getPropertyValue('--seq-gap')).toBe('72px');
  });

  test('a tall narrow area stacks the circles in one column', () => {
    area(300, 600);
    setup();
    expect(container().style.getPropertyValue('--seq-columns')).toBe('1');
    expect(circle(0).ring).toBe(199);
  });

  test('a tiny area never shrinks the rings below 64px', () => {
    area(100, 120);
    setup();
    expect(circle(0).ring).toBe(64);
  });

  test('more circles shrink the ring in the same area', () => {
    area(800, 400);
    setup();
    const two = circle(0).ring;
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Add rhythm circle' }));
    expect(circle(0).ring).toBeLessThan(two);
    expect(circle(0).ring).toBeGreaterThanOrEqual(64);
  });

  test('a zero-size area counts as not measured', () => {
    area(800, 0);
    setup();
    expect(circle(0).ring).toBe(120);
  });
});

describe('responsive sizes', () => {
  test('phone widths use the window width minus 40, up to 400', () => {
    window.innerWidth = 500;
    setup();
    expect(circle(0)).toMatchObject({ containerSize: 400, radius: 200, isMobile: true });
    window.innerWidth = 360;
    fireEvent(window, new Event('resize'));
    expect(circle(0)).toMatchObject({ containerSize: 320, radius: 160, isMobile: true });
  });

  test('wide windows use 300, or 210 in landscape, and are not mobile', () => {
    window.innerWidth = 1280;
    window.matchMedia = jest.fn(() => ({ matches: false }));
    setup();
    expect(circle(0)).toMatchObject({ containerSize: 300, isMobile: false });
    window.matchMedia = jest.fn(() => ({ matches: true }));
    fireEvent(window, new Event('resize'));
    expect(circle(0).containerSize).toBe(210);
    delete window.matchMedia;
  });

  test('the 768px boundary: 767 is mobile, 768 is not', () => {
    window.innerWidth = 767;
    setup();
    expect(circle(0).isMobile).toBe(true);
    window.innerWidth = 768;
    fireEvent(window, new Event('resize'));
    expect(circle(0).isMobile).toBe(false);
  });

  test('the resize listener is removed on unmount', () => {
    const remove = jest.spyOn(window, 'removeEventListener');
    const { unmount } = setup();
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

describe('training integration', () => {
  test('the accelerate button only exists for speed modes 1 and 2', () => {
    const { unmount } = setup({ speedMode: 0 });
    expect(screen.queryByRole('button', { name: /Accelerate tempo/ })).toBeNull();
    unmount();
    setup({ speedMode: 2 });
    expect(screen.getByRole('button', { name: 'Accelerate tempo in Manual Speed Training Mode' })).toBeInTheDocument();
  });

  test('accelerating while playing raises the tempo by the configured percent (max +10) and refreshes the training UI', () => {
    const updates = jest.fn();
    window.addEventListener('training-measure-update', updates);
    setup({ isPaused: false, speedMode: 1, tempo: 100, tempoIncreasePercent: 5 });
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo/ }));
    window.removeEventListener('training-measure-update', updates);
    expect(handlers.setTempo).toHaveBeenCalledWith(105);
    expect(updates).toHaveBeenCalled();
  });

  test('accelerating is ignored while paused', () => {
    setup({ isPaused: true, speedMode: 1 });
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo/ }));
    expect(handlers.setTempo).not.toHaveBeenCalled();
  });

  test('accelerating with a 0 percent increase does nothing', () => {
    setup({ isPaused: false, speedMode: 1, tempoIncreasePercent: 0 });
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo/ }));
    expect(handlers.setTempo).not.toHaveBeenCalled();
  });

  test('accelerating in speed mode 2 with macro off still refreshes the training UI', () => {
    const updates = jest.fn();
    window.addEventListener('training-measure-update', updates);
    setup({ isPaused: false, speedMode: 2, tempo: 100, tempoIncreasePercent: 10 });
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo/ }));
    window.removeEventListener('training-measure-update', updates);
    expect(handlers.setTempo).toHaveBeenCalledWith(110);
    expect(updates).toHaveBeenCalled();
  });

  describe('syncing training counters with the parent', () => {
    beforeEach(() => jest.useFakeTimers());

    test('copies the parent counters on mount and writes them back every 500 ms', () => {
      const refs = {
        measureCountRef: { current: 3 }, muteMeasureCountRef: { current: 1 }, isSilencePhaseRef: { current: true }
      };
      setup(refs);
      refs.measureCountRef.current = 99; // an external write
      refs.muteMeasureCountRef.current = 99;
      refs.isSilencePhaseRef.current = false;
      act(() => { jest.advanceTimersByTime(499); });
      expect(refs.measureCountRef.current).toBe(99);
      act(() => { jest.advanceTimersByTime(1); });
      // characterization: current behaviour, see report: the local copy overwrites external changes
      expect(refs.measureCountRef.current).toBe(3);
      expect(refs.muteMeasureCountRef.current).toBe(1);
      expect(refs.isSilencePhaseRef.current).toBe(true);
      expect(window.isSilencePhaseRef).toBe(refs.isSilencePhaseRef);
    });

    test('hands the ring renderers a silence ref that mirrors the parent value', () => {
      setup({ isSilencePhaseRef: { current: true }, macroMode: 1 });
      expect(circle(0).isSilencePhaseRef.current).toBe(true);
      expect(circle(0).macroMode).toBe(1);
    });

    test('without parent refs it publishes its own silence ref', () => {
      setup();
      act(() => { jest.advanceTimersByTime(500); });
      expect(window.isSilencePhaseRef).toBe(circle(0).isSilencePhaseRef);
    });

    test('stops syncing on unmount', () => {
      const { unmount } = setup({ measureCountRef: { current: 0 } });
      unmount();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

describe('events and sounds', () => {
  test('a beat-mode-change event for the playing circle mirrors the tempo into window.currentTempo', () => {
    setup({ tempo: 141 });
    act(() => { window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { beatMode: 'eighth', beatMultiplier: 2, circleIndex: 0 } })); });
    expect(window.currentTempo).toBe(141);
  });

  test('a beat-mode-change event for another circle (or without index) is ignored', () => {
    setup({ tempo: 141 });
    act(() => { window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { beatMode: 'eighth', beatMultiplier: 2, circleIndex: 1 } })); });
    act(() => { window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { beatMode: 'eighth', beatMultiplier: 2 } })); });
    expect(window.currentTempo).toBeUndefined();
  });

  test('the beat-mode listener is removed on unmount', () => {
    const { unmount } = setup({ tempo: 141 });
    unmount();
    window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { circleIndex: 0 } }));
    expect(window.currentTempo).toBeUndefined();
  });

  describe('sound set reload', () => {
    test('does nothing while the trigger is 0', () => {
      setup({ soundSetReloadTrigger: 0 });
      expect(logic.reloadSounds).not.toHaveBeenCalled();
    });

    test('reloads when the trigger becomes non-zero and again on every change', async () => {
      const { rerender, props } = setup({ soundSetReloadTrigger: 1 });
      await settle();
      expect(logic.reloadSounds).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('Reloaded sound buffers after settings changed');
      rerender(<MultiCircleMetronome {...props} soundSetReloadTrigger={2} />);
      await settle();
      expect(logic.reloadSounds).toHaveBeenCalledTimes(2);
    });

    test('logs a warning when reloading reports failure and an error when it rejects', async () => {
      logic.reloadSounds = jest.fn(() => Promise.resolve(false));
      const { rerender, props } = setup({ soundSetReloadTrigger: 1 });
      await settle();
      expect(console.warn).toHaveBeenCalledWith('Failed to reload sound buffers');
      const failure = new Error('decode');
      logic.reloadSounds = jest.fn(() => Promise.reject(failure));
      rerender(<MultiCircleMetronome {...props} soundSetReloadTrigger={2} />);
      await settle();
      expect(console.error).toHaveBeenCalledWith('Error reloading sound buffers:', failure);
    });

    test('an engine without reloadSounds is tolerated', () => {
      delete logic.reloadSounds;
      expect(() => setup({ soundSetReloadTrigger: 3 })).not.toThrow();
    });
  });
});
