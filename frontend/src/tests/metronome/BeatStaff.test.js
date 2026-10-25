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
