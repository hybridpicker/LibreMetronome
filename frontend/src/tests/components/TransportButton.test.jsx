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
    jest.runOnlyPendingTimers();
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

});
