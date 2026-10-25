import { renderHook, fireEvent } from '@testing-library/react';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

const CALLBACK_NAMES = [
  'onTogglePlayPause',
  'onTapTempo',
  'onSetSubdivisions',
  'onIncreaseTempo',
  'onDecreaseTempo',
  'onSwitchToAnalog',
  'onSwitchToCircle',
  'onSwitchToGrid',
  'onSwitchToMulti',
  'onSwitchToPolyrhythm',
  'onToggleInfoOverlay',
  'onToggleTrainingOverlay',
  'onManualTempoIncrease',
];

const makeCallbacks = () =>
  CALLBACK_NAMES.reduce((acc, name) => ({ ...acc, [name]: jest.fn() }), {});

// key code -> [callback, expected args]
const SIMPLE_KEYS = [
  ['ArrowUp', 'onIncreaseTempo', []],
  ['ArrowRight', 'onIncreaseTempo', []],
  ['ArrowDown', 'onDecreaseTempo', []],
  ['ArrowLeft', 'onDecreaseTempo', []],
  ['KeyA', 'onSwitchToAnalog', []],
  ['KeyC', 'onSwitchToCircle', []],
  ['KeyG', 'onSwitchToGrid', []],
  ['KeyM', 'onSwitchToMulti', []],
  ['KeyY', 'onSwitchToPolyrhythm', []],
  ['KeyI', 'onToggleInfoOverlay', []],
  ['KeyR', 'onToggleTrainingOverlay', []],
  ['Enter', 'onManualTempoIncrease', []],
];

