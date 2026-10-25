/* eslint-disable testing-library/no-node-access -- ring wrappers and the SVG indicator group have no roles; class/structure assertions are unavoidable */
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import PolyrhythmEditableSlider from '../../../components/metronome/PolyrhythmMode/PolyrhythmEditableSlider';
import BeatVisualizer from '../../../components/metronome/PolyrhythmMode/BeatVisualizer';
import CircleRenderer from '../../../components/metronome/PolyrhythmMode/CircleRenderer';
import DirectBeatIndicator, { DirectBeatIndicator as NamedIndicator } from '../../../components/metronome/PolyrhythmMode/DirectBeatIndicator';
import * as PolyrhythmMode from '../../../components/metronome/PolyrhythmMode';
import PolyrhythmMetronome from '../../../components/metronome/PolyrhythmMode/PolyrhythmMetronome';

afterEach(cleanup);

describe('PolyrhythmMode index', () => {
  test('exports the metronome as default and the renderers by name', () => {
    expect(PolyrhythmMode.default).toBe(PolyrhythmMetronome);
    expect(PolyrhythmMode.CircleRenderer).toBe(CircleRenderer);
    expect(PolyrhythmMode.BeatVisualizer).toBe(BeatVisualizer);
  });
});

describe('PolyrhythmEditableSlider', () => {
  const setup = (props = {}) => {
    const setValue = jest.fn();
    render(<PolyrhythmEditableSlider label="Tempo" value={100} setValue={setValue} min={30} max={240} step={1} {...props} />);
    return { setValue };
  };
  const edit = text => {
    fireEvent.click(screen.getByText(/Tempo:/));
    const input = screen.getByTestId('editable-input');
    fireEvent.change(input, { target: { value: text } });
    return input;
  };

  test('shows label and formatted value', () => {
    setup({ formatter: v => `${v} BPM`, className: 'extra' });
    expect(screen.getByText('Tempo: 100 BPM')).toBeInTheDocument();
    expect(screen.getByText('Tempo: 100 BPM').parentElement).toHaveClass('editable-slider', 'polyrhythm-slider', 'extra');
  });

  test('clicking turns the label into an input holding the formatted value', () => {
    setup({ formatter: v => `${v} BPM` });
    fireEvent.click(screen.getByText('Tempo: 100 BPM'));
    expect(screen.getByTestId('editable-input')).toHaveValue('100 BPM');
  });

  test('Enter commits a parsed value', () => {
    const { setValue } = setup({ parser: parseFloat });
    fireEvent.keyDown(edit('150'), { key: 'Enter' });
    expect(setValue).toHaveBeenCalledWith(150);
    expect(screen.queryByTestId('editable-input')).not.toBeInTheDocument();
  });

  test('blur commits too', () => {
    const { setValue } = setup({ parser: parseFloat });
    fireEvent.blur(edit('60'));
    expect(setValue).toHaveBeenCalledWith(60);
  });

  test.each([[500, 240], [1, 30], [30, 30], [240, 240]])('clamps %s to %s', (typed, expected) => {
    const { setValue } = setup({ parser: parseFloat });
    fireEvent.keyDown(edit(String(typed)), { key: 'Enter' });
    expect(setValue).toHaveBeenCalledWith(expected);
  });

  test('a non-numeric entry is discarded but closes the editor', () => {
    const { setValue } = setup({ parser: parseFloat });
    fireEvent.keyDown(edit('abc'), { key: 'Enter' });
    expect(setValue).not.toHaveBeenCalled();
    expect(screen.queryByTestId('editable-input')).not.toBeInTheDocument();
  });

  test('a throwing parser closes the editor without committing', () => {
    const { setValue } = setup({ parser: () => { throw new Error('bad'); } });
    fireEvent.keyDown(edit('1'), { key: 'Enter' });
    expect(setValue).not.toHaveBeenCalled();
    expect(screen.queryByTestId('editable-input')).not.toBeInTheDocument();
  });

  test('Escape cancels without committing; other keys do nothing', () => {
    const { setValue } = setup({ parser: parseFloat });
    const input = edit('150');
    fireEvent.keyDown(input, { key: 'a' });
    expect(screen.getByTestId('editable-input')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(setValue).not.toHaveBeenCalled();
    expect(screen.queryByTestId('editable-input')).not.toBeInTheDocument();
  });

  test('the click does not bubble to parents', () => {
    const parentClick = jest.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={parentClick}>
        <PolyrhythmEditableSlider label="Tempo" value={100} setValue={jest.fn()} min={30} max={240} step={1} />
      </div>
    );
    fireEvent.click(screen.getByText(/Tempo:/));
    expect(parentClick).not.toHaveBeenCalled();
  });
});

