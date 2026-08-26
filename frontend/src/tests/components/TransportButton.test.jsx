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
});
