import { scheduleSequence } from '../../components/metronome/MultiCircleMode/utils/sequenceScheduler';

const bar = (subdivisions, beatMode = 'quarter') => ({ subdivisions, beatMode, accents: Array(subdivisions).fill(1) });
function run(circles, tempo = 120, duration = 12) {
  const cursor = { circleIndex: 0, subIndex: 0, when: 0.025, pattern: null };
  const beats = [];
  const boundaries = [];
  for (let now = 0; now < duration; now += 0.02) {
    scheduleSequence({ cursor, circles, now, horizon: 0.1, tempo, onBeat: beat => beats.push(beat), onMeasureComplete: when => boundaries.push(when) });
  }
  return { beats, boundaries };
}

test('plays complete 4, 3 and 5 beat bars in strict order starting at the first bar', () => {
  const { beats } = run([bar(4), bar(3), bar(5)]);
  expect(beats.slice(0, 24).map(b => b.circleIndex)).toEqual([
    0,0,0,0, 1,1,1, 2,2,2,2,2,
    0,0,0,0, 1,1,1, 2,2,2,2,2
  ]);
  beats.forEach((beat, index) => expect(beat.when).toBeCloseTo(0.025 + index * 0.5, 10));
});

test.each([1, 2, 3, 6])('cycles %i single-beat bars at 240 BPM without transition lockouts', count => {
  const { beats } = run(Array.from({ length: count }, () => bar(1, 'eighth')), 240, 3);
  beats.forEach((beat, i) => {
    expect(beat.circleIndex).toBe(i % count);
    expect(beat.when).toBeCloseTo(0.025 + i * 0.125, 10);
  });
});

test('uses each bar\'s beat mode and keeps the outgoing final interval', () => {
  const { beats } = run([bar(2), bar(3, 'eighth'), bar(1)], 120, 3);
  expect(beats.slice(0, 7).map(b => b.when)).toEqual([0.025, 0.525, 1.025, 1.275, 1.525, 1.775, 2.275]);
  expect(beats.slice(0, 7).map(b => b.circleIndex)).toEqual([0,0,1,1,1,2,0]);
});

test('a stalled UI skips expired clicks but preserves the sequence phase', () => {
  const cursor = { circleIndex: 0, subIndex: 0, when: 0.025, pattern: null };
  const beats = [];
  scheduleSequence({ cursor, circles: [bar(2),bar(2),bar(2)], now: 2, horizon: 0.1, tempo: 120, onBeat: beat => beats.push(beat) });
  expect(beats).toHaveLength(1);
  expect(beats[0]).toMatchObject({ circleIndex: 2, subIndex: 0, when: 2.025 });
});
