// src/components/metronome/Controls/AccelerateButton.js
import React, { useEffect } from 'react';

/**
 * AccelerateButton component displays a button that allows manual tempo acceleration
 * when Training Mode is active with speedMode set to 1 (Auto Increase Tempo) or 2 (Manual Increase Only).
 */
const AccelerateButton = ({ onClick, speedMode }) => {
  // Debug logging
  useEffect(() => {
    
  }, [speedMode]);

  // Only show when speedMode is 1 (Auto Increase) or 2 (Manual Increase Only)
  // Convert to number to handle string values from select elements
  const speedModeNum = Number(speedMode);
  if (speedModeNum !== 1 && speedModeNum !== 2) {
    
    return null;
  }

  
  return (
    <button
      className="accelerate-button"
      onClick={onClick}
      style={{
        backgroundColor: '#00A0A0',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 16px',
        margin: '10px auto',
        display: 'block',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = '#008080';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = '#00A0A0';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      Accelerate
    </button>
  );
};

export default AccelerateButton;
