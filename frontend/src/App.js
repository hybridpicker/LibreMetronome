// src/App.js

import React, { useState } from 'react';
import './App.css'; // Global (non-responsive) styles
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

function App() {
  // State variables
  const [tempo, setTempo] = useState(120);
  const [subdivisions, setSubdivisions] = useState(4);
  const [isPaused, setIsPaused] = useState(true);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(1);

  // Toggle play/pause
  const togglePlay = () => {
    setIsPaused((prev) => !prev);
  };

  // Simple SVG icons for Play/Pause
  const PlayIcon = () => (
    <svg viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
  const PauseIcon = () => (
    <svg viewBox="0 0 24 24">
      <path d="M6 19h4V5H6m8 0h4v14h-4" />
    </svg>
  );

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Libre Metronome</h1>

      {/* Main Metronome Component */}
      <AdvancedMetronomeWithCircle
        tempo={tempo}
        setTempo={setTempo}
        subdivisions={subdivisions}
        setSubdivisions={setSubdivisions}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        swing={swing}
        setSwing={setSwing}
        volume={volume}
        setVolume={setVolume}
      />

      {/* Play/Pause Button */}
      <button onClick={togglePlay} className="play-pause-button">
        {isPaused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
}

export default App;
