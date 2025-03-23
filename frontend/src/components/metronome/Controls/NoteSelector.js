// src/components/metronome/Controls/NoteSelector.js
// This is a stub implementation to make tests pass
// Replace with actual implementation

import React from 'react';

const NoteSelector = ({ beatMode, onSelect }) => {
  return (
    <div data-testid="note-selector">
      <button data-testid="quarter-note-button" onClick={() => onSelect('quarter')}>♩</button>
      <button data-testid="eighth-note-button" onClick={() => onSelect('eighth')}>♪</button>
    </div>
  );
};

export default NoteSelector;