import { scheduleAnimationUpdate } from '../../../components/metronome/PolyrhythmMode/PolyrhythmLogic/animationSync';

describe('scheduleAnimationUpdate', () => {
  let ctx;
  let args;
  beforeEach(() => {
    jest.useFakeTimers();
    ctx = { currentTime: 10 };
    args = {
      audioTime: 10.25, // 250 ms ahead (exactly representable)
      audioCtx: ctx,
      beatIndex: 2,
      isInnerCircle: true,
      setInnerCurrentSubFn: jest.fn(),
      setOuterCurrentSubFn: jest.fn(),
      onInnerBeatTriggeredFn: jest.fn(),
      onOuterBeatTriggeredFn: jest.fn(),
      uiAnimationDuration: 0.04
    };
    delete window.audioContext;
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    delete window.audioContext;
  });

  test('does nothing without a context or without an audio time', () => {
    scheduleAnimationUpdate({ ...args, audioCtx: null });
    scheduleAnimationUpdate({ ...args, audioTime: 0 });
    expect(jest.getTimerCount()).toBe(0);
    expect(args.setInnerCurrentSubFn).not.toHaveBeenCalled();
  });

  test('highlights the inner beat at the audio time and clears it after the animation duration', () => {
    scheduleAnimationUpdate(args);
    jest.advanceTimersByTime(249);
    expect(args.setInnerCurrentSubFn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(args.setInnerCurrentSubFn).toHaveBeenCalledWith(2);
    expect(args.onInnerBeatTriggeredFn).toHaveBeenCalledWith(2);
    expect(args.setOuterCurrentSubFn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(39);
    expect(args.setInnerCurrentSubFn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(args.setInnerCurrentSubFn).toHaveBeenLastCalledWith(-1);
  });

  test('highlights the outer beat through the outer callbacks', () => {
    scheduleAnimationUpdate({ ...args, isInnerCircle: false });
    jest.advanceTimersByTime(250);
    expect(args.setOuterCurrentSubFn).toHaveBeenCalledWith(2);
    expect(args.onOuterBeatTriggeredFn).toHaveBeenCalledWith(2);
    expect(args.onInnerBeatTriggeredFn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(40);
    expect(args.setOuterCurrentSubFn).toHaveBeenLastCalledWith(-1);
  });

  test('missing beat callbacks are tolerated and a zero animation duration never clears', () => {
    scheduleAnimationUpdate({
      ...args, onInnerBeatTriggeredFn: undefined, onOuterBeatTriggeredFn: undefined, uiAnimationDuration: 0
    });
    scheduleAnimationUpdate({
      ...args, isInnerCircle: false, onInnerBeatTriggeredFn: undefined, onOuterBeatTriggeredFn: undefined, uiAnimationDuration: 0
    });
    jest.advanceTimersByTime(1000);
    expect(args.setInnerCurrentSubFn.mock.calls).toEqual([[2]]);
    expect(args.setOuterCurrentSubFn.mock.calls).toEqual([[2]]);
  });

  test('a beat in the past fires immediately', () => {
    scheduleAnimationUpdate({ ...args, audioTime: 9 });
    jest.advanceTimersByTime(0);
    expect(args.setInnerCurrentSubFn).toHaveBeenCalledWith(2);
  });

  test('uses the default animation duration of 40 ms', () => {
    const { uiAnimationDuration, ...withoutDuration } = args; // eslint-disable-line no-unused-vars
    scheduleAnimationUpdate(withoutDuration);
    jest.advanceTimersByTime(289);
    expect(args.setInnerCurrentSubFn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(args.setInnerCurrentSubFn).toHaveBeenLastCalledWith(-1);
  });

  test('the first inner beat publishes the audio context and dispatches sync and first-beat events', () => {
    window.currentTempo = 100;
    window.currentInnerBeats = 5;
    const sync = [];
    const first = [];
    const onSync = e => sync.push(e.detail);
    const onFirst = e => first.push(e.detail);
    window.addEventListener('audio-time-sync', onSync);
    window.addEventListener('polyrhythm-first-beat', onFirst);
    scheduleAnimationUpdate({ ...args, beatIndex: 0 });
    expect(window.audioContext).toBe(ctx);
    expect(sync).toHaveLength(1);
    expect(sync[0].audioContextTime).toBe(10);
    expect(first).toHaveLength(0);
    jest.advanceTimersByTime(250);
    window.removeEventListener('audio-time-sync', onSync);
    window.removeEventListener('polyrhythm-first-beat', onFirst);
    expect(first).toHaveLength(1);
    expect(first[0]).toEqual(expect.objectContaining({ audioTime: 10.25, bpm: 100, innerBeats: 5 }));
    expect(sync).toHaveLength(2);
    expect(sync[1].scheduledAudioTime).toBe(10.25);
    delete window.currentTempo;
    delete window.currentInnerBeats;
  });

  test('the outer first beat does not dispatch the first-beat event, and an existing context is kept', () => {
    const existing = { currentTime: 1 };
    window.audioContext = existing;
    const first = [];
    const onFirst = e => first.push(e.detail);
    window.addEventListener('polyrhythm-first-beat', onFirst);
    scheduleAnimationUpdate({ ...args, beatIndex: 0, isInnerCircle: false });
    jest.advanceTimersByTime(200);
    window.removeEventListener('polyrhythm-first-beat', onFirst);
    expect(first).toHaveLength(0);
    expect(window.audioContext).toBe(existing);
  });

  test('polyrhythm-cleanup cancels a pending first-beat event; the listener is removed after the beat', () => {
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const first = [];
    const onFirst = e => first.push(e.detail);
    window.addEventListener('polyrhythm-first-beat', onFirst);
    scheduleAnimationUpdate({ ...args, beatIndex: 0 });
    const cleanupCall = add.mock.calls.find(c => c[0] === 'polyrhythm-cleanup');
    expect(cleanupCall).toBeDefined();
    window.dispatchEvent(new CustomEvent('polyrhythm-cleanup'));
    jest.advanceTimersByTime(250);
    expect(first).toHaveLength(0);
    // the cleanup listener is dropped 100 ms after the beat was due
    expect(remove.mock.calls.filter(c => c[0] === 'polyrhythm-cleanup')).toHaveLength(0);
    jest.advanceTimersByTime(99);
    expect(remove.mock.calls.filter(c => c[0] === 'polyrhythm-cleanup')).toHaveLength(0);
    jest.advanceTimersByTime(1);
    const removed = remove.mock.calls.filter(c => c[0] === 'polyrhythm-cleanup');
    expect(removed).toHaveLength(1);
    expect(removed[0][1]).toBe(cleanupCall[1]);
    window.removeEventListener('polyrhythm-first-beat', onFirst);
    add.mockRestore();
    remove.mockRestore();
    // the highlight itself is independent of the cleanup event
    expect(args.setInnerCurrentSubFn).toHaveBeenCalledWith(0);
  });
});
