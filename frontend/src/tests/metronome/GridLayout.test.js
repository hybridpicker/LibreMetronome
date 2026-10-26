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

describe('gridLayout exact outputs and boundaries', () => {
  test('four beats on a phone: exact geometry', () => {
    expect(gridLayout({ width: 328, height: 240, beats: 4 })).toEqual({
      cellW: 74, cellH: 63, k: 2.516, markH: 0, blockH: 215, perRow: 4, wrapped: false,
      blocks: [{ from: 0, count: 4, top: 13 }]
    });
  });

  test('nine beats on a phone with a 40 px target wrap into 5 + 4', () => {
    expect(gridLayout({ width: 328, height: 240, beats: 9, minHit: 40 })).toEqual({
      cellW: 40, cellH: 26, k: 1.3, markH: 0, blockH: 104, perRow: 5, wrapped: true,
      blocks: [{ from: 0, count: 5, top: 12 }, { from: 5, count: 4, top: 124 }]
    });
  });

  test('cells are capped at MAX_CELL (120) on a huge plate and a single beat is centred', () => {
    const L = gridLayout({ width: 1000, height: 900, beats: 1 });
    expect(L.cellW).toBe(120);
    expect(L.cellH).toBe(120);
    expect(L.blocks).toEqual([{ from: 0, count: 1, top: 257 }]);
  });

  test('beats below 1 and fractional beats are normalised', () => {
    expect(gridLayout({ width: 328, height: 240, beats: 0 }).blocks).toEqual([
      { from: 0, count: 1, top: expect.any(Number) }
    ]);
    expect(gridLayout({ width: 328, height: 240, beats: -3 }).blocks[0].count).toBe(1);
    const rounded = gridLayout({ width: 328, height: 240, beats: 7.6 });
    expect(rounded.blocks.map((b) => b.count)).toEqual([4, 4]);
  });

  test('wraps exactly when beats * minHit exceeds the inner width (width - 32)', () => {
    // 8 * 44 = 352 -> needs width 384
    expect(gridLayout({ width: 384, height: 600, beats: 8 }).wrapped).toBe(false);
    expect(gridLayout({ width: 383, height: 600, beats: 8 }).wrapped).toBe(true);
    expect(gridLayout({ width: 383, height: 600, beats: 8 }).perRow).toBe(4);
  });

  test('a very short plate floors the cell height at 12 and the top margin at 6', () => {
    const L = gridLayout({ width: 328, height: 20, beats: 1 });
    expect(L.cellH).toBe(12);
    expect(L.blocks[0].top).toBe(6);
  });

  test('cells never get narrower than the touch target when the plate is tall and narrow', () => {
    const L = gridLayout({ width: 720, height: 600, beats: 9, minHit: 44 });
    expect(L.cellW).toBe(76);
    expect(L.cellH).toBe(120);
  });

  test('scale factor k is bounded below by 0.5', () => {
    expect(gridLayout({ width: 100, height: 20, beats: 1, minHit: 10 }).k).toBeGreaterThanOrEqual(0.5);
  });

  test('block tops of a wrapped layout are separated by blockH + 8', () => {
    const L = gridLayout({ width: 328, height: 600, beats: 9 });
    expect(L.blocks[1].top - L.blocks[0].top).toBe(L.blockH + 8);
  });

  test('the default export is the named export', () => {
    expect(jest.requireActual('../../components/metronome/Score/gridLayout').default).toBe(gridLayout);
  });
});
