// src/components/metronome/Score/BeatStaff.js
// The Beat view: one bar on a five-line staff. Each beat is a button holding
// a mark of notation (hollow head = normal, ">" accent, "^" first beat, rest =
// muted); the current beat fills blue. The bar wraps onto a second staff when
// the beats would come closer than a finger. The visuals only follow the beat
// number that the audio scheduler publishes; nothing here keeps time.
import React, { useMemo } from 'react';
import { BeatMark, TempoNote } from '../ScoreGlyphs';
import staffLayout from './staffLayout';
import tempoWord from './tempoWord';

const MARK_STATES = ['muted', 'normal', 'accent', 'first'];
const STATE_NAMES = ['Muted', 'Normal', 'Accent', 'First beat'];

const BeatStaff = ({
  width,
  height,
  beats,
  accents,
  current = -1,
  eighth = false,
  tempo,
  onToggle,
  minHit
}) => {
  const touch = minHit || (typeof window !== 'undefined' && window.innerHeight < 760 ? 40 : 44);
  const L = useMemo(
    () => staffLayout({ width, height, beats, minHit: touch }),
    [width, height, beats, touch]
  );
  const { g, k, sysH, staffTop } = L;
  const denominator = eighth ? 8 : 4;
  const headY = staffTop + 2 * g;
  const artY = staffTop + 4 * g + 1.1 * g;

  return (
    <div
      className="score"
      role="group"
      aria-label={`One bar in ${beats} over ${denominator} time`}
      style={{ width, height }}
    >
      <div className="score-tempo" style={{ left: L.left, top: L.tempoTop }}>
        <span className="score-tempo-word">{tempoWord(tempo)}</span>
        <TempoNote className="tempo-note score-tempo-note" />
        <span className="score-tempo-eq">= {tempo}</span>
      </div>

      {L.rows.map((row) => (
        <div key={row.from} className="score-system" style={{ top: row.top, height: sysH, width }}>
          <svg className="score-staff" width={width} height={sysH} aria-hidden="true" focusable="false">
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                className="score-line"
                x1={L.left}
                x2={L.right}
                y1={staffTop + i * g + 0.5}
                y2={staffTop + i * g + 0.5}
              />
            ))}
            <line className="score-bar" x1={L.left + 0.5} x2={L.left + 0.5} y1={staffTop} y2={staffTop + 4 * g + 1} />
            {row.last && (
              <>
                <line className="score-bar" x1={L.right - 7.5} x2={L.right - 7.5} y1={staffTop} y2={staffTop + 4 * g + 1} />
                <rect className="score-final" x={L.right - 3} y={staffTop} width="3" height={4 * g + 1} />
              </>
            )}
            {row.first && (
              <>
                <text className="score-time" x={L.left + 1.6 * g + 2} y={staffTop + g} fontSize={Math.round(2.4 * g)}>{beats}</text>
                <text className="score-time" x={L.left + 1.6 * g + 2} y={staffTop + 3 * g} fontSize={Math.round(2.4 * g)}>{denominator}</text>
              </>
            )}
          </svg>

          {Array.from({ length: row.count }, (_, j) => {
            const i = row.from + j;
            const state = accents[i] == null ? (i === 0 ? 3 : 1) : accents[i];
            const x = L.x0 + j * L.spacing;
            return (
              <button
                type="button"
                key={i}
                className={`staff-beat${i === current ? ' is-current' : ''}${state === 0 ? ' is-muted' : ''}`}
                onClick={() => onToggle(i)}
                aria-label={`Beat ${i + 1}: ${state === 0 ? 'muted' : STATE_NAMES[state]}. Activate to change accent.`}
                aria-pressed={state === 2 || state === 3}
                style={{ left: x, width: L.hit, height: sysH }}
              >
                <svg width={L.hit} height={sysH} aria-hidden="true" focusable="false">
                  <BeatMark
                    cx={L.hit / 2}
                    cy={headY}
                    k={k}
                    state={MARK_STATES[state] || 'normal'}
                    stem={3.5 * g}
                    eighth={eighth}
                    artY={artY}
                  />
                </svg>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default BeatStaff;
