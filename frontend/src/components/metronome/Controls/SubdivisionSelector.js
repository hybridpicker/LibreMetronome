// src/components/metronome/Controls/SubdivisionSelector.js
import React from 'react';

/**
 * SubdivisionSelector Component:
 * Renders icons for selecting the number of beats per bar.
 * When "hideOptions" is true, nothing is rendered.
 */
const SubdivisionSelector = ({ subdivisions, onSelect, hideOptions = false, style = {} }) => {
  if (hideOptions) return null; // Do not render if hideOptions is true

  return (
    <>
    <div className="subdivision-container" style={style} data-testid="subdivision-selector">
      {Array.from({ length: 9 }, (_, idx) => {
        const subVal = idx + 1;
        const isActive = subVal === subdivisions;
        return (
          <button
            type="button"
            key={subVal}
            onClick={() => onSelect(subVal)}
            className="subdivision-choice"
            aria-label={`${subVal} ${subVal === 1 ? 'beat' : 'beats'} per bar`}
            aria-pressed={isActive}
          >
            <span className="beat-choice-number" aria-hidden="true">{subVal}</span>
          </button>
        );
      })}
    </div>
    {/* Narrow phones (< 400px) use this stepper instead of nine chips; CSS
        shows exactly one of the two. */}
    <div className="subdivision-stepper" role="group" aria-label="Beats per bar">
      <button
        type="button"
        className="stepper-button"
        onClick={() => onSelect(Math.max(1, subdivisions - 1))}
        disabled={subdivisions <= 1}
        aria-label="Fewer beats per bar"
      >
        <span aria-hidden="true">&minus;</span>
      </button>
      <span className="stepper-count" aria-live="polite">{subdivisions}</span>
      <button
        type="button"
        className="stepper-button"
        onClick={() => onSelect(Math.min(9, subdivisions + 1))}
        disabled={subdivisions >= 9}
        aria-label="More beats per bar"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
    </>
  );
};

export default SubdivisionSelector;
