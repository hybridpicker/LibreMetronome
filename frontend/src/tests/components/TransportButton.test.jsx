/* eslint-disable testing-library/no-container, testing-library/no-node-access, testing-library/render-result-naming-convention --
   These tests assert SVG/canvas geometry, CSS state classes and img sources that have no accessible role. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import TransportButton from '../../components/metronome/Controls/TransportButton';
import { playTapFeedback } from '../../hooks/useMetronomeLogic/tapFeedback';

jest.mock('../../hooks/useMetronomeLogic/tapFeedback', () => ({
  playTapFeedback: jest.fn()
}));

describe('TransportButton tap feedback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  test('plays audio and keeps a visible pulse after each tap', () => {
    const onClick = jest.fn();
    render(
      <TransportButton
        kind="tap"
        label="Tap Tempo"
        feedbackVolume={0.7}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button', { name: 'Tap Tempo' });
    fireEvent.click(button);

    expect(playTapFeedback).toHaveBeenCalledWith(0.7);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).toHaveClass('is-tapping');

    act(() => jest.advanceTimersByTime(150));
    expect(button).not.toHaveClass('is-tapping');
  });
  test('registers a tap on contact and does not count the release click twice', () => {
    const onClick = jest.fn();
    render(<TransportButton kind="tap" label="Tap Tempo" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Tap Tempo' });
    const down = new Event('pointerdown', { bubbles: true });
    Object.defineProperties(down, {
      button: { value: 0 }, isPrimary: { value: true }
    });
    fireEvent(button, down);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).toHaveClass('is-tapping');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  const pointerDown = (button, props) => {
    const down = new Event('pointerdown', { bubbles: true });
    Object.defineProperties(down, Object.fromEntries(Object.entries(props).map(([k, v]) => [k, { value: v }])));
    fireEvent(button, down);
  };

  test('ignores secondary-button and non-primary pointers, the click then counts once', () => {
    const onClick = jest.fn();
    render(<TransportButton kind="tap" label="Tap Tempo" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Tap Tempo' });
    pointerDown(button, { button: 2, isPrimary: true });
    pointerDown(button, { button: 0, isPrimary: false });
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('a second tap restarts the 150 ms pulse', () => {
    render(<TransportButton kind="tap" label="Tap Tempo" />);
    const button = screen.getByRole('button', { name: 'Tap Tempo' });
    fireEvent.click(button);
    act(() => { jest.advanceTimersByTime(100); });
    fireEvent.click(button);
    act(() => { jest.advanceTimersByTime(100); });
    expect(button).toHaveClass('is-tapping'); // 200 ms after the first tap, 100 ms after the second
    act(() => { jest.advanceTimersByTime(50); });
    expect(button).not.toHaveClass('is-tapping');
  });

  test('uses the default feedback volume 0.5 and tolerates a missing onClick', () => {
    render(<TransportButton kind="tap" label="Tap Tempo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
    expect(playTapFeedback).toHaveBeenCalledWith(0.5);
  });

  test('unmounting clears the pending pulse timer', () => {
    const { unmount } = render(<TransportButton kind="tap" label="Tap Tempo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('a disabled tap button does nothing', () => {
    const onClick = jest.fn();
    render(<TransportButton kind="tap" label="Tap Tempo" onClick={onClick} disabled />);
    const button = screen.getByRole('button', { name: 'Tap Tempo' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(playTapFeedback).not.toHaveBeenCalled();
  });
});

describe('TransportButton play / generic', () => {
  test('play: no audio feedback, onClick receives the event, glyph follows pressed', () => {
    const onClick = jest.fn();
    const { rerender, container } = render(
      <TransportButton kind="play" label="Start" onClick={onClick} pressed={false} />
    );
    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveClass('transport-button', 'transport-play');
    expect(button).not.toHaveClass('is-playing');
    expect(container.querySelector('svg path').getAttribute('d')).toBe('M5 2.5v15l12-7.5z');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].type).toBe('click');
    expect(playTapFeedback).not.toHaveBeenCalled();
    rerender(<TransportButton kind="play" label="Pause" onClick={onClick} pressed />);
    const playing = screen.getByRole('button', { name: 'Pause' });
    expect(playing).toHaveAttribute('aria-pressed', 'true');
    expect(playing).toHaveClass('is-playing');
    expect(container.querySelector('svg path').getAttribute('d')).toBe('M4 3h4v14H4zM12 3h4v14h-4z');
  });

  test('play does not react to pointerdown (only taps are fired on contact)', () => {
    const onClick = jest.fn();
    render(<TransportButton kind="play" label="Start" onClick={onClick} />);
    const down = new Event('pointerdown', { bubbles: true });
    Object.defineProperties(down, { button: { value: 0 }, isPrimary: { value: true } });
    fireEvent(screen.getByRole('button', { name: 'Start' }), down);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('aria-pressed is omitted unless pressed is a boolean; no glyph for tap', () => {
    const { container } = render(<TransportButton kind="tap" label="Tap Tempo" pressed="yes" />);
    expect(screen.getByRole('button', { name: 'Tap Tempo' })).not.toHaveAttribute('aria-pressed');
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByRole('button', { name: 'Tap Tempo' })).toHaveTextContent('Tap Tempo');
  });

  test('extra class names are appended and the class string is trimmed', () => {
    render(<TransportButton kind="play" label="Start" className="play-button" />);
    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toHaveClass('transport-button', 'transport-play', 'play-button');
    expect(button.className).not.toMatch(/^\s|\s$/);
  });
});
