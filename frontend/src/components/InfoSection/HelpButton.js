import React from 'react';
import './HelpButton.css';

const HelpButton = ({ onClick }) => {
  return (
    <button 
      className="help-button"
      onClick={onClick}
      aria-label="Help & Guide"
      title="Metronome Guide - Press G"
    >
      ?
    </button>
  );
};

export default HelpButton;
