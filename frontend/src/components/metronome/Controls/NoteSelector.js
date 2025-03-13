// src/components/metronome/Controls/NoteSelector.js
import React from 'react';
import quarterNotesActive from '../../../assets/svg/quarter_eight_notes/quarterNotesActive.svg';
import quarterNotesInactive from '../../../assets/svg/quarter_eight_notes/quarterNotesInactive.svg';
import eightNotesActive from '../../../assets/svg/quarter_eight_notes/eightNotesActive.svg';
import eightNotesInactive from '../../../assets/svg/quarter_eight_notes/eightNotesInactive.svg';
import './NoteSelector.css';

/**
 * Note selector icons with their states
 */
const noteIcons = {
  quarter: {
    active: quarterNotesActive,
    inactive: quarterNotesInactive
  },
  eighth: {
    active: eightNotesActive,
    inactive: eightNotesInactive
  }
};

/**
 * NoteSelector component for switching between quarter and eighth note modes.
 * This component is used in both regular metronome modes and multi-circle mode.
 * 
 * @param {Object} props - Component properties
 * @param {string} props.beatMode - Current beat mode ("quarter" or "eighth")
 * @param {Function} props.onSelect - Callback function when a note type is selected
 * @returns {JSX.Element} - Rendered component
 */
const NoteSelector = ({ beatMode, onSelect }) => {
  const handleNoteSelection = (mode) => {
    // Call the provided onSelect callback
    onSelect(mode);
    
    // Calculate the correct beat multiplier based on selected mode
    // For quarter notes: multiplier = 1 (base timing)
    // For eighth notes: multiplier = 2 (twice as fast)
    const multiplier = mode === "quarter" ? 1 : 2;
    
    // Dispatch a custom event to notify that beat mode has changed
    // This allows other components to react to this change during playback
    const beatModeChangeEvent = new CustomEvent('beat-mode-change', {
      detail: { 
        beatMode: mode,
        beatMultiplier: multiplier
      }
    });
    
    window.dispatchEvent(beatModeChangeEvent);
  };

  return (
    <div className="note-selector-container">
      <button
        onClick={() => handleNoteSelection("quarter")}
        className="note-selector-button"
        aria-label="Quarter Notes"
        title="Quarter Notes"
      >
        <img
          src={beatMode === "quarter" ? noteIcons.quarter.active : noteIcons.quarter.inactive}
          alt="Quarter Notes"
          className={`note-icon ${beatMode === "quarter" ? "active" : ""}`}
        />
      </button>
      <button
        onClick={() => handleNoteSelection("eighth")}
        className="note-selector-button"
        aria-label="Eighth Notes"
        title="Eighth Notes"
      >
        <img
          src={beatMode === "eighth" ? noteIcons.eighth.active : noteIcons.eighth.inactive}
          alt="Eighth Notes"
          className={`note-icon ${beatMode === "eighth" ? "active" : ""}`}
        />
      </button>
    </div>
  );
};

export default NoteSelector;