describe('useKeyboardShortcuts', () => {
  let dateNow;
  let perfNow;
  let clock;

  const setClock = (ms) => {
    clock = ms;
  };

  beforeEach(() => {
    clock = 10000;
    dateNow = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    perfNow = jest.spyOn(performance, 'now').mockImplementation(() => clock);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    delete window.handleGlobalTapTempo;
    delete window.tapTempoRef;
  });

  afterEach(() => {
    dateNow.mockRestore();
    perfNow.mockRestore();
    jest.restoreAllMocks();
    delete window.handleGlobalTapTempo;
    delete window.tapTempoRef;
  });

  describe('key to callback mapping', () => {
    test.each(SIMPLE_KEYS)('%s calls %s exactly once and is consumed', (code, name, args) => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      const notPrevented = fireEvent.keyDown(window, { code });

      expect(cbs[name]).toHaveBeenCalledTimes(1);
      expect(cbs[name]).toHaveBeenCalledWith(...args);
      expect(notPrevented).toBe(false);
      // no other callback fired
      CALLBACK_NAMES.filter((n) => n !== name).forEach((n) => {
        expect(cbs[n]).not.toHaveBeenCalled();
      });
    });

    test.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('Digit%i and Numpad%i set subdivisions to %i', (n) => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      expect(fireEvent.keyDown(window, { code: `Digit${n}` })).toBe(false);
      expect(fireEvent.keyDown(window, { code: `Numpad${n}` })).toBe(false);

      expect(cbs.onSetSubdivisions).toHaveBeenCalledTimes(2);
      expect(cbs.onSetSubdivisions).toHaveBeenNthCalledWith(1, n);
      expect(cbs.onSetSubdivisions).toHaveBeenNthCalledWith(2, n);
    });

    test('Digit0 and Numpad0 are not shortcuts', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      expect(fireEvent.keyDown(window, { code: 'Digit0' })).toBe(true);
      expect(fireEvent.keyDown(window, { code: 'Numpad0' })).toBe(true);
      expect(cbs.onSetSubdivisions).not.toHaveBeenCalled();
    });

    test('unmapped keys keep their default behaviour', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      expect(fireEvent.keyDown(window, { code: 'KeyQ' })).toBe(true);
      expect(fireEvent.keyDown(window, { code: 'Tab' })).toBe(true);
      CALLBACK_NAMES.forEach((n) => expect(cbs[n]).not.toHaveBeenCalled());
    });

    test('mapping uses event.code, not event.key', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      fireEvent.keyDown(window, { key: 'g', code: 'KeyB' });
      expect(cbs.onSwitchToGrid).not.toHaveBeenCalled();
    });

    test('mapped keys without a registered callback are swallowed without throwing', () => {
      renderHook(() => useKeyboardShortcuts({}));

      ['KeyR', 'Digit1', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyC', 'KeyG', 'KeyI', 'KeyM', 'KeyY'].forEach(
        (code) => {
          expect(fireEvent.keyDown(window, { code })).toBe(false);
        }
      );
    });

    test('Enter without onManualTempoIncrease is not consumed', () => {
      renderHook(() => useKeyboardShortcuts({}));
      expect(fireEvent.keyDown(window, { code: 'Enter' })).toBe(true);
    });
  });

  describe('guards', () => {
    test.each(['input', 'textarea'])('ignores keys typed into a <%s>', (tag) => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));
      const el = document.createElement(tag);
      document.body.appendChild(el);

      const results = ['Space', 'KeyT', 'KeyA', 'Digit3', 'ArrowUp', 'Enter'].map((code) =>
        fireEvent.keyDown(el, { code })
      );

      expect(results.every((r) => r === true)).toBe(true);
      CALLBACK_NAMES.forEach((n) => expect(cbs[n]).not.toHaveBeenCalled());
      el.remove();
    });

    test('ignores keys typed into a contentEditable element', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));
      const el = document.createElement('div');
      // jsdom does not implement isContentEditable
      Object.defineProperty(el, 'isContentEditable', { value: true });
      document.body.appendChild(el);

      fireEvent.keyDown(el, { code: 'KeyA' });
      fireEvent.keyDown(el, { code: 'Space' });

      expect(cbs.onSwitchToAnalog).not.toHaveBeenCalled();
      expect(cbs.onTogglePlayPause).not.toHaveBeenCalled();
      el.remove();
    });

    test('still fires for non-text controls such as buttons and selects', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));
      const button = document.createElement('button');
      const select = document.createElement('select');
      document.body.append(button, select);

      fireEvent.keyDown(button, { code: 'KeyA' });
      fireEvent.keyDown(select, { code: 'KeyC' });

      expect(cbs.onSwitchToAnalog).toHaveBeenCalledTimes(1);
      expect(cbs.onSwitchToCircle).toHaveBeenCalledTimes(1);
      button.remove();
      select.remove();
    });

    test.each([
      ['metaKey', 'KeyC'],
      ['metaKey', 'KeyM'],
      ['metaKey', 'Digit1'],
      ['ctrlKey', 'Space'],
      ['ctrlKey', 'KeyT'],
      ['altKey', 'ArrowRight'],
      ['altKey', 'Enter'],
    ])('%s + %s is left to the browser / menu bar', (modifier, code) => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      const notPrevented = fireEvent.keyDown(window, { code, [modifier]: true });

      expect(notPrevented).toBe(true);
      CALLBACK_NAMES.forEach((n) => expect(cbs[n]).not.toHaveBeenCalled());
    });

    test('shift does not suppress a shortcut', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      fireEvent.keyDown(window, { code: 'KeyG', shiftKey: true });

      expect(cbs.onSwitchToGrid).toHaveBeenCalledTimes(1);
    });
  });

  describe('Space (play / pause)', () => {
    test('calls onTogglePlayPause and prevents page scroll', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      expect(fireEvent.keyDown(window, { code: 'Space' })).toBe(false);

      expect(cbs.onTogglePlayPause).toHaveBeenCalledTimes(1);
    });

    test('debounces presses closer than 300 ms but still prevents default', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      fireEvent.keyDown(window, { code: 'Space' });
      setClock(10299);
      const notPrevented = fireEvent.keyDown(window, { code: 'Space' });

      expect(cbs.onTogglePlayPause).toHaveBeenCalledTimes(1);
      expect(notPrevented).toBe(false);
    });

    test('accepts a press exactly 300 ms after the previous one', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      fireEvent.keyDown(window, { code: 'Space' });
      setClock(10300);
      fireEvent.keyDown(window, { code: 'Space' });

      expect(cbs.onTogglePlayPause).toHaveBeenCalledTimes(2);
    });

    test('a debounced press does not extend the debounce window', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      fireEvent.keyDown(window, { code: 'Space' }); // t=10000, accepted
      setClock(10200);
      fireEvent.keyDown(window, { code: 'Space' }); // ignored
      setClock(10300);
      fireEvent.keyDown(window, { code: 'Space' }); // 300 after the accepted one

      expect(cbs.onTogglePlayPause).toHaveBeenCalledTimes(2);
    });

    test('dispatches metronome-toggle-play when no handler is provided', () => {
      renderHook(() => useKeyboardShortcuts({}));
      const listener = jest.fn();
      window.addEventListener('metronome-toggle-play', listener);

      fireEvent.keyDown(window, { code: 'Space' });

      window.removeEventListener('metronome-toggle-play', listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail).toEqual({ timestamp: 10000 });
    });

    test('falls back to the global event and logs when the handler throws', () => {
      const boom = new Error('boom');
      const onTogglePlayPause = jest.fn(() => {
        throw boom;
      });
      renderHook(() => useKeyboardShortcuts({ onTogglePlayPause }));
      const listener = jest.fn();
      window.addEventListener('metronome-toggle-play', listener);

      expect(() => fireEvent.keyDown(window, { code: 'Space' })).not.toThrow();

      window.removeEventListener('metronome-toggle-play', listener);
      expect(onTogglePlayPause).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        '[KEYBOARD] Error in play/pause handler:',
        boom
      );
    });

    test('uses the latest onTogglePlayPause after a rerender', () => {
      const first = jest.fn();
      const second = jest.fn();
      const { rerender } = renderHook(
        ({ cb }) => useKeyboardShortcuts({ onTogglePlayPause: cb }),
        { initialProps: { cb: first } }
      );

      rerender({ cb: second });
      fireEvent.keyDown(window, { code: 'Space' });

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe('T (tap tempo) dispatch priority', () => {
    test('prefers window.handleGlobalTapTempo over everything else', () => {
      const cbs = makeCallbacks();
      window.handleGlobalTapTempo = jest.fn();
      window.tapTempoRef = { current: jest.fn() };
      renderHook(() => useKeyboardShortcuts(cbs));

      expect(fireEvent.keyDown(window, { code: 'KeyT' })).toBe(false);

      expect(window.handleGlobalTapTempo).toHaveBeenCalledTimes(1);
      expect(window.tapTempoRef.current).not.toHaveBeenCalled();
      expect(cbs.onTapTempo).not.toHaveBeenCalled();
    });

    test('then window.tapTempoRef.current when it is a function', () => {
      const cbs = makeCallbacks();
      window.tapTempoRef = { current: jest.fn() };
      renderHook(() => useKeyboardShortcuts(cbs));

      fireEvent.keyDown(window, { code: 'KeyT' });

      expect(window.tapTempoRef.current).toHaveBeenCalledTimes(1);
      expect(cbs.onTapTempo).not.toHaveBeenCalled();
    });

    test('skips window.tapTempoRef when current is not a function', () => {
      const cbs = makeCallbacks();
      window.tapTempoRef = { current: 'nope' };
      renderHook(() => useKeyboardShortcuts(cbs));

      fireEvent.keyDown(window, { code: 'KeyT' });

      expect(cbs.onTapTempo).toHaveBeenCalledTimes(1);
    });

    test('then the onTapTempo prop', () => {
      const cbs = makeCallbacks();
      renderHook(() => useKeyboardShortcuts(cbs));

      fireEvent.keyDown(window, { code: 'KeyT' });

      expect(cbs.onTapTempo).toHaveBeenCalledTimes(1);
    });

    test('uses the latest onTapTempo after a rerender', () => {
      const first = jest.fn();
      const second = jest.fn();
      const { rerender } = renderHook(({ cb }) => useKeyboardShortcuts({ onTapTempo: cb }), {
        initialProps: { cb: first },
      });

      rerender({ cb: second });
      fireEvent.keyDown(window, { code: 'KeyT' });

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe('T fallback implementation (no handler anywhere)', () => {
    let tempoEvents;
    const tempoListener = (e) => tempoEvents.push(e.detail.tempo);

    beforeEach(() => {
      tempoEvents = [];
      window.addEventListener('metronome-set-tempo', tempoListener);
    });
    afterEach(() => {
      window.removeEventListener('metronome-set-tempo', tempoListener);
    });

    const pressT = (at) => {
      setClock(at);
      return fireEvent.keyDown(window, { code: 'KeyT' });
    };

    test('a single tap sets no tempo and still consumes the key', () => {
      renderHook(() => useKeyboardShortcuts({}));

      expect(pressT(20000)).toBe(false);

      expect(tempoEvents).toEqual([]);
    });

    test('two taps 500 ms apart set 120 BPM', () => {
      renderHook(() => useKeyboardShortcuts({}));

      pressT(20000);
      pressT(20500);

      // characterization: current behaviour, see report. The key handler and the
      // metronome-tap-tempo listener both run the tempo calculation, so the
      // second tap emits the tempo twice.
      expect(tempoEvents).toEqual([120, 120]);
    });

    test('republishes the tap through the metronome-tap-tempo event', () => {
      renderHook(() => useKeyboardShortcuts({}));
      const tapListener = jest.fn();
      window.addEventListener('metronome-tap-tempo', tapListener);

      pressT(20000);

      window.removeEventListener('metronome-tap-tempo', tapListener);
      expect(tapListener).toHaveBeenCalledTimes(1);
      expect(tapListener.mock.calls[0][0].detail).toEqual({ timestamp: 20000 });
    });

    test('ignores a second key press within 100 ms', () => {
      renderHook(() => useKeyboardShortcuts({}));
      const tapListener = jest.fn();
      window.addEventListener('metronome-tap-tempo', tapListener);

      pressT(20000);
      pressT(20099);

      window.removeEventListener('metronome-tap-tempo', tapListener);
      expect(tapListener).toHaveBeenCalledTimes(1);
      expect(tempoEvents).toEqual([]);
    });

    test('accepts a second key press exactly 100 ms later (600 BPM clamps to 240)', () => {
      renderHook(() => useKeyboardShortcuts({}));

      pressT(20000);
      pressT(20100);

      // emitted twice, see the characterization note above
      expect(tempoEvents).toEqual([240, 240]);
    });

    test('a third tap refines the tempo from the average of the intervals', () => {
      renderHook(() => useKeyboardShortcuts({}));

      pressT(20000);
      pressT(20400); // 150 BPM
      pressT(20800);

      // two events for tap 2 and two for tap 3, see the characterization note above
      expect(tempoEvents).toEqual([150, 150, 150, 150]);
    });
  });

  describe('metronome-tap-tempo event', () => {
    let tempoEvents;
    const tempoListener = (e) => tempoEvents.push(e.detail.tempo);

    beforeEach(() => {
      tempoEvents = [];
      window.addEventListener('metronome-set-tempo', tempoListener);
    });
    afterEach(() => {
      window.removeEventListener('metronome-set-tempo', tempoListener);
    });

    const tap = (timestamp) =>
      window.dispatchEvent(new CustomEvent('metronome-tap-tempo', { detail: { timestamp } }));

    test('delegates to onTapTempo when provided and does not compute a tempo', () => {
      const onTapTempo = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onTapTempo }));

      tap(1000);
      tap(1500);

      expect(onTapTempo).toHaveBeenCalledTimes(2);
      expect(tempoEvents).toEqual([]);
    });

    test('falls back to performance.now when the event has no timestamp', () => {
      renderHook(() => useKeyboardShortcuts({}));

      setClock(30000);
      window.dispatchEvent(new CustomEvent('metronome-tap-tempo'));
      setClock(30500);
      window.dispatchEvent(new CustomEvent('metronome-tap-tempo', { detail: {} }));

      expect(tempoEvents).toEqual([120]);
    });

    test('needs two taps; one tap emits nothing', () => {
      renderHook(() => useKeyboardShortcuts({}));

      tap(1000);

      expect(tempoEvents).toEqual([]);
    });

    test('taps closer than 100 ms are dropped', () => {
      renderHook(() => useKeyboardShortcuts({}));

      tap(1000);
      tap(1050);

      expect(tempoEvents).toEqual([]);
    });

    test('a gap above 2000 ms yields no tempo', () => {
      renderHook(() => useKeyboardShortcuts({}));

      tap(1000);
      tap(3001);

      expect(tempoEvents).toEqual([]);
    });

    test('a gap of exactly 2000 ms is valid (30 BPM)', () => {
      renderHook(() => useKeyboardShortcuts({}));

      tap(1000);
      tap(3000);

      expect(tempoEvents).toEqual([30]);
    });

    test.each([
      [480, 120], // 125 BPM is within 5 % of 120
      [600, 100], // exactly 100
      [667, 90], // 89.96 -> 90
      [400, 150], // 150 is >5 % away from 140 and 160: no snapping
      [1000, 60],
      [333, 180],
      [450, 133], // 133.3 -> 133: 5.0 % off 140 is not < 5 %, stays 133
    ])('interval %i ms gives %i BPM (snap-to-common-tempo rules)', (interval, bpm) => {
      renderHook(() => useKeyboardShortcuts({}));

      tap(1000);
      tap(1000 + interval);

      expect(tempoEvents).toEqual([bpm]);
    });

    test('clamps very fast taps to 240 BPM', () => {
      renderHook(() => useKeyboardShortcuts({}));

      tap(1000);
      tap(1100);

      expect(tempoEvents).toEqual([240]);
    });

    test('an outlier interval is removed when at least three intervals exist', () => {
      renderHook(() => useKeyboardShortcuts({}));

      [1000, 1500, 2000, 2500, 3800].forEach(tap);

      // intervals 500,500,500,1300 -> median 500 -> 1300 dropped -> 120 BPM
      expect(tempoEvents[tempoEvents.length - 1]).toBe(120);
    });

    test('outlier filtering is skipped when fewer than two intervals survive', () => {
      renderHook(() => useKeyboardShortcuts({}));

      [1000, 1300, 1800, 2800].forEach(tap);

      // intervals 300,500,1000 -> only 500 within 40 % of the median -> keep all
      // avg 600 ms -> 100 BPM
      expect(tempoEvents[tempoEvents.length - 1]).toBe(100);
    });

    test('only the last five taps are used', () => {
      renderHook(() => useKeyboardShortcuts({}));

      [1000, 1100, 1200, 2000, 2500, 3000, 3500].forEach(tap);

      // last five: 1200,2000,2500,3000,3500 -> 800,500,500,500 -> outlier removed
      expect(tempoEvents[tempoEvents.length - 1]).toBe(120);
    });
  });

  describe('lifecycle', () => {
    test('removes its window listeners on unmount', () => {
      const cbs = makeCallbacks();
      const { unmount } = renderHook(() => useKeyboardShortcuts(cbs));
      unmount();

      fireEvent.keyDown(window, { code: 'KeyA' });
      window.dispatchEvent(new CustomEvent('metronome-tap-tempo'));

      expect(cbs.onSwitchToAnalog).not.toHaveBeenCalled();
      expect(cbs.onTapTempo).not.toHaveBeenCalled();
    });

    test('rebinds key handlers when a callback identity changes', () => {
      const first = jest.fn();
      const second = jest.fn();
      const { rerender } = renderHook(({ cb }) => useKeyboardShortcuts({ onIncreaseTempo: cb }), {
        initialProps: { cb: first },
      });

      fireEvent.keyDown(window, { code: 'ArrowUp' });
      rerender({ cb: second });
      fireEvent.keyDown(window, { code: 'ArrowUp' });

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });
  });
});
