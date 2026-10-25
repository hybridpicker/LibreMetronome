import gridLayout from '../../components/metronome/Score/gridLayout';

describe('gridLayout', () => {
  test('four beats stay in one block', () => {
    const L = gridLayout({ width: 328, height: 240, beats: 4, minHit: 44 });
    expect(L.wrapped).toBe(false);
    expect(L.blocks).toHaveLength(1);
    expect(L.cellW).toBeGreaterThanOrEqual(44);
    expect(L.cellW).toBeGreaterThanOrEqual(L.cellH);
  });

  test('nine beats wrap onto two blocks on a phone and stay as wide as a finger', () => {
    const L = gridLayout({ width: 328, height: 240, beats: 9, minHit: 40 });
    expect(L.wrapped).toBe(true);
    expect(L.blocks.map((b) => b.count)).toEqual([5, 4]);
    expect(L.cellW).toBeGreaterThanOrEqual(40);
    expect(L.cellH).toBeGreaterThanOrEqual(12);
    const total = L.blocks.length * L.blockH + 8;
    expect(total).toBeLessThanOrEqual(240);
  });

  test('nine beats fit in one block on a tablet', () => {
    const L = gridLayout({ width: 720, height: 600, beats: 9, minHit: 44 });
    expect(L.wrapped).toBe(false);
    expect(L.cellW).toBeGreaterThanOrEqual(44);
  });
});
