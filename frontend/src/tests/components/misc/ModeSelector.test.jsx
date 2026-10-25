import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ModeSelector from '../../../components/ModeSelector';

const setWidth = (w) => { window.innerWidth = w; };
const names = () => screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));

describe('ModeSelector', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setWidth(1024);
  });

  afterEach(() => {
    jest.useRealTimers();
    setWidth(1024);
    delete window.ontouchstart;
  });

  test('exposes a labelled navigation with a toolbar', () => {
    render(<ModeSelector mode="circle" setMode={jest.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Metronome modes' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Choose a metronome mode' })).toBeInTheDocument();
  });

  test('lists all five modes in order on normal screens, without a More button', () => {
    render(<ModeSelector mode="circle" setMode={jest.fn()} />);
    expect(names()).toEqual([
      'Analog mode', 'Beat mode', 'Grid mode', 'Sequence mode', 'Polyrhythm mode'
    ]);
  });

  test('marks only the current mode as pressed and active', () => {
    render(<ModeSelector mode="multi" setMode={jest.fn()} />);
    const pressed = screen.getAllByRole('button', { pressed: true });
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAccessibleName('Sequence mode');
    expect(pressed[0]).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Grid mode' })).not.toHaveClass('active');
  });

  test.each([
    ['Analog mode', 'analog'],
    ['Beat mode', 'circle'],
    ['Grid mode', 'grid'],
    ['Sequence mode', 'multi'],
    ['Polyrhythm mode', 'polyrhythm']
  ])('clicking "%s" calls setMode("%s")', (label, id) => {
    const setMode = jest.fn();
    render(<ModeSelector mode="circle" setMode={setMode} />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(setMode).toHaveBeenCalledTimes(1);
    expect(setMode).toHaveBeenCalledWith(id);
  });

  test('touch devices schedule a 1.5 s reset of the touched mode; others do not', () => {
    render(<ModeSelector mode="circle" setMode={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Grid mode' }));
    expect(jest.getTimerCount()).toBe(0);
    window.ontouchstart = null;
    fireEvent.click(screen.getByRole('button', { name: 'Grid mode' }));
    expect(jest.getTimerCount()).toBe(1);
    act(() => { jest.advanceTimersByTime(1499); });
    expect(jest.getTimerCount()).toBe(1);
    act(() => { jest.advanceTimersByTime(1); });
    expect(jest.getTimerCount()).toBe(0);
  });

  describe('tiny screens (<= 350 px)', () => {
    beforeEach(() => setWidth(350));

    test('show only Analog, Beat and Grid plus a More button', () => {
      render(<ModeSelector mode="circle" setMode={jest.fn()} />);
      expect(names()).toEqual(['Analog mode', 'Beat mode', 'Grid mode', 'Show all metronome modes']);
    });

    test('the currently selected extra mode stays visible', () => {
      render(<ModeSelector mode="polyrhythm" setMode={jest.fn()} />);
      expect(names()).toEqual(['Beat mode', 'Grid mode', 'Polyrhythm mode', 'Show all metronome modes']);
    });

    test('More reveals all modes and disappears', () => {
      render(<ModeSelector mode="circle" setMode={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show all metronome modes' }));
      expect(names()).toHaveLength(5);
      expect(screen.queryByRole('button', { name: 'Show all metronome modes' })).not.toBeInTheDocument();
    });

    test('351 px is already a normal screen', () => {
      setWidth(351);
      render(<ModeSelector mode="circle" setMode={jest.fn()} />);
      expect(names()).toHaveLength(5);
    });
  });

  test('reacts to window resizes in both directions', () => {
    render(<ModeSelector mode="circle" setMode={jest.fn()} />);
    act(() => { setWidth(300); window.dispatchEvent(new Event('resize')); });
    expect(names()).toHaveLength(4);
    act(() => { setWidth(800); window.dispatchEvent(new Event('resize')); });
    expect(names()).toHaveLength(5);
  });

  test('removes the resize listener on unmount', () => {
    const remove = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ModeSelector mode="circle" setMode={jest.fn()} />);
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    remove.mockRestore();
  });
});
