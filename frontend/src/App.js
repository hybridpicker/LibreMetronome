// src/App.js

import React, { useState, useEffect } from 'react';
import './App.css';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

function InfoOverlay({ isOpen, onClose, theme }) {
  if (!isOpen) return null;

  return (
    <div className="info-overlay">
      <div className="info-content">
        <p>Space = Start/Stop</p>
        <p>T = Tap Tempo</p>
        <p>1-9 = Subdivisions</p>

        <button
          className="info-close"
          onClick={onClose}
          aria-label="Close overlay"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

function App() {
  const [tempo, setTempo] = useState(120);
  const [subdivisions, setSubdivisions] = useState(4);
  const [isPaused, setIsPaused] = useState(true);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(1);

  const [theme, setTheme] = useState('light');
  const [tapTempoFunc, setTapTempoFunc] = useState(() => () => {});
  const [infoOpen, setInfoOpen] = useState(false);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

  const togglePlay = () => {
    setIsPaused((prev) => !prev);
  };

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

  const ThemeIcon = () => {
    if (theme === 'dark') {
      return (
        <svg viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
          <circle cx="14" cy="14" r="10" stroke="#ffffff" strokeWidth="2" fill="none" />
          <path d="M14 4 A10 10 0 0,0 14 24 L14 4 Z" fill="#ffffff" />
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
          <circle cx="14" cy="14" r="10" stroke="#333333" strokeWidth="2" fill="none" />
          <path d="M14 4 A10 10 0 0,0 14 24 L14 4 Z" fill="#333333" />
        </svg>
      );
    }
  };

  const InfoIcon = () => {
    if (theme === 'dark') {
      return (
        <svg viewBox="0 0 24 24">
          <path
            fill="#ffffff"
            d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10
               10-4.49 10-10S17.51 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          />
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 24 24">
          <path
            fill="#333333"
            d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10
               10-4.49 10-10S17.51 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          />
        </svg>
      );
    }
  };

  return (
    <div className="app-container">
      <h1>Libre Metronome</h1>

      <div className="subdivision-mobile-container">
        <span className="subdivision-mobile-label">Subdivisions</span>
        <div className="subdivision-buttons">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
            <button key={num} onClick={() => setSubdivisions(num)}>
              {num}
            </button>
          ))}
        </div>
      </div>

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
        setTapTempo={setTapTempoFunc}
      />

      {/* Centered container with Play/Pause and Tap Tempo */}
      <div className="center-buttons">
        <button onClick={togglePlay} className="play-pause-button">
          {isPaused ? <PlayIcon /> : <PauseIcon />}
        </button>

        {/* Tap Tempo button (now always visible and centered) */}
        <button className="tap-tempo-button" onClick={tapTempoFunc}>
          Tap Tempo
        </button>
      </div>

      <button onClick={toggleTheme} className="theme-toggle-icon" aria-label="Toggle Theme">
        <ThemeIcon />
      </button>

      <button
        className="info-button"
        onClick={() => setInfoOpen(true)}
        aria-label="Show Info Overlay"
      >
        <InfoIcon />
      </button>

      <InfoOverlay isOpen={infoOpen} onClose={() => setInfoOpen(false)} theme={theme} />
    </div>
  );
}

export default App;
