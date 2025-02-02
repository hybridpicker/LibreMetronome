// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

function App() {
  // State variables for metronome settings
  const [tempo, setTempo] = useState(120);
  const [subdivisions, setSubdivisions] = useState(4);
  const [isPaused, setIsPaused] = useState(true);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(1);

  // Default theme is light mode now
  const [theme, setTheme] = useState('light');

  // tapTempoFunc will be set by AdvancedMetronomeWithCircle via callback prop
  const [tapTempoFunc, setTapTempoFunc] = useState(() => () => {});

  // Toggle theme when icon is clicked
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Update document class based on theme
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

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

  // Theme toggle icon: a half-filled circle with outline.
  const ThemeIcon = () => {
    if (theme === 'dark') {
      // In dark mode: outline and half fill are white.
      return (
        <svg viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
          <circle cx="14" cy="14" r="10" stroke="#ffffff" strokeWidth="2" fill="none" />
          <path d="M14 4 A10 10 0 0,0 14 24 L14 4 Z" fill="#ffffff" />
        </svg>
      );
    } else {
      // In light mode: outline and half fill are dark (hier bleibt als Akzentfarbe "dunkel", aber Sie können auch Blau als Akzent definieren, falls gewünscht).
      return (
        <svg viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
          <circle cx="14" cy="14" r="10" stroke="#333333" strokeWidth="2" fill="none" />
          <path d="M14 4 A10 10 0 0,0 14 24 L14 4 Z" fill="#333333" />
        </svg>
      );
    }
  };

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
        setTapTempo={setTapTempoFunc}  // Pass callback to receive tapTempo function
      />

      <button onClick={togglePlay} className="play-pause-button">
        {isPaused ? <PlayIcon /> : <PauseIcon />}
      </button>

      <button onClick={toggleTheme} className="theme-toggle-icon" aria-label="Toggle Theme">
        <ThemeIcon />
      </button>

      {/* Tap Tempo button appears on small displays */}
      <button className="tap-tempo-button" onClick={tapTempoFunc}>
        Tap Tempo
      </button>
    </div>
  );
}

export default App;
