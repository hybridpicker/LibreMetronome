// src/components/metronome/Controls/NoteSelector.js
import React from 'react';

/**
 * NoteSelector Component:
 * Renders selection buttons for Quarter Notes and Eighth Notes.
 * When the prop "hideOptions" is true, nothing is rendered.
 */
// Quarter and eighth note as outline glyphs; colour follows the button state.
const QuarterNote = () => (
  <svg className="note-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <ellipse cx="9" cy="18" rx="3.6" ry="2.7" transform="rotate(-20 9 18)" fill="currentColor" />
    <path d="M12.3 17V4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const EighthNote = () => (
  <svg className="note-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <ellipse cx="9" cy="18" rx="3.6" ry="2.7" transform="rotate(-20 9 18)" fill="currentColor" />
    <path d="M12.3 17V4c0 3.2 5 3.2 5 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

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
        type="button"
        onClick={() => handleNoteSelection("quarter")}
        className="note-selector-button"
        aria-label="Quarter Notes"
        aria-pressed={beatMode === "quarter"}
        title="Quarter Notes"
        data-testid="quarter-note-button"
      >
        <QuarterNote />
      </button>
      <button
        type="button"
        onClick={() => handleNoteSelection("eighth")}
        className="note-selector-button"
        aria-label="Eighth Notes"
        aria-pressed={beatMode === "eighth"}
        title="Eighth Notes"
        data-testid="eighth-note-button"
      >
        <EighthNote />
      </button>
    </div>
  );
};

export default NoteSelector;
