import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CircleRenderer from '../../../components/metronome/MultiCircleMode/CircleRenderer';

const base = {
  settings: { subdivisions: 4, accents: [3, 1, 2, 0], beatMode: 'quarter' },
  idx: 0, isActiveUI: true, isPlaying: false, currentSubdivision: 0, isPaused: true,
  audioCtxRunning: false, isTransitioning: false, radius: 100, containerSize: 200,
  circleSettings: [], macroMode: 0, ring: 120
};
const renderCircle = (props = {}) => {
  const updateAccent = jest.fn();
  const setActiveCircle = jest.fn();
  const utils = render(<CircleRenderer {...base} updateAccent={updateAccent} setActiveCircle={setActiveCircle} {...props} />);
  return { ...utils, updateAccent, setActiveCircle };
};
const beat = (circle, n) => screen.getByRole('button', { name: new RegExp(`^Circle ${circle}, beat ${n}:`) });

describe('CircleRenderer', () => {
  test('renders one labelled button per beat with the accent state in the name', () => {
    renderCircle({ idx: 1 });
    expect(beat(2, 1)).toHaveAccessibleName('Circle 2, beat 1: first beat. Activate to change accent.');
    expect(beat(2, 2)).toHaveAccessibleName('Circle 2, beat 2: normal. Activate to change accent.');
    expect(beat(2, 3)).toHaveAccessibleName('Circle 2, beat 3: accent. Activate to change accent.');
    expect(beat(2, 4)).toHaveAccessibleName('Circle 2, beat 4: muted. Activate to change accent.');
    expect(screen.getAllByRole('button', { name: /beat \d/ })).toHaveLength(4);
  });

  test('aria-pressed is true for accents and first beats, false for normal and absent for muted', () => {
    renderCircle();
    expect(beat(1, 1)).toHaveAttribute('aria-pressed', 'true');
    expect(beat(1, 2)).toHaveAttribute('aria-pressed', 'false');
    expect(beat(1, 3)).toHaveAttribute('aria-pressed', 'true');
    expect(beat(1, 4)).not.toHaveAttribute('aria-pressed');
    expect(beat(1, 4)).toHaveClass('is-muted');
  });

  test('shows the beat count and the position number', () => {
    renderCircle({ settings: { subdivisions: 7, accents: [], beatMode: 'quarter' }, idx: 2 });
    expect(screen.getByText('7 beats')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select circle 3 for editing' })).toHaveTextContent('3');
  });

  test('the select button activates this circle and reflects the selection', () => {
    const { setActiveCircle, rerender } = renderCircle({ idx: 2, isActiveUI: false });
    const select = screen.getByRole('button', { name: 'Select circle 3 for editing' });
    expect(select).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(select);
    expect(setActiveCircle).toHaveBeenCalledWith(2);
    rerender(<CircleRenderer {...base} idx={2} isActiveUI updateAccent={jest.fn()} setActiveCircle={setActiveCircle} />);
    expect(screen.getByRole('button', { name: 'Select circle 3 for editing' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('beat buttons are only enabled on the selected circle and report their index', () => {
    const { updateAccent } = renderCircle({ isActiveUI: true });
    fireEvent.click(beat(1, 3));
    expect(updateAccent).toHaveBeenCalledWith(2);
  });

  test('beat buttons are disabled on a circle that is not selected', () => {
    const { updateAccent } = renderCircle({ isActiveUI: false });
    expect(beat(1, 1)).toBeDisabled();
    fireEvent.click(beat(1, 1));
    expect(updateAccent).not.toHaveBeenCalled();
  });

  describe('current beat highlighting', () => {
    const playing = { isPlaying: true, isPaused: false, audioCtxRunning: true, currentSubdivision: 2 };

    test('only the sounding beat of the playing circle is marked current', () => {
      renderCircle(playing);
      expect(beat(1, 3)).toHaveClass('is-current');
      [1, 2, 4].forEach(n => expect(beat(1, n)).not.toHaveClass('is-current'));
    });

    test.each([
      ['not playing', { isPlaying: false }],
      ['paused', { isPaused: true }],
      ['audio context not running', { audioCtxRunning: false }]
    ])('nothing is current when %s', (_name, override) => {
      renderCircle({ ...playing, ...override });
      screen.getAllByRole('button', { name: /beat \d/ }).forEach(b => expect(b).not.toHaveClass('is-current'));
    });

    test('a transition is flagged on the beats only for the playing circle', () => {
      const { unmount } = renderCircle({ ...playing, isTransitioning: true });
      expect(beat(1, 1)).toHaveClass('transitioning');
      unmount();
      renderCircle({ ...playing, isPlaying: false, isTransitioning: true });
      expect(beat(1, 1)).not.toHaveClass('transitioning');
    });

    test('the highlight is shown even while transitioning', () => {
      renderCircle({ ...playing, isTransitioning: true });
      expect(beat(1, 3)).toHaveClass('is-current');
    });
  });

  describe('surface state classes and size', () => {
    const surfaceOf = () => screen.getByRole('button', { name: /Select circle/ }).parentElement; // eslint-disable-line testing-library/no-node-access

    test('selected / playing / small flags', () => {
      renderCircle({ isActiveUI: true, isPlaying: true, ring: 109 });
      expect(surfaceOf()).toHaveClass('multi-circle-surface', 'is-selected', 'is-playing', 'is-small');
    });

    test('no flags for an idle, large circle', () => {
      renderCircle({ isActiveUI: false, isPlaying: false, ring: 110 });
      const s = surfaceOf();
      expect(s).not.toHaveClass('is-selected');
      expect(s).not.toHaveClass('is-playing');
      expect(s).not.toHaveClass('is-small');
    });

    test('the surface is ring x ring pixels and exposes the mark size as a CSS variable', () => {
      renderCircle({ ring: 150 });
      expect(surfaceOf()).toHaveStyle({ width: '150px', height: '150px', '--mark': '22px' });
    });

    test.each([[60, '16px'], [90, '18px'], [200, '22px']])('mark size follows ring %i -> %s (clamped 16..22)', (ring, mark) => {
      renderCircle({ ring });
      expect(surfaceOf().style.getPropertyValue('--mark')).toBe(mark);
    });

    test('the ring defaults to 0 when the parent has not measured yet', () => {
      renderCircle({ ring: undefined });
      expect(surfaceOf()).toHaveStyle({ width: '0px', height: '0px' });
    });
  });

  describe('silent phase', () => {
    const surfaceOf = () => screen.getByRole('button', { name: /Select circle/ }).parentElement; // eslint-disable-line testing-library/no-node-access

    test('is flagged for the playing circle while training silence is active', () => {
      renderCircle({ isPlaying: true, macroMode: 1, isSilencePhaseRef: { current: true } });
      expect(surfaceOf()).toHaveClass('is-silent');
    });

    test.each([
      ['macro mode off', { macroMode: 0, isSilencePhaseRef: { current: true } }],
      ['circle not playing', { isPlaying: false, macroMode: 1, isSilencePhaseRef: { current: true } }],
      ['no silence phase', { macroMode: 1, isSilencePhaseRef: { current: false } }],
      ['no ref', { macroMode: 1, isSilencePhaseRef: undefined }]
    ])('is not flagged with %s', (_name, override) => {
      renderCircle({ isPlaying: true, ...override });
      expect(surfaceOf()).not.toHaveClass('is-silent');
    });
  });

  describe('beat geometry and fallbacks', () => {
    test('beat 1 sits at the top and beat 2 of 4 at the right of the circle', () => {
      renderCircle({ ring: 120 });
      // radius 60, hit 44 -> half 22
      expect(beat(1, 1).style.top).toBe('calc(50% + -60px - 22px)');
      expect(beat(1, 1).style.left).toMatch(/^calc\(50% \+ [0-9.e-]+px - 22px\)$/); // ~0 (cos 90 deg)
      expect(beat(1, 2).style.left).toBe('calc(50% + 60px - 22px)');
    });

    test('the touch target shrinks on crowded rings but never below 28px or above 44px', () => {
      const { unmount } = renderCircle({ ring: 64, settings: { subdivisions: 9, accents: [] } });
      expect(beat(1, 1)).toHaveStyle({ width: '28px', height: '28px' });
      unmount();
      renderCircle({ ring: 260, settings: { subdivisions: 2, accents: [] } });
      expect(beat(1, 1)).toHaveStyle({ width: '44px', height: '44px' });
    });

    test('treats missing subdivisions as four beats', () => {
      renderCircle({ settings: { accents: [3, 1, 1, 1] } });
      expect(screen.getAllByRole('button', { name: /beat \d/ })).toHaveLength(4);
    });

    test('beats without a stored accent default to first beat for beat 1 and normal after that', () => {
      renderCircle({ settings: { subdivisions: 3, accents: [2] } });
      expect(beat(1, 1)).toHaveAccessibleName(/accent\./);
      expect(beat(1, 2)).toHaveAccessibleName(/normal\./);
      expect(beat(1, 3)).toHaveAccessibleName(/normal\./);
    });

    test('a missing accents array falls back to first beat + normal beats', () => {
      renderCircle({ settings: { subdivisions: 3 } });
      expect(beat(1, 1)).toHaveAccessibleName(/first beat\./);
      expect(beat(1, 2)).toHaveAccessibleName(/normal\./);
    });

    test('an out-of-range accent value is drawn like a normal beat (label degrades)', () => {
      // characterization: current behaviour, see report (label becomes "undefined")
      renderCircle({ settings: { subdivisions: 2, accents: [7, 1] } });
      expect(beat(1, 1)).toHaveAccessibleName('Circle 1, beat 1: undefined. Activate to change accent.');
    });
  });
});
