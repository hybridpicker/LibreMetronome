// src/components/metronome/ScoreGlyphs.js
// Music notation drawn as SVG, so the glyphs look the same on every device
// (Lato has no note symbols and a font fallback would differ per platform).
// All glyphs paint with currentColor; size comes from the CSS.
import React from 'react';

/** The quarter note in "♩ = 120": a slanted head and a stem, 14 x 30 units. */
export const TempoNote = ({ className = 'tempo-note' }) => (
  <svg className={className} viewBox="0 0 14 30" aria-hidden="true" focusable="false">
    <ellipse cx="5.5" cy="24" rx="5.5" ry="3.8" transform="rotate(-22 5.5 24)" fill="currentColor" />
    <path d="M10.6 23V2" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const strokeFor = (k) => Math.min(2.5, Math.max(1.2, 1.5 * k)).toFixed(2);

/**
 * One beat as a mark of notation, drawn into an SVG. Shape carries the state:
 *   normal  a hollow notehead with a stem
 *   accent  the same with ">" under the staff
 *   first   the same with "^" under the staff
 *   muted   a quarter rest
 * "Current" is not a shape: the parent adds .is-current and the stylesheet
 * fills the head with blue (see score.css).
 *
 * cx, cy      centre of the notehead (the rest is centred on the same point)
 * k           scale, 1 = a staff space of 12 px
 * stem        stem length in px, from the head up
 * eighth      adds a flag to the stem
 * artY        y of the accent mark (false: draw none); the glyph is 1.2 spaces wide
 * restK       scale of the rest alone (Grid cells are flatter than staff spaces)
 */
export const BeatMark = ({ cx, cy, k = 1, state = 'normal', stem, eighth = false, artY, restK }) => {
  const sw = strokeFor(k);
  const stemLen = stem == null ? 42 * k : stem;
  const hasStem = stemLen > 0;
  if (state === 'muted') {
    // Quarter rest: a zigzag and a curl, 2.5 spaces tall.
    const s = (30 * (restK == null ? k : restK)) / 20;
    return (
      <g className="score-mark is-muted">
        <path
          className="score-rest"
          d="M1 0 L6 6 L2 10 L6.5 15 C3 14 0.5 17 3.5 20"
          transform={`translate(${(cx - 3.5 * s).toFixed(2)} ${(cy - 10 * s).toFixed(2)}) scale(${s.toFixed(3)})`}
          fill="none"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }
  const stemX = cx + 6.4 * k;
  const stemTop = cy - stemLen;
  const half = 7 * k;
  const art = artY == null ? cy + 20 * k : artY;
  return (
    <g className={`score-mark is-${state}`}>
      {hasStem && <line className="score-stem" x1={stemX} y1={cy - k} x2={stemX} y2={stemTop} strokeWidth={sw} />}
      {eighth && hasStem && (
        <path
          className="score-flag"
          d={`M${stemX} ${stemTop} C${stemX + k} ${stemTop + 5 * k} ${stemX + 8 * k} ${stemTop + 7 * k} ${stemX + 6.5 * k} ${stemTop + 15 * k}`}
          fill="none"
          strokeWidth={sw}
        />
      )}
      <ellipse
        className="score-head"
        cx={cx}
        cy={cy}
        rx={7.2 * k}
        ry={5 * k}
        transform={`rotate(-20 ${cx} ${cy})`}
        strokeWidth={sw}
      />
      {state === 'accent' && artY !== false && (
        <path
          className="score-art"
          d={`M${cx - half} ${art - 4 * k} L${cx + half} ${art} L${cx - half} ${art + 4 * k}`}
          fill="none"
          strokeWidth={sw}
        />
      )}
      {state === 'first' && artY !== false && (
        <path
          className="score-art"
          d={`M${cx - half} ${art + 4 * k} L${cx} ${art - 4 * k} L${cx + half} ${art + 4 * k}`}
          fill="none"
          strokeWidth={sw}
        />
      )}
    </g>
  );
};

/**
 * The accent mark on its own: ">" for an accent, "^" for the first beat.
 * Used where the mark sits apart from its note (Grid, guide, circles).
 */
export const AccentGlyph = ({ kind = 'accent', size = 16, className = 'score-glyph' }) => {
  const c = size / 2;
  const h = size * 0.3;
  const w = size * 0.42;
  const d = kind === 'first'
    ? `M${c - w} ${c + h / 2} L${c} ${c - h / 2} L${c + w} ${c + h / 2}`
    : `M${c - w / 2} ${c - h} L${c + w / 2} ${c} L${c - w / 2} ${c + h}`;
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
      <path className="score-art" d={d} fill="none" strokeWidth="1.5" />
    </svg>
  );
};
