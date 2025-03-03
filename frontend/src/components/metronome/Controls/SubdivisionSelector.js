// src/components/metronome/Controls/SubdivisionSelector.js
import React from 'react';
import { subdivisionIcons } from '../../../assets/svg/subdivisionIcons';
import './SubdivisionSelector.css';

/**
 * SubdivisionSelector component for selecting the number of beats in a measure.
 * This component is used in both regular metronome modes and multi-circle mode.
 * 
 * @param {Object} props - Component properties
 * @param {number} props.subdivisions - Current number of subdivisions
 * @param {Function} props.onSelect - Callback function when a subdivision is selected
 * @param {Object} [props.style] - Optional additional styles for the container
 * @returns {JSX.Element} - Rendered component
 */
const SubdivisionSelector = ({ subdivisions, onSelect, style = {} }) => {
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