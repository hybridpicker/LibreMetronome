import { act, renderHook } from '@testing-library/react';
import usePolyrhythmLogic from '../../components/metronome/PolyrhythmMode/usePolyrhythmLogic';
import { initAudioContext, loadClickBuffers, resumeAudioContext } from '../../hooks/useMetronomeLogic/audioBuffers';

jest.mock('../../hooks/useMetronomeLogic/audioBuffers');
jest.mock('../../services/soundSetService', () => ({ getActiveSoundSet: jest.fn(async () => null) }));
const props = { tempo: 120, innerBeats: 3, outerBeats: 2, isPaused: true, volume: 0.5 };

describe('polyrhythm shared audio lifecycle', () => {
  let context;
  beforeEach(() => {
    jest.useFakeTimers();
    context = { state: 'running', currentTime: 0, close: jest.fn(), suspend: jest.fn() };
    initAudioContext.mockReturnValue(context);
    resumeAudioContext.mockImplementation(async ctx => { ctx.state = 'running'; return true; });
    loadClickBuffers.mockImplementation(async refs => {
      refs.normalBufferRef.current = {};
      refs.accentBufferRef.current = {};
      refs.firstBufferRef.current = {};
      return true;
    });
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });
  test('pause and unmount preserve the user-unlocked context', async () => {
    const { unmount } = renderHook(() => usePolyrhythmLogic(props));
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(context.suspend).not.toHaveBeenCalled();
    unmount();
    expect(context.close).not.toHaveBeenCalled();
  });
  test('interrupted audio recovers before playback', async () => {
    context.state = 'interrupted';
    const { unmount } = renderHook(() => usePolyrhythmLogic({ ...props, isPaused: false }));
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(resumeAudioContext).toHaveBeenCalledWith(context);
    expect(context.state).toBe('running');
    unmount();
    expect(context.close).not.toHaveBeenCalled();
  });
  test('a delayed resume cannot start playback after unmount', async () => {
    let finishResume;
    resumeAudioContext.mockImplementation(() => new Promise(resolve => { finishResume = resolve; }));
    const { unmount } = renderHook(() => usePolyrhythmLogic({ ...props, isPaused: false }));
    await act(async () => { jest.advanceTimersByTime(10); });
    unmount();
    await act(async () => { finishResume(true); });
    expect(jest.getTimerCount()).toBe(0);
  });
});
