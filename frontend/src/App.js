import React, { useState } from 'react';
import './App.css';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

// Fonts
import './assets/fonts/Lato-Regular.ttf';
import './assets/fonts/Lato-Bold.ttf';
import './assets/fonts/Lato-Thin.ttf';
import './index.css';

// Import info icon from assets; play/pause icons are now handled inside the metronome component
import infoIcon from './assets/svg/info-button.svg';

export default function App() {
  const [tempo, setTempo] = useState(120);
  const [subdivisions, setSubdivisions] = useState(4);
  const [isPaused, setIsPaused] = useState(true);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(1);
  const [tapTempoFunc, setTapTempoFunc] = useState(() => () => {});
  const [showInfo, setShowInfo] = useState(false);

  // Toggle play/pause state
  const togglePlay = () => setIsPaused((prev) => !prev);

  // Toggle display of info overlay
  const toggleInfo = () => setShowInfo((prev) => !prev);

  return (
    <div className="app-container">
      {/* Info button in top left for desktop */}
      <button className="info-button" onClick={toggleInfo}>
        <img src={infoIcon} alt="Info" />
      </button>

      {/* Info overlay */}
      {showInfo && (
        <div className="info-overlay">
          <div className="info-modal">
            <button className="info-close-button" onClick={toggleInfo}>
              X
            </button>
            <h2>Keyboard Shortcuts</h2>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              <li>
                <strong>Space</strong>: Toggle Play/Pause
              </li>
              <li>
                <strong>1 - 9</strong>: Set Subdivisions
              </li>
              <li>
                <strong>T</strong>: Tap Tempo
              </li>
            </ul>
          </div>
        </div>
      )}

      <h1 style={{ fontSize: '2rem', marginBottom: '30px' }}>
        <span style={{ color: '#f8d38d' }}>Libre</span>
        <span style={{ color: 'teal' }}>Metronome</span>
      </h1>

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
        togglePlay={togglePlay} // Pass togglePlay to the metronome component
      />

      {/* Tap button remains below the metronome */}
      <div style={{ marginTop: '20px' }}>
        <button onClick={tapTempoFunc} className="tap-tempo-button">
          Tap
        </button>
      </div>
    </div>
  );
}
