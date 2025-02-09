// File: src/App.js
import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

function App() {
  // English comment:
  // This state toggles between the analog (canvas) mode and the circle (digital) mode.
  const [analogMode, setAnalogMode] = useState(false);

  // Example states for controlling basic metronome parameters.
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(1);

  // Toggle analog vs circle mode
  const handleToggleAnalogMode = () => {
    setAnalogMode((prev) => !prev);
  };

  return (
    <div className="app-container">
      <Header />

      {/* Button to toggle analog vs. circle mode */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleToggleAnalogMode} 
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            background: '#0ba3b2',
            color: '#fff',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          {analogMode ? 'Switch to Circle Mode' : 'Switch to Analog Mode'}
        </button>
      </div>

      {/* The main metronome component */}
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
        // For tap tempo usage
        setTapTempo={null}
        // Pass the new analogMode state
        analogMode={analogMode}
      />

      <Footer />
    </div>
  );
}

export default App;
