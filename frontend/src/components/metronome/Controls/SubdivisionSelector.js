// src/components/metronome/Controls/SubdivisionSelector.js
import React from 'react';
import { subdivisionIcons } from '../../../assets/svg/subdivisionIcons';
import './SubdivisionSelector.css';

/**
 * SubdivisionSelector Component:
 * Renders icons for selecting the number of beats per bar.
 * When "hideOptions" is true, nothing is rendered.
 */
const SubdivisionSelector = ({ subdivisions, onSelect, hideOptions = false, style = {} }) => {
  if (hideOptions) return null; // Do not render if hideOptions is true

  return (
    <div className="subdivision-container" style={style}>
      {Array.from({ length: 9 }, (_, idx) => {
        const subVal = idx + 1;
        const isActive = subVal === subdivisions;
        const icon = isActive 
          ? subdivisionIcons[`subdivision${subVal}Active`] 
          : subdivisionIcons[`subdivision${subVal}`];
        
        return (
          <img
            key={subVal}
            src={icon}
            alt={`Subdivision ${subVal}`}
            onClick={() => onSelect(subVal)}
            className="subdivision-button"
            style={{
              cursor: "pointer",
              width: "36px",
              height: "36px",
              margin: "0 3px",
              transition: "transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
              transform: isActive ? "scale(1.1)" : "scale(1)",
              filter: isActive ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none"
            }}
          />
        );
      })}
    </div>
  );
};

export default SubdivisionSelector;
