// src/components/metronome/MultiCircleMode/AddCircleButton.js
import React from 'react';

const AddCircleButton = ({ addCircle, containerSize, isMobile }) => {
  return (
    <div
      onClick={addCircle}
      className="add-circle-button"
      style={{
        width: containerSize,
        height: containerSize,
        margin: isMobile ? "15px 0" : "15px",
      }}
    >
      <div className="plus-button">
        +
      </div>
    </div>
  );
};

export default AddCircleButton;