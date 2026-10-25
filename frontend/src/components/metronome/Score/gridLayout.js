// src/components/metronome/Score/gridLayout.js
// Geometry of the Grid view: one column per beat, three cells per column,
// the accent mark above and the beat number below. When the columns would
// get narrower than a finger the bar wraps onto a second block of columns
// (cells then get flatter). Pure function, tested without a DOM.

export const GRID_MARGIN = 16;
export const MARGIN_Y = 12;
export const MARK_H = 18; // room for ">" or "^" above a column
export const NUMBER_H = 26; // beat number row
export const BLOCK_GAP = 8;
export const MAX_CELL = 120;

export function gridLayout({ width, height, beats, minHit = 44 }) {
  const n = Math.max(1, Math.round(beats));
  const innerW = width - 2 * GRID_MARGIN;
  const perRow = n * minHit <= innerW ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / perRow);

  const availH = height - 2 * MARGIN_Y - (rows - 1) * BLOCK_GAP;
  const cellH = Math.max(12, Math.min(MAX_CELL, Math.floor((availH / rows - MARK_H - NUMBER_H) / 3)));
  const wide = Math.min(MAX_CELL, Math.floor(innerW / perRow));
  // Square cells while there is height for them; otherwise as wide as the
  // cell is high plus half again, never narrower than a finger.
  const cellW = cellH >= wide ? wide : Math.max(minHit, Math.min(wide, Math.round(cellH * 1.5)), Math.min(wide, cellH));

  const blockH = MARK_H + 3 * cellH + NUMBER_H;
  const total = rows * blockH + (rows - 1) * BLOCK_GAP;
  const top0 = Math.max(MARGIN_Y / 2, Math.round((height - total) / 2));
  const k = Math.max(0.5, Math.min(cellW * 0.034, cellH * 0.05));

  const blocks = [];
  for (let r = 0; r < rows; r += 1) {
    const from = r * perRow;
    blocks.push({ from, count: Math.min(perRow, n - from), top: top0 + r * (blockH + BLOCK_GAP) });
  }
  return { cellW, cellH, k, markH: MARK_H, blockH, blocks, wrapped: rows > 1, perRow };
}

export default gridLayout;
