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
