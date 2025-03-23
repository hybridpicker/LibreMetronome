// src/components/metronome/Controls/EditableSliderInput.js

import React, { useState } from 'react';

const EditableSliderInput = ({ 
  label, 
  value, 
  setValue, 
  min, 
  max, 
  step, 
  className, 
  formatter = (val) => val, 
  parser = (val) => val 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(formatter(value));
  
  const handleClick = () => {
    setIsEditing(true);
    setInputValue(formatter(value));
  };
  
  const handleBlur = () => {
    try {
      const parsed = parser(inputValue);
      if (!isNaN(parsed)) {
        // Clamp the value to min and max
        const clampedValue = Math.max(min, Math.min(max, parsed));
        setValue(clampedValue);
      }
      setIsEditing(false);
    } catch (e) {
      setIsEditing(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };
  
  return (
    <div className={`editable-slider ${className || ''}`}>
      {isEditing ? (
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="editable-input"
          autoFocus
          data-testid="editable-input"
        />
      ) : (
        <div className="slider-label" onClick={handleClick}>
          {label}: {formatter(value)}
        </div>
      )}
    </div>
  );
};

export default EditableSliderInput;