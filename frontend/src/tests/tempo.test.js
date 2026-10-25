// Tap tempo characterization. (Training-related tempo maths lives in
// hooks/useMetronomeLogic/trainingLogic.test.js, scheduling maths in
// hooks/useMetronomeLogic/schedulerTiming.test.js.)
import { createTapTempoLogic } from '../hooks/useMetronomeLogic/tapTempo';
import { silenceConsole } from './helpers/metronome-fakeAudio';

describe('createTapTempoLogic', () => {
  let clock;
  let setTempo;
  let tap;
  let restoreConsole;

  // Taps at the given absolute times (ms); returns every return value.
  const tapAt = (...times) =>
    times.map((t) => {
      clock = t;
      return tap();
    });

  beforeEach(() => {
    restoreConsole = silenceConsole();
    clock = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => clock);
    setTempo = jest.fn();
    tap = createTapTempoLogic({ setTempo });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restoreConsole();
  });

  describe('construction', () => {
    test('accepts a bare function as well as { setTempo }', () => {
      const fn = jest.fn();
      const handler = createTapTempoLogic(fn);
      [1000, 1500, 2000, 2500].forEach((t) => { clock = t; handler(); });
      expect(fn).toHaveBeenCalledWith(120);
    });

    test('throws when setTempo is not a function', () => {
      expect(() => createTapTempoLogic({})).toThrow('setTempo must be a function');
      expect(() => createTapTempoLogic({ setTempo: 'x' })).toThrow('setTempo must be a function');
      expect(() => createTapTempoLogic('nope')).toThrow('setTempo must be a function');
    });
  });

  describe('number of taps required', () => {
    test('needs four taps before the tempo is applied (return null until then)', () => {
      const results = tapAt(1000, 1500, 2000, 2500);
      expect(results).toEqual([null, null, null, 120]);
      expect(setTempo).toHaveBeenCalledTimes(1);
      expect(setTempo).toHaveBeenCalledWith(120);
    });

    test('every further tap re-applies the tempo', () => {
      const results = tapAt(1000, 1500, 2000, 2500, 3000);
      expect(results.slice(3)).toEqual([120, 120]);
      expect(setTempo).toHaveBeenCalledTimes(2);
    });

    test('a single tap does nothing', () => {
      expect(tapAt(1000)).toEqual([null]);
      expect(setTempo).not.toHaveBeenCalled();
    });
  });

  describe('debounce and reset window', () => {
    test('a tap closer than 100 ms to the previous one is ignored and not recorded', () => {
      const results = tapAt(1000, 1099, 1500, 2000, 2500);
      expect(results).toEqual([null, null, null, null, 120]);
      // 4 recorded taps only -> 3 intervals of 500 ms
      expect(setTempo).toHaveBeenCalledWith(120);
    });

    test('exactly 100 ms is accepted (600 BPM clamps to 240)', () => {
      const results = tapAt(1000, 1100, 1200, 1300);
      expect(results[3]).toBe(240);
    });

    test('a gap of exactly 2000 ms is still valid', () => {
      const results = tapAt(0 + 1, 2001, 4001, 6001);
      expect(results[3]).toBe(30); // 60000/2000
    });

    test('a gap above 2000 ms resets the sequence and the late tap itself is dropped', () => {
      const results = tapAt(1000, 1500, 4000, 4500, 5000, 5500);
      // tap at 4000 only resets (null); 4500, 5000, 5500 are taps 1..3 of the new run
      expect(results).toEqual([null, null, null, null, null, null]);
      expect(setTempo).not.toHaveBeenCalled();
      expect(tapAt(6000)).toEqual([120]); // fourth tap of the new run
    });

    test('tap at time 0 is not debounced against a previous tap at time 0 (falsy lastTapTime)', () => {
      // characterization: current behaviour, see report
      const results = tapAt(0, 0, 500, 1000);
      // the duplicate tap at t=0 yields a 0 ms interval which is skipped as invalid
      expect(results).toEqual([null, null, null, 120]);
    });
  });

  describe('averaging, window of six taps', () => {
    test('only the last six taps (five intervals) influence the result', () => {
      // 1000 ms intervals (60 BPM) then switch to 500 ms intervals.
      const slow = [0, 1000, 2000, 3000, 4000, 5000].map((t) => t + 1);
      tapAt(...slow);
      // After 5 more fast taps the window holds: 5001(slow) + 5 fast
      const fast = [5501, 6001, 6501, 7001, 7501];
      const results = tapAt(...fast);
      // intervals in window: 500(from slow tap to first fast) , 500 x4 -> all 500 -> 120
      expect(results[4]).toBe(120);
    });

    test('mixed window averages the five most recent intervals', () => {
      // intervals: 600 x5 -> 100 BPM exactly (also a common tempo)
      const results = tapAt(1000, 1600, 2200, 2800, 3400, 4000);
      expect(results[5]).toBe(100);
    });
  });

  describe('outlier filter', () => {
    test('an interval more than 40 % off the median is dropped', () => {
      // intervals 500,500,500,1200 -> median 500, 1200 dropped -> 120
      const results = tapAt(1000, 1500, 2000, 2500, 3700);
      expect(results[4]).toBe(120);
    });

    test('an interval within 40 % of the median is kept', () => {
      // intervals 500,500,500,690 (+38 %) -> avg 547.5 -> 109.6 -> 110
      const results = tapAt(1000, 1500, 2000, 2500, 3190);
      expect(results[4]).toBe(110);
    });

    test('filtering is skipped when fewer than two intervals would survive', () => {
      // intervals 500,1000,2000 -> only the median (1000) survives -> keep all
      // avg 1166.67 ms -> 51.43 BPM -> 51
      const results = tapAt(0 + 1, 501, 1501, 3501);
      expect(results[3]).toBe(51);
    });
  });

  describe('snap-to common tempos and rounding', () => {
    test.each([
      // [interval ms, expected BPM]
      [1000, 60],
      [1030, 60], // 58.25 -> within 5 % of 60
      [667, 90], // 89.96
      [700, 90], // 85.71 -> 4.76 % below 90 -> snaps
      [720, 83], // 83.33 -> 7.4 % off 90 -> no snap, rounded
      [600, 100],
      [510, 120], // 117.6 -> snaps
      [500, 120],
      [430, 140], // 139.5
      [375, 160],
      [333, 180], // 180.18
      [400, 150], // between 140 and 160, further than 5 % from both
      [1500, 40],
      [2000, 30], // slowest reachable tempo
      [250, 240],
      [200, 240] // 300 BPM clamped
    ])('constant interval of %i ms -> %i BPM', (interval, expected) => {
      const base = 10000;
      const results = tapAt(base, base + interval, base + 2 * interval, base + 3 * interval);
      expect(results[3]).toBe(expected);
      expect(setTempo).toHaveBeenLastCalledWith(expected);
    });

    test('the five percent snap boundary is exclusive', () => {
      // interval 571.43 ms ~ 105.0 BPM -> exactly 5 % above 100: no snap -> 105
      const interval = 60000 / 105;
      const base = 10000;
      const results = tapAt(base, base + interval, base + 2 * interval, base + 3 * interval);
      expect(results[3]).toBe(105);
    });
  });
});
