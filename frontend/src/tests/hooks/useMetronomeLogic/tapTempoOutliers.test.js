// Boundary cases of the tap tempo estimate found by mutation testing:
// median outlier filter, 40 % deviation limit, tap window size and reset.
import { createTapTempoLogic } from '../../../hooks/useMetronomeLogic/tapTempo';
import { silenceConsole } from '../../helpers/metronome-fakeAudio';

describe('tap tempo estimate', () => {
  let clock;
  let setTempo;
  let tap;
  let restoreConsole;

  // Taps at the given absolute times (ms); returns the last return value.
  const tapAt = (...times) => times.map((t) => { clock = t; return tap(); }).pop();
  // Taps with the given gaps between them, starting at t = 1000.
  const tapGaps = (...gaps) => tapAt(...gaps.reduce((acc, gap) => [...acc, acc[acc.length - 1] + gap], [1000]));

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

  test('with exactly three intervals the outlier is dropped (4 taps)', () => {
    // 500, 500, 1300 -> median 500, 1300 deviates 160 % -> average of the two 500s
    expect(tapGaps(500, 500, 1300)).toBe(120);
  });

  test('intervals are sorted before the median is taken', () => {
    // unsorted 500, 1300, 500: the median is 500, not the middle element 1300
    expect(tapGaps(500, 1300, 500)).toBe(120);
  });

  test('an interval deviating exactly 40 % from the median is an outlier', () => {
    // 500, 500, 700: |700-500|/500 = 0.4 is not < 0.4, so it is dropped
    expect(tapGaps(500, 500, 700)).toBe(120);
  });

  test('an interval just inside 40 % is kept', () => {
    // 500, 500, 699 -> average 566.33 ms -> 105.9 BPM -> 106
    expect(tapGaps(500, 500, 699)).toBe(106);
  });

  test('without enough agreeing intervals the raw average is used', () => {
    // 400, 700, 1500: median 700; only 700 survives (< 2), so all three count
    // average 866.67 ms -> 69.2 BPM -> 69
    expect(tapGaps(400, 700, 1500)).toBe(69);
  });

  test('only the latest six taps are averaged', () => {
    // 7 taps; the oldest gap (750 ms) is outside the window of 6 taps, so the window
    // holds the gaps 900, 750 x4 -> average 780 ms -> 76.9 BPM -> 77
    expect(tapGaps(750, 900, 750, 750, 750, 750)).toBe(77);
  });

  test('a gap of exactly two seconds continues the sequence', () => {
    // 2000, 500, 500 -> the 2000 ms interval is an outlier, the 500s give 120 BPM
    expect(tapGaps(2000, 500, 500)).toBe(120);
  });

  test('a gap of 2001 ms starts a new sequence', () => {
    tapAt(1000, 3001); // reset: the late tap is not recorded
    // only the three taps after the reset are recorded, one short of the required four
    expect(tapAt(3501, 4001, 4501)).toBe(null);
    expect(setTempo).not.toHaveBeenCalled();
    expect(tapAt(5001)).toBe(120);
  });
});
