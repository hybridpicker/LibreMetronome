import { initAudioContext } from '../../hooks/useMetronomeLogic/audioBuffers';
import { playTapFeedback } from '../../hooks/useMetronomeLogic/tapFeedback';

jest.mock('../../hooks/useMetronomeLogic/audioBuffers', () => ({
  initAudioContext: jest.fn()
}));

function makeContext({ state = 'running', ramps = true, resume } = {}) {
  const oscillator = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: {
      setValueAtTime: jest.fn(),
      ...(ramps ? { exponentialRampToValueAtTime: jest.fn() } : {})
    }
  };
  const gain = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      ...(ramps ? { exponentialRampToValueAtTime: jest.fn() } : {})
    }
  };
  const audioCtx = {
    state,
    currentTime: 2,
    destination: { name: 'dest' },
    createOscillator: jest.fn(() => oscillator),
    createGain: jest.fn(() => gain),
    ...(resume ? { resume } : {})
  };
  return { audioCtx, oscillator, gain };
}

describe('playTapFeedback', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('schedules a 45 ms triangle click sweeping 1750 -> 950 Hz at the context time', () => {
    const { audioCtx, oscillator, gain } = makeContext();
    initAudioContext.mockReturnValue(audioCtx);

    expect(playTapFeedback(0.5)).toBe(true);

    expect(oscillator.type).toBe('triangle');
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(1750, 2);
    expect(oscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(950, 2.045);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.12, 2);
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 2.045);
    expect(oscillator.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(audioCtx.destination);
    expect(oscillator.start).toHaveBeenCalledWith(2);
    expect(oscillator.stop).toHaveBeenCalledWith(2.045);
  });

  test('uses volume 0.5 by default', () => {
    const { audioCtx, gain } = makeContext();
    initAudioContext.mockReturnValue(audioCtx);
    playTapFeedback();
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.12, 2);
  });

  test.each([
    [1, 0.24],
    [0.25, 0.06],
    [0, 0.0001],
    [-3, 0.0001],
    [2, 0.24],
    [NaN, 0.0001],
    ['abc', 0.0001]
  ])('volume %p gives a peak gain of %p', (volume, peak) => {
    const { audioCtx, gain } = makeContext();
    initAudioContext.mockReturnValue(audioCtx);
    playTapFeedback(volume);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(peak, 2);
  });

  test('returns false without a usable context and plays nothing', () => {
    initAudioContext.mockReturnValue(null);
    expect(playTapFeedback()).toBe(false);

    const { audioCtx } = makeContext({ state: 'closed' });
    initAudioContext.mockReturnValue(audioCtx);
    expect(playTapFeedback()).toBe(false);
    expect(audioCtx.createOscillator).not.toHaveBeenCalled();
  });

  test('resumes a suspended context and ignores a rejected resume', () => {
    const resume = jest.fn(() => Promise.reject(new Error('blocked')));
    const { audioCtx, oscillator } = makeContext({ state: 'suspended', resume });
    initAudioContext.mockReturnValue(audioCtx);
    expect(playTapFeedback()).toBe(true);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(oscillator.start).toHaveBeenCalled();
  });

  test('does not resume a running context; tolerates a context without resume()', () => {
    const resume = jest.fn(() => Promise.resolve());
    initAudioContext.mockReturnValue(makeContext({ resume }).audioCtx);
    playTapFeedback();
    expect(resume).not.toHaveBeenCalled();

    initAudioContext.mockReturnValue(makeContext({ state: 'suspended' }).audioCtx);
    expect(playTapFeedback()).toBe(true);
  });

  test('without exponential ramps the gain is cut with a plain setValueAtTime', () => {
    const { audioCtx, gain, oscillator } = makeContext({ ramps: false });
    initAudioContext.mockReturnValue(audioCtx);
    expect(playTapFeedback(1)).toBe(true);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.24, 2);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, 2.045);
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledTimes(1);
  });

  test('disconnects both nodes when the oscillator ends, even if disconnect is missing', () => {
    const { audioCtx, oscillator, gain } = makeContext();
    initAudioContext.mockReturnValue(audioCtx);
    playTapFeedback();
    oscillator.onended();
    expect(oscillator.disconnect).toHaveBeenCalledTimes(1);
    expect(gain.disconnect).toHaveBeenCalledTimes(1);

    const second = makeContext();
    delete second.oscillator.disconnect;
    delete second.gain.disconnect;
    initAudioContext.mockReturnValue(second.audioCtx);
    playTapFeedback();
    expect(() => second.oscillator.onended()).not.toThrow();
  });

  test('swallows audio graph errors, warns and returns false', () => {
    const { audioCtx } = makeContext();
    audioCtx.createOscillator.mockImplementation(() => { throw new Error('graph error'); });
    initAudioContext.mockReturnValue(audioCtx);
    expect(playTapFeedback()).toBe(false);
    expect(console.warn).toHaveBeenCalledWith('[Tap feedback] Unable to play feedback click:', expect.any(Error));
  });
});
