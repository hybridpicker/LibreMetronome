// src/components/metronome/Controls/EditableSliderInput.js
import React, { useState } from 'react';
import './editable-slider.css';
import './slider-styles.css';

const EditableSliderInput = ({ 
  label, 
  value, 
  setValue, 
  min, 
  max, 
  step, 
  className, 
  formatter = (val) => val, 
  parser = (val) => val,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(formatter(value));
  
  const handleClick = () => {
    if (disabled) return;
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

  const handleSliderChange = (e) => {
    if (disabled) return;
    setValue(parseFloat(e.target.value));
  };
  
  return (
    <div className={`editable-slider ${className || ''} ${disabled ? 'disabled' : ''}`}>
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
          disabled={disabled}
        />
      ) : (
        <div className="slider-label" onClick={handleClick}>
          {label}: {formatter(value)}
        </div>
      )}
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className={`slider ${disabled ? 'disabled' : ''}`}
        disabled={disabled}
      />
    </div>
  );
};

export default EditableSliderInput;