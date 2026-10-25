import { scheduleSequence } from '../../../components/metronome/MultiCircleMode/utils/sequenceScheduler';

const bar = (subdivisions, beatMode = 'quarter', accents) => ({
  subdivisions, beatMode, accents: accents || Array(subdivisions).fill(1)
});
const fresh = (when = 0) => ({ circleIndex: 0, subIndex: 0, when, pattern: null });

function collect(options) {
  const beats = [];
  const boundaries = [];
  scheduleSequence({
    horizon: 1.0, now: 0, tempo: 60,
    onBeat: b => beats.push(b),
    onMeasureComplete: w => boundaries.push(w),
    ...options
  });
  return { beats, boundaries };
}

describe('scheduleSequence guards', () => {
  test.each([
    ['no circles', { circles: [], tempo: 120 }],
    ['zero tempo', { circles: [bar(4)], tempo: 0 }],
    ['negative tempo', { circles: [bar(4)], tempo: -10 }],
    ['NaN tempo', { circles: [bar(4)], tempo: NaN }],
    ['Infinity tempo', { circles: [bar(4)], tempo: Infinity }]
  ])('does nothing for %s and leaves the cursor untouched', (_name, extra) => {
    const cursor = fresh();
    const { beats, boundaries } = collect({ cursor, ...extra });
    expect(beats).toEqual([]);
    expect(boundaries).toEqual([]);
    expect(cursor).toEqual(fresh());
  });

  test('stops instead of looping forever when swing makes an interval zero', () => {
    const cursor = fresh();
    // swing=-1 on even sub index: interval = base * 0 = 0 -> guard returns
    const { beats } = collect({ cursor, circles: [bar(2)], tempo: 60, swing: -1 });
    expect(beats).toEqual([]);
    expect(cursor.when).toBe(0);
  });

  test('stops when swing is NaN (non finite interval)', () => {
    const { beats } = collect({ cursor: fresh(), circles: [bar(2)], tempo: 60, swing: NaN });
    expect(beats).toEqual([]);
  });

  test('schedules nothing when the cursor is already beyond the horizon', () => {
    const cursor = fresh(5);
    const { beats } = collect({ cursor, circles: [bar(4)], now: 0, horizon: 0.1 });
    expect(beats).toEqual([]);
    expect(cursor.when).toBe(5);
  });

  test('horizon boundary is exclusive: a beat exactly at now+horizon is not scheduled', () => {
    const { beats } = collect({ cursor: fresh(0.1), circles: [bar(4)], now: 0, horizon: 0.1, tempo: 120 });
    expect(beats).toEqual([]);
  });
});

describe('scheduleSequence timing and cursor', () => {
  test('applies swing alternately: long short on even/odd sub index', () => {
    const { beats } = collect({ cursor: fresh(), circles: [bar(4)], tempo: 60, swing: 0.2, horizon: 3.9 });
    expect(beats.map(b => b.interval)).toEqual([1.2, 0.8, 1.2, 0.8]);
    expect(beats.map(b => b.when)).toEqual([0, 1.2, 2, 3.2]);
  });

  test('swing is ignored for single beat bars', () => {
    const { beats } = collect({ cursor: fresh(), circles: [bar(1)], tempo: 60, swing: 0.3, horizon: 2.5 });
    expect(beats.map(b => b.interval)).toEqual([1, 1, 1]);
  });

  test('eighth bars run at double speed', () => {
    const { beats } = collect({ cursor: fresh(), circles: [bar(2, 'eighth')], tempo: 60, horizon: 1.1 });
    expect(beats.map(b => b.when)).toEqual([0, 0.5, 1]);
  });

  test('reports onMeasureComplete once per bar with the time after the final beat interval', () => {
    const { boundaries } = collect({ cursor: fresh(), circles: [bar(2), bar(1)], tempo: 60, horizon: 4.5 });
    expect(boundaries).toEqual([2, 3, 5]); // bars: [0,1] | [2] | [3,4]
  });

  test('works without an onMeasureComplete callback', () => {
    const cursor = fresh();
    expect(() => scheduleSequence({
      cursor, circles: [bar(1)], now: 0, horizon: 2.5, tempo: 60, onBeat: () => {}
    })).not.toThrow();
    expect(cursor.when).toBe(3);
  });

  test('a bar with subdivisions 0 is treated as one beat', () => {
    const { beats } = collect({ cursor: fresh(), circles: [bar(0, 'quarter', []), bar(2)], tempo: 60, horizon: 3.5 });
    expect(beats.map(b => [b.circleIndex, b.subIndex])).toEqual([[0, 0], [1, 0], [1, 1], [0, 0]]);
  });

  test('wraps a stale circleIndex when circles were removed since the last call', () => {
    const cursor = { circleIndex: 5, subIndex: 0, when: 0, pattern: null };
    const { beats } = collect({ cursor, circles: [bar(1), bar(1), bar(1)], tempo: 60, horizon: 0.5 });
    expect(beats[0].circleIndex).toBe(2); // 5 % 3
  });

  test('copies the pattern so later edits to the settings do not change the bar in flight', () => {
    const circles = [bar(3, 'quarter', [3, 1, 1])];
    const cursor = fresh();
    const seen = [];
    scheduleSequence({
      cursor, circles, now: 0, horizon: 1.5, tempo: 60,
      onBeat: b => { seen.push([...b.pattern.accents]); circles[0].accents[2] = 0; }
    });
    // edits made during the bar are not visible within that bar
    expect(seen).toEqual([[3, 1, 1], [3, 1, 1]]);
    expect(cursor.pattern.accents).toEqual([3, 1, 1]);
  });

  test('picks up edited settings at the next bar boundary', () => {
    const circles = [bar(2, 'quarter', [3, 1])];
    const cursor = fresh();
    const accentsPerBeat = [];
    const onBeat = b => accentsPerBeat.push(b.pattern.accents.join(''));
    scheduleSequence({ cursor, circles, now: 0, horizon: 1.5, tempo: 60, onBeat });
    circles[0] = bar(2, 'quarter', [2, 2]);
    scheduleSequence({ cursor, circles, now: 1.5, horizon: 2, tempo: 60, onBeat });
    expect(accentsPerBeat).toEqual(['31', '31', '22', '22']);
  });

  test('skips expired beats but still reports their bar boundaries', () => {
    const { beats, boundaries } = collect({ cursor: fresh(0), circles: [bar(2)], now: 10, horizon: 0.5, tempo: 60 });
    expect(beats.map(b => b.when)).toEqual([10]);
    expect(boundaries).toHaveLength(5);
  });
});
