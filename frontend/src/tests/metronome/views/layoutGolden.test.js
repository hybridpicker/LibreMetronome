// Golden-master tests for the pure Score layout maths. The fixture holds the
// output of staffLayout/gridLayout for a grid of plate sizes and beat counts;
// any arithmetic change in the layout functions shows up as a diff.
// Regenerate deliberately with: UPDATE_GOLDEN=1 npm run test:ci -- layoutGolden
import fs from 'fs';
import path from 'path';
import { staffLayout } from '../../../components/metronome/Score/staffLayout';
import { gridLayout } from '../../../components/metronome/Score/gridLayout';

const FIXTURE = path.join(__dirname, '..', '..', 'fixtures', 'layoutGolden.json');
const WIDTHS = [260, 328, 500, 720, 1100];
const HEIGHTS = [160, 240, 360, 600, 900];
const BEATS = [1, 2, 3, 4, 5, 7, 9];
const MIN_HITS = [44, 56];

const compute = () => {
  const out = {};
  WIDTHS.forEach((width) => HEIGHTS.forEach((height) => BEATS.forEach((beats) => MIN_HITS.forEach((minHit) => {
    const key = `${width}x${height} n=${beats} hit=${minHit}`;
    out[key] = {
      staff: staffLayout({ width, height, beats, minHit }),
      grid: gridLayout({ width, height, beats, minHit })
    };
  }))));
  return JSON.parse(JSON.stringify(out));
};

test('staff and grid layout match the recorded outputs', () => {
  const actual = compute();
  if (process.env.UPDATE_GOLDEN === '1') {
    fs.writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 1)}\n`);
  }
  const expected = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  expect(Object.keys(actual)).toEqual(Object.keys(expected));
  expect(actual).toEqual(expected);
});
