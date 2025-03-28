// src/components/metronome/Controls/NoteSelector.js
import React from 'react';
import quarterNotesActive from '../../../assets/svg/quarter_eight_notes/quarterNotesActive.svg';
import quarterNotesInactive from '../../../assets/svg/quarter_eight_notes/quarterNotesInactive.svg';
import eightNotesActive from '../../../assets/svg/quarter_eight_notes/eightNotesActive.svg';
import eightNotesInactive from '../../../assets/svg/quarter_eight_notes/eightNotesInactive.svg';
import './NoteSelector.css';

/**
 * NoteSelector Component:
 * Renders selection buttons for Quarter Notes and Eighth Notes.
 * When the prop "hideOptions" is true, nothing is rendered.
 */
const NoteSelector = ({ beatMode, onSelect, hideOptions = false }) => {
  if (hideOptions) return null; // Do not render options if hideOptions is true

  const handleNoteSelection = (mode) => {
    onSelect(mode);
    // Determine beat multiplier: 1 for quarter, 2 for eighth
    const multiplier = mode === "quarter" ? 1 : 2;
    // Dispatch a custom event so that other components can react to the change
    const beatModeChangeEvent = new CustomEvent('beat-mode-change', {
      detail: { beatMode: mode, beatMultiplier: multiplier }
    });
    window.dispatchEvent(beatModeChangeEvent);
  };

  return (
    <div className="note-selector-container" data-testid="note-selector">
      <button
        onClick={() => handleNoteSelection("quarter")}
        className="note-selector-button"
        aria-label="Quarter Notes"
        title="Quarter Notes"
        data-testid="quarter-note-button"
      >
        <img
          src={beatMode === "quarter" ? quarterNotesActive : quarterNotesInactive}
          alt="Quarter Notes"
          className={`note-icon ${beatMode === "quarter" ? "active" : ""}`}
        />
      </button>
      <button
        onClick={() => handleNoteSelection("eighth")}
        className="note-selector-button"
        aria-label="Eighth Notes"
        title="Eighth Notes"
        data-testid="eighth-note-button"
      >
        <img
          src={beatMode === "eighth" ? eightNotesActive : eightNotesInactive}
          alt="Eighth Notes"
          className={`note-icon ${beatMode === "eighth" ? "active" : ""}`}
        />
      </button>
    </div>
  );
};

export default NoteSelector;