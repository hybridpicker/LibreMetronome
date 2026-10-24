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
  parser = (val) => val,
  disabled = false,
  stepButtons = false
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

  // Phones show -1 / +1 buttons beside the tempo slider (hidden by CSS elsewhere).
  const nudge = (direction) => {
    if (disabled) return;
    const next = Math.max(min, Math.min(max, Number(value) + direction * (step || 1)));
    setValue(Math.round(next * 100) / 100);
  };

  // "120 BPM" is drawn as a large number with a small unit; the text stays whole.
  const formatted = String(formatter(value));
  const unitMatch = /^(\S+)\s+([A-Za-z]+)$/.exec(formatted);

  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
  
  return (
    <div className={`editable-slider ${className || ''} ${disabled ? 'disabled' : ''}`}>
      {isEditing ? (
        <input
          type="text"
          inputMode="decimal"
          aria-label={`Edit ${label} value`}
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
        <button
          type="button"
          className="slider-label"
          onClick={handleClick}
          aria-label={`Edit ${label}`}
          disabled={disabled}
        >
          <span className="slider-label-name">{label}</span>
          {unitMatch ? (
            <span className="slider-label-value">
              <span className="slider-value-number">{unitMatch[1]}</span>{' '}
              <span className="slider-value-unit">{unitMatch[2]}</span>
            </span>
          ) : (
            <span className="slider-label-value">{formatted}</span>
          )}
        </button>
      )}
      
      {stepButtons && (
        <button
          type="button"
          className="slider-step slider-step-down"
          onClick={() => nudge(-1)}
          disabled={disabled || value <= min}
          aria-label={`${label} minus ${step || 1}`}
        >
          <span aria-hidden="true">&minus;</span>
        </button>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className={`slider ${disabled ? 'disabled' : ''}`}
        aria-label={label}
        style={{ '--slider-progress': `${Math.max(0, Math.min(100, progress))}%` }}
        disabled={disabled}
      />
      {stepButtons && (
        <button
          type="button"
          className="slider-step slider-step-up"
          onClick={() => nudge(1)}
          disabled={disabled || value >= max}
          aria-label={`${label} plus ${step || 1}`}
        >
          <span aria-hidden="true">+</span>
        </button>
      )}
    </div>
  );
};

export default EditableSliderInput;
