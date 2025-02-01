// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

function App() {
  // State variables for tempo, subdivisions, pause status, swing, and volume
  const [tempo, setTempo] = useState(120);
  const [subdivisions, setSubdivisions] = useState(4);
  const [isPaused, setIsPaused] = useState(true);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(1);

  // Theme state: 'dark' or 'light'
  const [theme, setTheme] = useState('dark');

  // Toggle theme when icon is clicked
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Update the document class based on the theme
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

  // Minimalist theme toggle icon: a half-filled circle with an outline.
  const ThemeIcon = () => {
    if (theme === 'dark') {
      // In dark mode: both the outline and the half fill are white.
      return (
        <svg viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
          {/* Outer circle (outline) */}
          <circle cx="14" cy="14" r="10" stroke="#ffffff" strokeWidth="2" fill="none" />
          {/* Half-filled path (left half) */}
          <path d="M14 4 A10 10 0 0,0 14 24 L14 4 Z" fill="#ffffff" />
        </svg>
      );
    } else {
      // In light mode: both the outline and the half fill are dark.
      return (
        <svg viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
          {/* Outer circle (outline) */}
          <circle cx="14" cy="14" r="10" stroke="#333333" strokeWidth="2" fill="none" />
          {/* Half-filled path (left half) */}
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
      />

      <button onClick={togglePlay} className="play-pause-button">
        {isPaused ? <PlayIcon /> : <PauseIcon />}
      </button>

      {/* Theme toggle icon (half-filled circle) positioned at top right */}
      <button onClick={toggleTheme} className="theme-toggle-icon" aria-label="Toggle Theme">
        <ThemeIcon />
      </button>
    </div>
  );
}

export default App;
