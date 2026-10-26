import { fireEvent, render, screen } from '@testing-library/react';
import BeatStaff from '../../components/metronome/Score/BeatStaff';
import staffLayout from '../../components/metronome/Score/staffLayout';
import tempoWord from '../../components/metronome/Score/tempoWord';

describe('tempoWord', () => {
  test.each([
    [15, 'Grave'], [39, 'Grave'], [40, 'Largo'], [60, 'Larghetto'], [66, 'Adagio'], [76, 'Andante'],
    [108, 'Moderato'], [119, 'Moderato'], [120, 'Allegro'], [155, 'Allegro'], [156, 'Vivace'],
    [176, 'Presto'], [199, 'Presto'], [200, 'Prestissimo'], [240, 'Prestissimo']
  ])('%i bpm is %s', (bpm, word) => {
    expect(tempoWord(bpm)).toBe(word);
  });
});

describe('tempoWord edge values', () => {
  test('accepts numeric strings and treats non-numeric input as Prestissimo', () => {
    expect(tempoWord('72')).toBe('Adagio');
    expect(tempoWord('abc')).toBe('Prestissimo'); // characterization: current behaviour, see report
    expect(tempoWord(undefined)).toBe('Prestissimo'); // characterization: current behaviour, see report
    expect(tempoWord(null)).toBe('Grave'); // characterization: Number(null) === 0
  });

  test('every upper band bound is exclusive', () => {
    const bounds = [[40, 'Grave', 'Largo'], [60, 'Largo', 'Larghetto'], [66, 'Larghetto', 'Adagio'],
      [76, 'Adagio', 'Andante'], [108, 'Andante', 'Moderato'], [120, 'Moderato', 'Allegro'],
      [156, 'Allegro', 'Vivace'], [176, 'Vivace', 'Presto'], [200, 'Presto', 'Prestissimo']];
    bounds.forEach(([edge, below, at]) => {
      expect(tempoWord(edge - 1)).toBe(below);
      expect(tempoWord(edge)).toBe(at);
    });
  });
});

