// src/components/metronome/Score/staffLayout.js
// Geometry of the Beat view: one bar of music on a five-line staff, or on two
// staves when the beats would come closer than a finger (the bar then wraps
// like a line of text). Pure function of the plate size and the beat count,
// so it can be tested without a DOM.
//
// Units: g is the distance between two staff lines ("space"). It runs from
// 12 px on a phone to 28 px on a desktop; notehead, stem and glyphs scale
// with it. A system is 7.5 g high: 1.5 g of stem above the top line, the four
// spaces of the staff, 2 g below for the accent mark.

export const TEMPO_BAND = 22; // room for "Allegro ♩ = 120" above the first staff
export const SYSTEM_GAP = 8; // between two staves of the same bar
export const MARGIN_Y = 12;
export const MAX_G = 28;
export const MIN_G = 12;
export const MIN_G_WRAPPED = 10; // two staves on a short phone may shrink a little

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function staffLayout({ width, height, beats, minHit = 44 }) {
  const n = Math.max(1, Math.round(beats));
  const margin = Math.round(clamp(width * 0.03, 16, 28));
  // The wanted spacing grows with the plate: 12 px at 328 px wide, 28 px from ~720 px.
  const wanted = clamp(Math.round(MIN_G + (width - 328) * 0.041), MIN_G, MAX_G);

  const attempt = (rows) => {
    const perRow = Math.ceil(n / rows);
    const availH = height - 2 * MARGIN_Y - TEMPO_BAND - (rows - 1) * SYSTEM_GAP;
    const fitH = Math.floor(availH / (7.5 * rows));
    let g = clamp(Math.min(wanted, fitH), rows > 1 ? MIN_G_WRAPPED : MIN_G, MAX_G);
    let x0 = 0;
    let right = 0;
    let span = 0;
    // x0 and the span depend on g and g on the span: two passes settle it.
    for (let pass = 0; pass < 3; pass += 1) {
      x0 = margin + Math.round(3.2 * g);
      right = width - margin;
      span = right - Math.round(0.5 * g) - 9 - x0;
      g = clamp(Math.min(g, Math.floor(span / perRow / 2.6)), rows > 1 ? MIN_G_WRAPPED : 6, MAX_G);
    }
    x0 = margin + Math.round(3.2 * g);
    span = right - Math.round(0.5 * g) - 9 - x0;
    return { rows, perRow, g, x0, right, span, spacing: span / perRow };
  };

  let plan = attempt(1);
  if (plan.spacing < minHit && n > 1) plan = attempt(2);

  const { g, x0, right, spacing, perRow } = plan;
  const sysH = Math.round(7.5 * g);
  const blockH = TEMPO_BAND + plan.rows * sysH + (plan.rows - 1) * SYSTEM_GAP;
  const top0 = Math.max(MARGIN_Y / 2, Math.round((height - blockH) / 2));

  const rows = [];
  for (let r = 0; r < plan.rows; r += 1) {
    const from = r * perRow;
    const count = Math.min(perRow, n - from);
    rows.push({
      top: top0 + TEMPO_BAND + r * (sysH + SYSTEM_GAP),
      from,
      count,
      first: r === 0,
      last: r === plan.rows - 1
    });
  }

  return {
    g,
    k: g / 12,
    margin,
    left: margin,
    right,
    x0,
    spacing,
    hit: Math.floor(spacing),
    sysH,
    staffTop: Math.round(1.5 * g),
    tempoTop: top0,
    rows,
    wrapped: plan.rows > 1
  };
}

export default staffLayout;
