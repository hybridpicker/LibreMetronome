/* eslint-disable testing-library/no-container, testing-library/no-node-access, testing-library/render-result-naming-convention --
   These tests assert SVG/canvas geometry, CSS state classes and img sources that have no accessible role. */
import { render } from '@testing-library/react';
import { AccentGlyph, BeatMark, TempoNote } from '../../../components/metronome/ScoreGlyphs';

// BeatMark/AccentGlyph render SVG fragments; SVG has no accessible role in
// Testing Library, so the structure is read through the container.
const renderMark = (props) => {
  const utils = render(
    <svg>
      <BeatMark cx={50} cy={40} {...props} />
    </svg>
  );
  return utils.container;
};

describe('TempoNote', () => {
  test('is a decorative 14 x 30 note and takes a custom class', () => {
    const { container, rerender } = render(<TempoNote />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 14 30');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveClass('tempo-note');
    rerender(<TempoNote className="custom" />);
    expect(container.querySelector('svg')).toHaveClass('custom');
    expect(container.querySelectorAll('ellipse')).toHaveLength(1);
  });
});

describe('BeatMark', () => {
  test('normal: head + stem, no accent mark, no flag', () => {
    const c = renderMark({ state: 'normal', k: 1, stem: 42 });
    expect(c.querySelector('.score-mark')).toHaveClass('is-normal');
    expect(c.querySelectorAll('.score-head')).toHaveLength(1);
    expect(c.querySelectorAll('.score-stem')).toHaveLength(1);
    expect(c.querySelectorAll('.score-art')).toHaveLength(0);
    expect(c.querySelectorAll('.score-flag')).toHaveLength(0);
  });

  test('geometry scales with k: head radii, stem position and stem length', () => {
    const c = renderMark({ k: 2, stem: 30 });
    const head = c.querySelector('.score-head');
    expect(head).toHaveAttribute('rx', '15.2');
    expect(head).toHaveAttribute('ry', '9.6');
    expect(head).toHaveAttribute('transform', 'rotate(-24 50 40)');
    const stem = c.querySelector('.score-stem');
    expect(stem).toHaveAttribute('x1', String(50 + 6.6 * 2));
    expect(stem).toHaveAttribute('y1', '38'); // cy - k
    expect(stem).toHaveAttribute('y2', '10'); // cy - stem
  });

  test('default stem length is 42 * k', () => {
    const c = renderMark({ k: 1 });
    expect(c.querySelector('.score-stem')).toHaveAttribute('y2', String(40 - 42));
  });

  test('a zero stem draws neither stem nor flag', () => {
    const c = renderMark({ stem: 0, eighth: true });
    expect(c.querySelectorAll('.score-stem')).toHaveLength(0);
    expect(c.querySelectorAll('.score-flag')).toHaveLength(0);
  });

  test('eighth adds a flag that starts at the stem top', () => {
    const c = renderMark({ eighth: true, k: 1, stem: 30 });
    const flag = c.querySelector('.score-flag');
    expect(flag).not.toBeNull();
    expect(flag.getAttribute('d').startsWith(`M${50 + 6.6} ${40 - 30} C`)).toBe(true);
  });

  test('stroke width scales with k and is clamped to 1.20..2.50', () => {
    const stroke = (k) => renderMark({ k, stem: 10 }).querySelector('.score-stem').getAttribute('stroke-width');
    expect(stroke(0.1)).toBe('1.20');
    expect(stroke(1)).toBe('1.50');
    expect(stroke(1.2)).toBe('1.80');
    expect(stroke(5)).toBe('2.50');
  });

  test('accent: ">" under the note at artY, or 20k below the head by default', () => {
    const withArt = renderMark({ state: 'accent', k: 1, artY: 100 });
    expect(withArt.querySelector('.score-mark')).toHaveClass('is-accent');
    expect(withArt.querySelector('.score-art').getAttribute('d')).toBe('M43 96 L57 100 L43 104');
    const dflt = renderMark({ state: 'accent', k: 1 });
    expect(dflt.querySelector('.score-art').getAttribute('d')).toBe('M43 56 L57 60 L43 64');
  });

  test('first: "^" under the note', () => {
    const c = renderMark({ state: 'first', k: 1, artY: 100 });
    expect(c.querySelector('.score-mark')).toHaveClass('is-first');
    expect(c.querySelector('.score-art').getAttribute('d')).toBe('M43 104 L50 96 L57 104');
  });

  test('artY === false suppresses the accent and first-beat marks', () => {
    expect(renderMark({ state: 'accent', artY: false }).querySelectorAll('.score-art')).toHaveLength(0);
    expect(renderMark({ state: 'first', artY: false }).querySelectorAll('.score-art')).toHaveLength(0);
  });

  test('muted: a rest centred on cx/cy, without head, stem or accent', () => {
    const c = renderMark({ state: 'muted', k: 1 });
    expect(c.querySelector('.score-mark')).toHaveClass('is-muted');
    expect(c.querySelectorAll('.score-head, .score-stem, .score-art')).toHaveLength(0);
    const rest = c.querySelector('.score-rest');
    // s = 30 * k / 20 = 1.5 -> translate(cx - 3.5 s, cy - 10 s)
    expect(rest).toHaveAttribute('transform', 'translate(44.75 25.00) scale(1.500)');
  });

  test('restK overrides the rest scale only', () => {
    const c = renderMark({ state: 'muted', k: 1, restK: 2 });
    expect(c.querySelector('.score-rest')).toHaveAttribute('transform', 'translate(39.50 10.00) scale(3.000)');
  });
});

const numbers = (d) => d.match(/-?[0-9.]+/g).map(Number);

describe('AccentGlyph', () => {
  test('accent is ">" in a square viewBox of the given size', () => {
    const { container } = render(<AccentGlyph kind="accent" size={20} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('viewBox', '0 0 20 20');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('score-glyph');
    const pts = numbers(container.querySelector('.score-art').getAttribute('d'));
    [5.8, 4, 14.2, 10, 5.8, 16].forEach((v, i) => expect(pts[i]).toBeCloseTo(v, 6));
  });

  test('first is "^" and defaults apply (kind accent, size 16)', () => {
    const first = render(<AccentGlyph kind="first" size={20} />).container;
    const pts = numbers(first.querySelector('.score-art').getAttribute('d'));
    [1.6, 13, 10, 7, 18.4, 13].forEach((v, i) => expect(pts[i]).toBeCloseTo(v, 6));
    const dflt = render(<AccentGlyph />).container.querySelector('svg');
    expect(dflt).toHaveAttribute('width', '16');
    // default kind is accent: the path ends on the right-pointing tip, so x grows then falls back
    const d = numbers(dflt.querySelector('.score-art').getAttribute('d'));
    expect(d[2]).toBeGreaterThan(d[0]);
    expect(d[4]).toBeCloseTo(d[0], 6);
  });

  test('accepts a custom class', () => {
    const { container } = render(<AccentGlyph className="x" />);
    expect(container.querySelector('svg')).toHaveClass('x');
  });
});
