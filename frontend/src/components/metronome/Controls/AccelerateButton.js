// src/components/metronome/Controls/AccelerateButton.js
import React from 'react';
import './AccelerateButton.css';

/**
 * AccelerateButton component displays a button that allows manual tempo acceleration
 * when Training Mode is active with speedMode set to 1 (Auto Increase Tempo) or 2 (Manual Increase Only).
 * 
 * This component has been updated to ensure consistent positioning and appearance across all metronome modes.
 */
const AccelerateButton = ({ onClick, speedMode }) => {
  // Only show when speedMode is 1 (Auto Increase) or 2 (Manual Increase Only)
  // Convert to number to handle string values from select elements
  const speedModeNum = Number(speedMode);
  if (speedModeNum !== 1 && speedModeNum !== 2) {
    return null;
  }

  return (
    <div className="accelerate-button-container">
      <button
        className="accelerate-button"
        onClick={onClick}
        title="Press Enter to accelerate (in Training Mode)"
        aria-label="Accelerate tempo in Training Mode"
      >
        <span className="icon">⏩</span>
        Accelerate
      </button>
    </div>
  );
};

export default AccelerateButton;