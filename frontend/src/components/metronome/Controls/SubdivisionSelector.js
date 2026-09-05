// src/components/metronome/Controls/SubdivisionSelector.js
import React from 'react';
import './SubdivisionSelector.css';

/**
 * SubdivisionSelector Component:
 * Renders icons for selecting the number of beats per bar.
 * When "hideOptions" is true, nothing is rendered.
 */
const SubdivisionSelector = ({ subdivisions, onSelect, hideOptions = false, style = {} }) => {
  if (hideOptions) return null; // Do not render if hideOptions is true

  return (
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
  );
};

export default SubdivisionSelector;
