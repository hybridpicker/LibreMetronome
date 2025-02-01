// Entry point for the main App component
import React, { useState } from 'react';
import './App.css';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

function App() {
  // State variables for tempo, subdivisions, pause status, swing and volume
  const [tempo, setTempo] = useState(120);
  const [subdivisions, setSubdivisions] = useState(4);
  const [isPaused, setIsPaused] = useState(true);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(1);

  // Toggle play/pause state
  const togglePlay = () => {
    setIsPaused(prev => !prev);
  };

  // SVG icons for play and pause buttons
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
    <div className="app-container">
      <h1>Libre Metronome</h1>
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
      <button onClick={togglePlay} className="play-pause-button">
        {isPaused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
}

export default App;
