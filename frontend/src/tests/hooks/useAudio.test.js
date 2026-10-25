import { renderHook } from '@testing-library/react';
import useAudio from '../../hooks/useAudio';

describe('useAudio (minimal stub implementation)', () => {
  const originalAudioContext = window.AudioContext;
  const originalWebkit = window.webkitAudioContext;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    window.webkitAudioContext = originalWebkit;
    delete window._audioContextInit;
    jest.restoreAllMocks();
  });

  const makeContext = () => {
    const oscillator = { frequency: {}, connect: jest.fn(), start: jest.fn(), stop: jest.fn() };
    const gainNode = { gain: {}, connect: jest.fn() };
    return {
      oscillator,
      gainNode,
      ctx: {
        currentTime: 2,
        destination: { name: 'dest' },
        createOscillator: jest.fn(() => oscillator),
        createGain: jest.fn(() => gainNode),
      },
    };
  };

  test('becomes ready when the Web Audio API exists', () => {
    const { result } = renderHook(() => useAudio());
    expect(result.current.isReady).toBe(true);
  });

  test('uses webkitAudioContext when AudioContext is missing', () => {
    window.AudioContext = undefined;
    const { result } = renderHook(() => useAudio());
    expect(result.current.isReady).toBe(true);
  });

  test('stays not ready and logs when no Web Audio API exists', () => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;

    const { result } = renderHook(() => useAudio());

    expect(result.current.isReady).toBe(false);
    expect(console.error).toHaveBeenCalledWith('Web Audio API not supported in this browser');
  });

  test('stays not ready and logs when probing the API throws', () => {
    const error = new Error('blocked by policy');
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      get() {
        throw error;
      },
    });

    const { result } = renderHook(() => useAudio());

    expect(result.current.isReady).toBe(false);
    expect(console.error).toHaveBeenCalledWith('Error initializing audio:', error);
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: originalAudioContext,
    });
  });

  test('play does nothing when no shared audio context was initialised', () => {
    const { result } = renderHook(() => useAudio());
    expect(() => result.current.play('high')).not.toThrow();
  });

  test('play with type "high" uses 880 Hz, the given volume and a 0.1 s envelope', () => {
    const { ctx, oscillator, gainNode } = makeContext();
    window._audioContextInit = ctx;
    const { result } = renderHook(() => useAudio());

    result.current.play('high', 0.5);

    expect(oscillator.frequency.value).toBe(880);
    expect(gainNode.gain.value).toBe(0.5);
    expect(oscillator.connect).toHaveBeenCalledWith(gainNode);
    expect(gainNode.connect).toHaveBeenCalledWith(ctx.destination);
    expect(oscillator.start).toHaveBeenCalledTimes(1);
    expect(oscillator.stop).toHaveBeenCalledWith(2.1);
  });

  test('play with any other type uses 440 Hz and full volume by default', () => {
    const { ctx, oscillator, gainNode } = makeContext();
    window._audioContextInit = ctx;
    const { result } = renderHook(() => useAudio());

    result.current.play('low');

    expect(oscillator.frequency.value).toBe(440);
    expect(gainNode.gain.value).toBe(1);
  });

  test('play logs instead of throwing when the context fails', () => {
    const error = new Error('no oscillator');
    window._audioContextInit = {
      createOscillator: () => {
        throw error;
      },
      createGain: jest.fn(),
    };
    const { result } = renderHook(() => useAudio());

    expect(() => result.current.play('high')).not.toThrow();
    expect(console.error).toHaveBeenCalledWith('Error playing sound:', error);
  });

  test('exposes callable no-op update functions and keeps stable identities', () => {
    const { result, rerender } = renderHook(() => useAudio());
    const first = result.current;

    ['updateTempo', 'updateVolume', 'updateSwing', 'updateBeatMode', 'updateSubdivisions'].forEach(
      (name) => {
        expect(first[name](1)).toBeUndefined();
      }
    );
    rerender();
    expect(result.current.updateTempo).toBe(first.updateTempo);
    expect(result.current.play).toBe(first.play);
  });
});
