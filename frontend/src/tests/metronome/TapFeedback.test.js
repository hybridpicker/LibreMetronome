import { initAudioContext } from '../../hooks/useMetronomeLogic/audioBuffers';
import { playTapFeedback } from '../../hooks/useMetronomeLogic/tapFeedback';

jest.mock('../../hooks/useMetronomeLogic/audioBuffers', () => ({
  initAudioContext: jest.fn()
}));

describe('playTapFeedback', () => {
  test('schedules a short click on the shared audio context', () => {
    const oscillator = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn()
      }
    };
    const gain = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn()
      }
    };
    const audioCtx = {
      state: 'running',
      currentTime: 2,
      destination: {},
      createOscillator: jest.fn(() => oscillator),
      createGain: jest.fn(() => gain)
    };
    initAudioContext.mockReturnValue(audioCtx);

    expect(playTapFeedback(0.5)).toBe(true);
    expect(oscillator.start).toHaveBeenCalledWith(2);
    expect(oscillator.stop).toHaveBeenCalledWith(2.045);
    expect(gain.connect).toHaveBeenCalledWith(audioCtx.destination);
  });
});
