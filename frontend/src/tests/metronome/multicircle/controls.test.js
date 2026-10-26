// MultiCircleControls with the real selectors.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MultiCircleControls from '../../../components/metronome/MultiCircleMode/MultiCircleControls';

const bar = (subdivisions, beatMode = 'quarter') => ({
  subdivisions, beatMode, accents: Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
});
const slider = name => screen.getByRole('slider', { name });

/** setState stand-in that remembers the last updater result for a given previous state. */
function stateSetter(initial) {
  const setter = jest.fn();
  setter.resultFor = (call = setter.mock.calls.length - 1) => setter.mock.calls[call][0](initial);
  return setter;
}

describe('MultiCircleControls', () => {
  let events;
  const listener = e => events.push(e);
  beforeEach(() => {
    events = [];
    jest.spyOn(console, 'log').mockImplementation(() => {});
    window.addEventListener('beat-mode-change', listener);
  });
  afterEach(() => {
    window.removeEventListener('beat-mode-change', listener);
    jest.restoreAllMocks();
  });

  const setup = (props = {}) => {
    const circleSettings = props.circleSettings || [bar(4), bar(3)];
    const setCircleSettings = stateSetter(circleSettings);
    const handlers = { setTempo: jest.fn(), setVolume: jest.fn(), setSwing: jest.fn() };
    render(
      <MultiCircleControls
        circleSettings={circleSettings} setCircleSettings={setCircleSettings}
        activeCircle={0} playingCircle={0} tempo={120} volume={0.5} swing={0.1}
        {...handlers} {...props}
      />
    );
    return { setCircleSettings, ...handlers };
  };

  test('headings name the circle being edited', () => {
    setup({ activeCircle: 1 });
    expect(screen.getByRole('heading', { name: /Note value\s*Circle 2/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Beats per bar\s*Circle 2/ })).toBeInTheDocument();
  });

  test('the selectors reflect the active circle', () => {
    setup({ circleSettings: [bar(4, 'quarter'), bar(6, 'eighth')], activeCircle: 1 });
    expect(screen.getByRole('button', { name: 'Eighth Notes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Quarter Notes' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '6 beats per bar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '4 beats per bar' })).toHaveAttribute('aria-pressed', 'false');
  });

  describe('note value', () => {
    test('changes only the active circle and keeps its other fields', () => {
      const { setCircleSettings } = setup({ activeCircle: 1 });
      fireEvent.click(screen.getByRole('button', { name: 'Eighth Notes' }));
      const next = setCircleSettings.resultFor(0);
      expect(next[0]).toEqual(bar(4));
      expect(next[1]).toEqual({ ...bar(3), beatMode: 'eighth' });
    });

    test('announces the change for the playing circle, with multiplier 2 for eighths and 1 for quarters', () => {
      const { setCircleSettings } = setup({ activeCircle: 0, playingCircle: 0 });
      fireEvent.click(screen.getByRole('button', { name: 'Eighth Notes' }));
      setCircleSettings.resultFor(0);
      fireEvent.click(screen.getByRole('button', { name: 'Quarter Notes' }));
      setCircleSettings.resultFor(1);
      const ours = events.filter(e => e.detail.circleIndex === 0);
      expect(ours.map(e => [e.detail.beatMode, e.detail.beatMultiplier])).toEqual([['eighth', 2], ['quarter', 1]]);
    });

    test('is silent about other circles', () => {
      const { setCircleSettings } = setup({ activeCircle: 1, playingCircle: 0 });
      fireEvent.click(screen.getByRole('button', { name: 'Eighth Notes' }));
      setCircleSettings.resultFor(0);
      expect(events.filter(e => e.detail.circleIndex !== undefined)).toEqual([]);
    });
  });

  describe('beats per bar', () => {
    test('sets the count and resets the accents to a first beat followed by normal beats', () => {
      const circles = [{ ...bar(4), accents: [0, 2, 2, 2] }, bar(3)];
      const { setCircleSettings } = setup({ circleSettings: circles, activeCircle: 0 });
      fireEvent.click(screen.getByRole('button', { name: '6 beats per bar' }));
      expect(setCircleSettings.resultFor(0)[0]).toEqual({ subdivisions: 6, beatMode: 'quarter', accents: [3, 1, 1, 1, 1, 1] });
    });

    test('the stepper buttons go one beat at a time and stop at the ends', () => {
      const { setCircleSettings } = setup({ circleSettings: [bar(4)], activeCircle: 0 });
      fireEvent.click(screen.getByRole('button', { name: 'More beats per bar' }));
      expect(setCircleSettings.resultFor(0)[0].subdivisions).toBe(5);
      fireEvent.click(screen.getByRole('button', { name: 'Fewer beats per bar' }));
      expect(setCircleSettings.resultFor(1)[0].subdivisions).toBe(3);
    });

    test('keeps the state when the active circle no longer exists', () => {
      const circles = [bar(4)];
      const { setCircleSettings } = setup({ circleSettings: circles, activeCircle: 2 });
      fireEvent.click(screen.getByRole('button', { name: '5 beats per bar' }));
      expect(setCircleSettings.resultFor(0)).toBe(circles);
    });

    test('falls back to a 4-beat quarter circle for display when the active circle is missing', () => {
      setup({ circleSettings: [bar(4)], activeCircle: 2 });
      expect(screen.getByRole('button', { name: '4 beats per bar' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Quarter Notes' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('sliders', () => {
    test('tempo, volume and swing are shown with their values and bounds', () => {
      setup();
      expect(slider('Tempo')).toHaveValue('120');
      expect(slider('Tempo')).toHaveAttribute('min', '15');
      expect(slider('Tempo')).toHaveAttribute('max', '240');
      expect(slider('Volume')).toHaveAttribute('max', '1');
      expect(slider('Swing')).toHaveAttribute('max', '0.5');
      expect(screen.getByRole('button', { name: 'Edit Swing' })).toHaveTextContent('Swing20%');
    });

    test('moving a slider reports the number', () => {
      const { setTempo, setVolume, setSwing } = setup();
      fireEvent.change(slider('Tempo'), { target: { value: '90' } });
      fireEvent.change(slider('Volume'), { target: { value: '0.25' } });
      fireEvent.change(slider('Swing'), { target: { value: '0.3' } });
      expect(setTempo).toHaveBeenCalledWith(90);
      expect(setVolume).toHaveBeenCalledWith(0.25);
      expect(setSwing).toHaveBeenCalledWith(0.3);
    });

    test('the tempo has +/- step buttons', () => {
      const { setTempo } = setup({ tempo: 100 });
      fireEvent.click(screen.getByRole('button', { name: 'Tempo plus 1' }));
      expect(setTempo).toHaveBeenCalledWith(101);
    });

    test('swing is always available, also for odd bar lengths', () => {
      setup({ circleSettings: [bar(3)] });
      expect(slider('Swing')).toBeInTheDocument();
    });

    test('typing into the tempo field is parsed and clamped to 15..240', () => {
      const { setTempo } = setup();
      fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
      const input = screen.getByTestId('editable-input');
      fireEvent.change(input, { target: { value: '999 BPM' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(setTempo).toHaveBeenCalledWith(240);
    });

    test('typing into the volume field accepts percentages', () => {
      const { setVolume } = setup();
      fireEvent.click(screen.getByRole('button', { name: 'Edit Volume' }));
      const input = screen.getByTestId('editable-input');
      fireEvent.change(input, { target: { value: '30%' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(setVolume).toHaveBeenCalledWith(0.3);
    });

    test('typing into the swing field maps 100% to the 0.5 maximum', () => {
      const { setSwing } = setup();
      fireEvent.click(screen.getByRole('button', { name: 'Edit Swing' }));
      const input = screen.getByTestId('editable-input');
      fireEvent.change(input, { target: { value: '50%' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(setSwing).toHaveBeenCalledWith(0.25);
    });
  });
});
