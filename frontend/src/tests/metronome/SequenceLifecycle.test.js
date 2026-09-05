import React from 'react';
import { act, renderHook } from '@testing-library/react';
import useMultiCircleMetronomeLogic from '../../components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic';
import { scheduleSubdivision } from '../../hooks/useMetronomeLogic/scheduler';
import { resumeAudioContext } from '../../hooks/useMetronomeLogic/audioBuffers';

const mockContext = { state: 'running', currentTime: 0 };
const mockInitialize = jest.fn(async () => mockContext);
jest.mock('../../components/metronome/MultiCircleMode/hooks/useAudioContext', () => ({
  useAudioContext: (context, normal, accent, first) => {
    context.current = mockContext;
    normal.current = accent.current = first.current = {};
    return { safelyInitAudioContext: mockInitialize };
  }
}));
jest.mock('../../hooks/useMetronomeLogic/scheduler', () => ({ scheduleSubdivision: jest.fn() }));
jest.mock('../../hooks/useMetronomeLogic/audioBuffers', () => ({ resumeAudioContext: jest.fn(async () => true) }));
const circles = [4, 3, 5].map((subdivisions, i) => ({ subdivisions, beatMode: 'quarter', accents: Array(subdivisions).fill(i + 1) }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockContext.currentTime = 0;
  resumeAudioContext.mockResolvedValue(true);
  scheduleSubdivision.mockImplementation(({ onAnySubTrigger }) => onAnySubTrigger());
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('visual rerenders do not restart or reorder the audio sequence', async () => {
  const { result, unmount } = renderHook(() => {
    const [playingCircle, setPlayingCircle] = React.useState(0);
    const logic = useMultiCircleMetronomeLogic({ tempo: 120, setTempo: () => {}, isPaused: false, swing: 0, volume: 0.5, circleSettings: circles, playingCircle, onCircleChange: setPlayingCircle });
    return { logic, playingCircle };
  });
  await act(async () => {});
  for (let tick = 1; tick <= 590; tick++) {
    await act(async () => {
      mockContext.currentTime = tick * 0.02;
      jest.advanceTimersByTime(20);
    });
  }
  const beats = scheduleSubdivision.mock.calls.map(([beat]) => beat);
  expect(beats.slice(0,24).map(b => b.accentsRef.current[0])).toEqual([1,1,1,1,2,2,2,3,3,3,3,3,1,1,1,1,2,2,2,3,3,3,3,3]);
  beats.forEach((beat, i) => expect(beat.when).toBeCloseTo(0.025 + i * 0.5, 10));
  expect(mockInitialize).toHaveBeenCalledTimes(1);
  expect(result.current.playingCircle).toBe(2);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('stopping during resume prevents a delayed restart', async () => {
  let finish;
  resumeAudioContext.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { rerender, unmount } = renderHook(({ paused }) => useMultiCircleMetronomeLogic({ tempo: 120, setTempo: () => {}, isPaused: paused, swing: 0, volume: 0.5, circleSettings: circles }), { initialProps: { paused: false } });
  rerender({ paused: true });
  await act(async () => { finish(true); });
  expect(scheduleSubdivision).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
  unmount();
});