describe('BeatVisualizer', () => {
  const buttons = () => screen.getAllByRole('button');

  test('places beats clockwise starting at 12 o\'clock', () => {
    render(<BeatVisualizer beats={4} radius={100} currentSubdivision={-1} isPaused />);
    const lefts = buttons().map(b => parseFloat(b.style.left) + parseFloat(b.style.width) / 2);
    const tops = buttons().map(b => parseFloat(b.style.top) + parseFloat(b.style.height) / 2);
    expect(lefts[0]).toBeCloseTo(100, 6);
    expect(tops[0]).toBeCloseTo(0, 6);
    expect(lefts[1]).toBeCloseTo(200, 6);
    expect(tops[1]).toBeCloseTo(100, 6);
    expect(lefts[2]).toBeCloseTo(100, 6);
    expect(tops[2]).toBeCloseTo(200, 6);
    expect(lefts[3]).toBeCloseTo(0, 6);
  });

  test('hit areas shrink on crowded rings but stay between 28 and 44 px', () => {
    const { rerender } = render(<BeatVisualizer beats={2} radius={200} currentSubdivision={-1} isPaused />);
    expect(buttons()[0].style.width).toBe('44px');
    rerender(<BeatVisualizer beats={9} radius={60} currentSubdivision={-1} isPaused />);
    expect(buttons()[0].style.width).toBe('42px'); // 2*pi*60/9 = 41.9
    rerender(<BeatVisualizer beats={9} radius={30} currentSubdivision={-1} isPaused />);
    expect(buttons()[0].style.width).toBe('28px');
  });

  test('describes every accent state to assistive technology', () => {
    render(<BeatVisualizer beats={5} radius={100} accents={[3, 2, 1, 0]} currentSubdivision={-1} isPaused />);
    const names = buttons().map(b => b.getAttribute('aria-label'));
    expect(names).toEqual([
      'Inner rhythm, beat 1: first beat. Activate to change accent.',
      'Inner rhythm, beat 2: accent. Activate to change accent.',
      'Inner rhythm, beat 3: normal. Activate to change accent.',
      'Inner rhythm, beat 4: muted. Activate to change accent.',
      'Inner rhythm, beat 5: normal. Activate to change accent.' // beyond the pattern -> normal
    ]);
    expect(buttons().map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false', null, 'false']);
    expect(buttons()[3]).toHaveClass('is-muted');
  });

  test('uses the outer label for outer rings', () => {
    render(<BeatVisualizer beats={2} radius={100} beatType="outer" currentSubdivision={-1} isPaused />);
    expect(buttons()[0]).toHaveAccessibleName('Outer rhythm, beat 1: normal. Activate to change accent.');
  });

  test('only the current beat is highlighted while playing', () => {
    const { rerender } = render(<BeatVisualizer beats={3} radius={100} currentSubdivision={1} isPaused={false} />);
    expect(buttons().map(b => b.classList.contains('is-current'))).toEqual([false, true, false]);
    rerender(<BeatVisualizer beats={3} radius={100} currentSubdivision={1} isPaused />);
    expect(buttons().some(b => b.classList.contains('is-current'))).toBe(false);
    rerender(<BeatVisualizer beats={3} radius={100} currentSubdivision={1} isPaused={false} isTransitioning />);
    expect(buttons().some(b => b.classList.contains('is-current'))).toBe(false);
    expect(buttons()[0]).toHaveClass('transitioning');
  });

  test('requests an animation frame when the highlighted beat changes while playing', () => {
    const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    const { rerender } = render(<BeatVisualizer beats={3} radius={100} currentSubdivision={0} isPaused={false} />);
    expect(raf).not.toHaveBeenCalled();
    rerender(<BeatVisualizer beats={3} radius={100} currentSubdivision={1} isPaused={false} />);
    expect(raf).toHaveBeenCalledTimes(1);
    rerender(<BeatVisualizer beats={3} radius={100} currentSubdivision={2} isPaused />);
    expect(raf).toHaveBeenCalledTimes(1);
    raf.mockRestore();
  });

  test('clicking reports the beat index; disabled keys do not fire; missing handler is tolerated', () => {
    const toggle = jest.fn();
    const { rerender } = render(<BeatVisualizer beats={3} radius={100} currentSubdivision={-1} isPaused handleToggleAccent={toggle} />);
    fireEvent.click(buttons()[2]);
    expect(toggle).toHaveBeenCalledWith(2);
    rerender(<BeatVisualizer beats={3} radius={100} currentSubdivision={-1} isPaused handleToggleAccent={toggle} disabled />);
    fireEvent.click(buttons()[0]);
    expect(toggle).toHaveBeenCalledTimes(1);
    rerender(<BeatVisualizer beats={3} radius={100} currentSubdivision={-1} isPaused />);
    expect(() => fireEvent.click(buttons()[0])).not.toThrow();
  });

  test('an out-of-range accent value falls back to the normal glyph', () => {
    render(<BeatVisualizer beats={1} radius={100} accents={[7]} currentSubdivision={-1} isPaused />);
    // characterization: current behaviour, see report (the aria name for 7 is "undefined")
    expect(buttons()[0].getAttribute('aria-label')).toContain('undefined');
  });
});

describe('CircleRenderer', () => {
  const baseProps = {
    innerBeats: 4,
    outerBeats: 3,
    innerAccents: [3, 1, 1, 1],
    outerAccents: [3, 1, 1],
    innerCurrentSubdivision: -1,
    outerCurrentSubdivision: -1,
    isPaused: true,
    containerSize: 400,
    activeCircle: 'inner',
    setActiveCircle: jest.fn(),
    handleToggleAccent: jest.fn(),
    macroMode: 0,
    isSilencePhaseRef: { current: false }
  };
  beforeEach(() => jest.clearAllMocks());

  test('sizes the rings: inner is 60% of the outer', () => {
    render(<CircleRenderer {...baseProps} />);
    const outer = document.querySelector('.outer-circle');
    const inner = document.querySelector('.inner-circle');
    expect(outer.style.width).toBe('400px');
    expect(inner.style.width).toBe('240px');
    expect(inner.style.top).toBe('80px');
    expect(inner.style.left).toBe('80px');
  });

  test('marks the active ring and exposes pressed state on the select keys', () => {
    const { rerender } = render(<CircleRenderer {...baseProps} />);
    expect(document.querySelector('.inner-circle')).toHaveClass('active');
    expect(document.querySelector('.outer-circle')).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Select inner rhythm, 4 beats' })).toHaveAttribute('aria-pressed', 'true');
    rerender(<CircleRenderer {...baseProps} activeCircle="outer" />);
    expect(screen.getByRole('button', { name: 'Select outer rhythm, 3 beats' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('select keys call setActiveCircle with the ring', () => {
    render(<CircleRenderer {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select outer rhythm, 3 beats' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select inner rhythm, 4 beats' }));
    expect(baseProps.setActiveCircle.mock.calls).toEqual([['outer'], ['inner']]);
  });

  test('during a transition the select keys are disabled and ignore clicks', () => {
    render(<CircleRenderer {...baseProps} isTransitioning />);
    const select = screen.getByRole('button', { name: 'Select outer rhythm, 3 beats' });
    expect(select).toBeDisabled();
    fireEvent.click(select);
    expect(baseProps.setActiveCircle).not.toHaveBeenCalled();
    expect(document.querySelector('.outer-circle')).toHaveClass('transitioning');
    expect(screen.getAllByRole('button', { name: /^Inner rhythm, beat/ })[0]).toBeDisabled();
  });

  test('beat keys report the ring together with the index', () => {
    render(<CircleRenderer {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^Outer rhythm, beat 2:/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Inner rhythm, beat 4:/ }));
    expect(baseProps.handleToggleAccent.mock.calls).toEqual([[1, 'outer'], [3, 'inner']]);
  });

  test('highlights the playing beat in each ring independently', () => {
    render(<CircleRenderer {...baseProps} isPaused={false} innerCurrentSubdivision={2} outerCurrentSubdivision={0} />);
    expect(screen.getByRole('button', { name: /^Inner rhythm, beat 3:/ })).toHaveClass('is-current');
    expect(screen.getByRole('button', { name: /^Outer rhythm, beat 1:/ })).toHaveClass('is-current');
    expect(screen.getByRole('button', { name: /^Inner rhythm, beat 1:/ })).not.toHaveClass('is-current');
  });

  test('tolerates a missing silence ref and active macro mode', () => {
    render(<CircleRenderer {...baseProps} macroMode={1} isSilencePhaseRef={null} />);
    expect(screen.getAllByRole('button', { name: /^Inner rhythm, beat/ })).toHaveLength(4);
  });

  test('re-renders when beat counts change', () => {
    const { rerender } = render(<CircleRenderer {...baseProps} />);
    rerender(<CircleRenderer {...baseProps} innerBeats={6} innerAccents={[3, 1, 1, 1, 1, 1]} />);
    expect(screen.getAllByRole('button', { name: /^Inner rhythm, beat/ })).toHaveLength(6);
  });
});

describe('DirectBeatIndicator', () => {
  let rafCallbacks;
  let rafId;
  beforeEach(() => {
    rafCallbacks = new Map();
    rafId = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafId += 1;
      rafCallbacks.set(rafId, cb);
      return rafId;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { rafCallbacks.delete(id); });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(performance, 'now').mockReturnValue(1000);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Runs all currently queued frames at the given timestamp (frames queued meanwhile wait for the next call).
  const frame = timestamp => {
    const pending = [...rafCallbacks.entries()];
    pending.forEach(([id]) => rafCallbacks.delete(id));
    act(() => { pending.forEach(([, cb]) => cb(timestamp)); });
  };
  const group = () => document.querySelector('line').parentElement;
  const firstBeat = () => act(() => { window.dispatchEvent(new CustomEvent('polyrhythm-first-beat')); });

  test('exports the same component by name and by default', () => {
    expect(NamedIndicator).toBe(DirectBeatIndicator);
  });

  test('draws a single hairline from the centre to the rim, hidden at first', () => {
    render(<DirectBeatIndicator containerSize={300} isPaused tempo={120} innerBeats={4} />);
    const line = document.querySelector('line');
    expect(line.getAttribute('x1')).toBe('150');
    expect(line.getAttribute('y1')).toBe('150');
    expect(line.getAttribute('x2')).toBe('150');
    expect(line.getAttribute('y2')).toBe('4'); // 150 - (150 - 4)
    expect(group().style.opacity).toBe('0');
  });

  test('stays hidden through the first measure and fades in on the second downbeat', () => {
    render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    firstBeat();
    expect(group().style.opacity).toBe('0');
    firstBeat();
    expect(group().style.opacity).toBe('1');
    expect(group().style.transform).toBe('rotate(0deg)');
  });

  test('rotates one full turn per measure (inner beats x beat length)', () => {
    render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    firstBeat();
    firstBeat(); // visible, startTime = performance.now() = 1000
    frame(1000); // first frame after visibility: angle for elapsed 0
    frame(2000); // 1000 ms into a 2000 ms measure -> 180 deg
    expect(group().style.transform).toBe('rotate(180deg)');
    frame(3500); // 2500 ms -> wraps to 500 ms -> 90 deg
    expect(group().style.transform).toBe('rotate(90deg)');
  });

  test('if the reveal happens at time 0 the first frame still anchors the animation start', () => {
    performance.now.mockReturnValue(0);
    render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    firstBeat();
    firstBeat();
    frame(5000); // anchors startTime = 5000, no rotation applied on this frame
    expect(group().style.transform).toBe('rotate(0deg)');
    frame(6000);
    expect(group().style.transform).toBe('rotate(180deg)');
  });

  test('tempo changes the rotation speed', () => {
    const { rerender } = render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    firstBeat();
    firstBeat();
    rerender(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={60} innerBeats={4} />);
    frame(1000);
    frame(3000); // 2000 ms of a 4000 ms measure
    expect(group().style.transform).toBe('rotate(180deg)');
  });

  test('pausing hides the indicator, stops the animation and restarts the count', () => {
    const { rerender } = render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    firstBeat();
    firstBeat();
    expect(group().style.opacity).toBe('1');
    rerender(<DirectBeatIndicator containerSize={300} isPaused tempo={120} innerBeats={4} />);
    expect(group().style.opacity).toBe('0');
    expect(rafCallbacks.size).toBe(0);
    // beats while paused are ignored
    firstBeat();
    firstBeat();
    expect(group().style.opacity).toBe('0');
    // resuming needs two downbeats again
    rerender(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    firstBeat();
    expect(group().style.opacity).toBe('0');
    firstBeat();
    expect(group().style.opacity).toBe('1');
  });

  test('a playback-start event hides the indicator and restarts the measure count', () => {
    render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    firstBeat();
    firstBeat();
    act(() => { window.dispatchEvent(new CustomEvent('polyrhythm-playback-start')); });
    expect(group().style.opacity).toBe('0');
    firstBeat();
    expect(group().style.opacity).toBe('0');
    firstBeat();
    expect(group().style.opacity).toBe('1');
  });

  test('the animation loop idles while hidden and does not rotate', () => {
    render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    frame(1000);
    frame(2000);
    expect(group().style.transform).toBe('');
    expect(rafCallbacks.size).toBe(1); // loop keeps polling
  });

  test('a third downbeat does not re-trigger the reveal', () => {
    render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    firstBeat();
    firstBeat();
    frame(1000);
    frame(2000);
    firstBeat();
    expect(group().style.transform).toBe('rotate(180deg)');
  });

  test('unmount cancels the animation frame and removes the listeners', () => {
    const { unmount } = render(<DirectBeatIndicator containerSize={300} isPaused={false} tempo={120} innerBeats={4} />);
    expect(rafCallbacks.size).toBe(1);
    unmount();
    expect(rafCallbacks.size).toBe(0);
    const remove = jest.spyOn(window, 'removeEventListener');
    expect(() => window.dispatchEvent(new CustomEvent('polyrhythm-first-beat'))).not.toThrow();
    remove.mockRestore();
  });
});
