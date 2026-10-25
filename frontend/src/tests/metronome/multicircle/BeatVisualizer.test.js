import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BeatVisualizer from '../../../components/metronome/MultiCircleMode/BeatVisualizer';

// The component returns an array of nodes; a wrapper makes it renderable.
const Wrap = props => <div data-testid="wrap">{BeatVisualizer(props)}</div>;
const base = {
  settings: { subdivisions: 4, accents: [3, 2, 1, 1], beatMode: 'quarter' },
  idx: 1, isActiveUI: true, isPlaying: true, currentSubdivision: 0, isPaused: false,
  audioCtxRunning: true, isTransitioning: false, radius: 80, circleSettings: [{}]
};
const setup = (props = {}) => {
  const updateAccent = jest.fn();
  const utils = render(<Wrap {...base} updateAccent={updateAccent} {...props} />);
  return { updateAccent, ...utils };
};
const beats = () => screen.getAllByRole('img');

describe('BeatVisualizer', () => {
  test('draws one image per beat, labelled Beat 0..n-1', () => {
    setup();
    expect(beats().map(i => i.getAttribute('alt'))).toEqual(['Beat 0', 'Beat 1', 'Beat 2', 'Beat 3']);
  });

  test('uses the icon of the accent level: 3 first, 2 accent, otherwise normal', () => {
    setup({ currentSubdivision: 9 });
    expect(beats().map(i => i.getAttribute('src'))).toEqual([
      expect.stringContaining('firstBeat.svg'),
      expect.stringContaining('accentedBeat.svg'),
      expect.stringContaining('normalBeat.svg'),
      expect.stringContaining('normalBeat.svg')
    ]);
  });

  test('the sounding beat of the playing circle uses the active icon and class', () => {
    setup({ currentSubdivision: 1 });
    const [first, second] = beats();
    expect(first.getAttribute('src')).toContain('firstBeat.svg');
    expect(first).not.toHaveClass('beat-icon-active');
    expect(second.getAttribute('src')).toContain('accentedBeatActive.svg');
    expect(second).toHaveClass('beat-icon', 'beat-icon-active');
  });

  test.each([
    ['normal beat', { currentSubdivision: 2 }, 'normalBeatActive.svg'],
    ['first beat', { currentSubdivision: 0 }, 'firstBeatActive.svg']
  ])('active %s uses the matching active icon', (_n, props, file) => {
    setup(props);
    expect(beats()[props.currentSubdivision].getAttribute('src')).toContain(file);
  });

  test.each([
    ['not playing', { isPlaying: false }],
    ['paused', { isPaused: true }],
    ['audio not running', { audioCtxRunning: false }],
    ['transitioning', { isTransitioning: true }]
  ])('no beat is active when %s', (_n, props) => {
    setup(props);
    beats().forEach(i => expect(i).not.toHaveClass('beat-icon-active'));
  });

  test('clicking a beat on the selected circle reports its index', () => {
    const { updateAccent } = setup();
    fireEvent.click(beats()[2]);
    expect(updateAccent).toHaveBeenCalledWith(2);
    expect(beats()[2]).toHaveStyle({ cursor: 'pointer' });
  });

  test('clicking a beat on an unselected circle does nothing', () => {
    const { updateAccent } = setup({ isActiveUI: false });
    fireEvent.click(beats()[2]);
    expect(updateAccent).not.toHaveBeenCalled();
    expect(beats()[2]).toHaveStyle({ cursor: 'default' });
  });

  test('positions beat 0 at the top and beat 1 of 4 at the right of the radius', () => {
    setup({ radius: 80 });
    expect(beats()[0].style.top).toBe('calc(50% + -80px - 12px)');
    expect(beats()[1].style.left).toBe('calc(50% + 80px - 12px)');
    expect(beats()[0]).toHaveStyle({ width: '24px', height: '24px' });
  });

  test('a missing accents array renders normal beats', () => {
    setup({ settings: { subdivisions: 2 }, currentSubdivision: 9 });
    beats().forEach(i => expect(i.getAttribute('src')).toContain('normalBeat.svg'));
  });

  test('characterization: an accent of 0 is rendered as a normal beat, the muted placeholder is unreachable', () => {
    // see report: BeatVisualizer.js `accents?.[i] || 1` turns 0 into 1
    setup({ settings: { subdivisions: 2, accents: [0, 0] }, currentSubdivision: 9 });
    expect(beats()).toHaveLength(2);
    expect(screen.queryByText('+')).toBeNull();
  });

  describe('remove button', () => {
    test('appears only with more than one circle and asks to remove this circle', () => {
      const { updateAccent } = setup({ circleSettings: [{}, {}] });
      const remove = screen.getByText('-');
      expect(remove).toHaveClass('remove-circle-button');
      fireEvent.click(remove);
      expect(updateAccent).toHaveBeenCalledWith('remove', 1);
    });

    test('the click does not bubble to a parent handler', () => {
      const parent = jest.fn();
      const updateAccent = jest.fn();
      render(<div onClick={parent}>{BeatVisualizer({ ...base, circleSettings: [{}, {}], updateAccent })}</div>);
      fireEvent.click(screen.getByText('-'));
      expect(parent).not.toHaveBeenCalled();
    });

    test('is absent for a single circle', () => {
      setup({ circleSettings: [{}] });
      expect(screen.queryByText('-')).toBeNull();
    });

    test('is the first element, before the beats', () => {
      expect(BeatVisualizer({ ...base, circleSettings: [{}, {}], updateAccent: jest.fn() })[0].key).toBe('remove-button');
    });
  });
});