describe('staffLayout', () => {
  test('staff spacing grows from 12 px on a phone to 28 px on a desktop', () => {
    expect(staffLayout({ width: 328, height: 300, beats: 4 }).g).toBe(12);
    expect(staffLayout({ width: 700, height: 600, beats: 4 }).g).toBeGreaterThanOrEqual(24);
    expect(staffLayout({ width: 1100, height: 900, beats: 4 }).g).toBe(28);
  });

  test('four beats stay on one staff and every beat is at least a finger wide', () => {
    for (const w of [328, 380, 720, 1100]) {
      const L = staffLayout({ width: w, height: 300, beats: 4, minHit: 44 });
      expect(L.rows).toHaveLength(1);
      expect(L.hit).toBeGreaterThanOrEqual(44);
    }
  });

  test('nine beats wrap onto two staves on a phone, but not on a tablet', () => {
    const phone = staffLayout({ width: 328, height: 240, beats: 9, minHit: 44 });
    expect(phone.wrapped).toBe(true);
    expect(phone.rows.map((r) => r.count)).toEqual([5, 4]);
    expect(phone.rows[0].last).toBe(false);
    expect(phone.rows[1].last).toBe(true);
    expect(phone.hit).toBeGreaterThanOrEqual(44);
    const tablet = staffLayout({ width: 720, height: 400, beats: 9, minHit: 44 });
    expect(tablet.wrapped).toBe(false);
    expect(tablet.hit).toBeGreaterThanOrEqual(44);
  });

  test('the block fits the plate', () => {
    for (const [w, h, n] of [[328, 220, 9], [328, 240, 4], [380, 260, 7], [700, 640, 9]]) {
      const L = staffLayout({ width: w, height: h, beats: n, minHit: 44 });
      const last = L.rows[L.rows.length - 1];
      expect(last.top + L.sysH).toBeLessThanOrEqual(h);
      expect(L.tempoTop).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('BeatStaff', () => {
  const base = { width: 360, height: 280, beats: 4, accents: [3, 1, 2, 0], current: -1, tempo: 120 };

  test('one button per beat with state in its name', () => {
    render(<BeatStaff {...base} onToggle={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Beat 1: First beat. Activate to change accent.' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Beat 2: Normal. Activate to change accent.' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Beat 3: Accent. Activate to change accent.' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Beat 4: muted. Activate to change accent.' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('state is carried by shape: rest, accent mark, first-beat mark', () => {
    const { container } = render(<BeatStaff {...base} onToggle={() => {}} />);
    expect(container.querySelectorAll('.score-rest')).toHaveLength(1); // muted
    expect(container.querySelectorAll('.score-mark.is-first .score-art')).toHaveLength(1); // ^
    expect(container.querySelectorAll('.score-mark.is-accent .score-art')).toHaveLength(1); // >
    expect(container.querySelectorAll('.score-head')).toHaveLength(3); // the rest has no head
  });

  test('the current beat is marked, and only while one is playing', () => {
    const { container, rerender } = render(<BeatStaff {...base} current={2} onToggle={() => {}} />);
    expect(container.querySelectorAll('.staff-beat.is-current')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Beat 3/ })).toHaveClass('is-current');
    rerender(<BeatStaff {...base} current={-1} onToggle={() => {}} />);
    expect(container.querySelectorAll('.is-current')).toHaveLength(0);
  });

  test('a click reports the beat index', () => {
    const onToggle = jest.fn();
    render(<BeatStaff {...base} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /Beat 2/ }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  test('time signature and tempo mark: quarter notes, then eighth notes with flags', () => {
    const { container, rerender } = render(<BeatStaff {...base} onToggle={() => {}} />);
    expect([...container.querySelectorAll('.score-time')].map((n) => n.textContent)).toEqual(['4', '4']);
    expect(container.querySelector('.score-tempo').textContent).toContain('Allegro');
    expect(container.querySelector('.score-tempo').textContent).toContain('= 120');
    expect(container.querySelectorAll('.score-flag')).toHaveLength(0);
    rerender(<BeatStaff {...base} eighth onToggle={() => {}} />);
    expect([...container.querySelectorAll('.score-time')].map((n) => n.textContent)).toEqual(['4', '8']);
    expect(container.querySelectorAll('.score-flag')).toHaveLength(3);
  });

  test('nine beats on a narrow plate use two staves but keep nine buttons in order', () => {
    const accents = Array.from({ length: 9 }, (_, i) => (i === 0 ? 3 : 1));
    const { container } = render(
      <BeatStaff {...base} width={328} height={240} beats={9} accents={accents} onToggle={() => {}} />
    );
    expect(container.querySelectorAll('.score-system')).toHaveLength(2);
    const names = screen.getAllByRole('button').map((b) => b.getAttribute("aria-label").slice(0, 6));
    expect(names).toEqual(Array.from({ length: 9 }, (_, i) => `Beat ${i + 1}`));
    expect(container.querySelectorAll('.score-final')).toHaveLength(1);
  });
});

describe('staffLayout exact outputs and boundaries', () => {
  test('four beats at 328 x 300: exact geometry', () => {
    expect(staffLayout({ width: 328, height: 300, beats: 4 })).toEqual({
      g: 12, k: 1, margin: 16, left: 16, right: 312, x0: 54, spacing: 60.75, hit: 60,
      sysH: 90, staffTop: 18, tempoTop: 94, wrapped: false,
      rows: [{ top: 116, from: 0, count: 4, first: true, last: true }]
    });
  });

  test('nine beats at 328 x 240 wrap: exact rows', () => {
    const L = staffLayout({ width: 328, height: 240, beats: 9 });
    expect(L.wrapped).toBe(true);
    expect(L.rows).toEqual([
      { top: 37, from: 0, count: 5, first: true, last: false },
      { top: 135, from: 5, count: 4, first: false, last: true }
    ]);
    expect(L.hit).toBe(48);
    expect(L.tempoTop).toBe(15);
  });

  test('a single beat on a big desktop plate uses the maximum spacing and margin', () => {
    const L = staffLayout({ width: 1100, height: 900, beats: 1 });
    expect(L.g).toBe(28);
    expect(L.margin).toBe(28);
    expect(L.k).toBeCloseTo(28 / 12, 10);
    expect(L.rows).toHaveLength(1);
  });

  test('beat counts below 1 are normalised to one beat', () => {
    expect(staffLayout({ width: 360, height: 280, beats: 0 }).rows[0].count).toBe(1);
    expect(staffLayout({ width: 360, height: 280, beats: -2 }).rows[0].count).toBe(1);
  });

  test('a single beat never wraps, however narrow the plate', () => {
    expect(staffLayout({ width: 120, height: 280, beats: 1, minHit: 44 }).wrapped).toBe(false);
  });

  test('margin is 3% of the width clamped to 16..28', () => {
    expect(staffLayout({ width: 200, height: 300, beats: 2 }).margin).toBe(16);
    expect(staffLayout({ width: 600, height: 300, beats: 2 }).margin).toBe(18);
    expect(staffLayout({ width: 2000, height: 300, beats: 2 }).margin).toBe(28);
  });

  test('wrapping is monotonic in the plate width: once nine beats fit on one staff they keep fitting', () => {
    const wrappedByWidth = [];
    for (let w = 300; w <= 1200; w += 4) {
      wrappedByWidth.push(staffLayout({ width: w, height: 400, beats: 9, minHit: 44 }).wrapped);
    }
    const firstFit = wrappedByWidth.indexOf(false);
    expect(firstFit).toBeGreaterThan(0); // narrow plates wrap, wide ones do not
    expect(wrappedByWidth.slice(firstFit).every((w) => w === false)).toBe(true);
  });

  test('a smaller touch target keeps a bar on one staff where a larger one wraps', () => {
    expect(staffLayout({ width: 328, height: 300, beats: 6, minHit: 30 }).wrapped).toBe(false);
    expect(staffLayout({ width: 328, height: 300, beats: 6, minHit: 60 }).wrapped).toBe(true);
  });

  test('the tempo mark never leaves the plate on a very short plate', () => {
    expect(staffLayout({ width: 328, height: 100, beats: 4 }).tempoTop).toBeGreaterThanOrEqual(6);
  });

  test('default export equals the named export', () => {
    expect(jest.requireActual('../../components/metronome/Score/staffLayout').default).toBe(staffLayout);
  });
});

describe('BeatStaff defaults and fallbacks', () => {
  const noop = () => {};

  test('describes the time signature on the group', () => {
    render(<BeatStaff width={360} height={280} beats={3} accents={[]} tempo={90} onToggle={noop} />);
    expect(screen.getByRole('group', { name: 'One bar in 3 over 4 time' })).toBeInTheDocument();
    render(<BeatStaff width={360} height={280} beats={6} accents={[]} tempo={90} eighth onToggle={noop} />);
    expect(screen.getByRole('group', { name: 'One bar in 6 over 8 time' })).toBeInTheDocument();
  });

  test('missing accent entries default to first beat for beat 1 and normal elsewhere', () => {
    render(<BeatStaff width={360} height={280} beats={3} accents={[]} tempo={90} onToggle={noop} />);
    expect(screen.getByRole('button', { name: /^Beat 1: First beat/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Beat 2: Normal/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^Beat 3: Normal/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('an unknown accent state is drawn as a normal note', () => {
    const { container } = render(
      <BeatStaff width={360} height={280} beats={1} accents={[9]} tempo={90} onToggle={noop} />
    );
    expect(container.querySelectorAll('.score-mark.is-normal')).toHaveLength(1);
    // characterization: label for state 9 is "undefined", see report
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Beat 1: undefined. Activate to change accent.');
  });

  test('muted beats get is-muted on the button', () => {
    render(<BeatStaff width={360} height={280} beats={2} accents={[0, 1]} tempo={90} onToggle={noop} />);
    expect(screen.getByRole('button', { name: /^Beat 1: muted/ })).toHaveClass('is-muted');
    expect(screen.getByRole('button', { name: /^Beat 2/ })).not.toHaveClass('is-muted');
  });

  test('the tempo word follows the tempo prop', () => {
    const { container } = render(
      <BeatStaff width={360} height={280} beats={4} accents={[]} tempo={60} onToggle={noop} />
    );
    expect(container.querySelector('.score-tempo-word').textContent).toBe('Larghetto');
    expect(container.querySelector('.score-tempo-eq').textContent).toBe('= 60');
  });

  describe('touch target derived from the window height', () => {
    const original = window.innerHeight;
    afterEach(() => { window.innerHeight = original; });

    test.each([
      [700, 1], // 40 px target: nine beats fit on one staff at 454 px
      [900, 2] // 44 px target: they wrap
    ])('window height %i px picks the touch target and gives %i staff system(s)', (innerHeight, systems) => {
      window.innerHeight = innerHeight;
      const { container } = render(
        <BeatStaff width={454} height={400} beats={9} accents={[]} tempo={90} onToggle={noop} />
      );
      expect(container.querySelectorAll('.score-system')).toHaveLength(systems);
    });

    test('an explicit minHit wins over the window height', () => {
      window.innerHeight = 700; // would pick 40 px and one system at this width
      const { container } = render(
        <BeatStaff width={454} height={400} beats={9} accents={[]} tempo={90} minHit={44} onToggle={noop} />
      );
      expect(container.querySelectorAll('.score-system')).toHaveLength(2);
    });
  });
});
