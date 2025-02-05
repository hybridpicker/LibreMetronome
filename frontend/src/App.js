// src/App.js
import React, { useState } from 'react';
import './App.css'; // ensure the .metronome-container, .metronome-circle, etc.
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

export default function App() {
  const [tempo, setTempo] = useState(120);
  const [subdivisions, setSubdivisions] = useState(4);
  const [isPaused, setIsPaused] = useState(true);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(1);

  const [tapTempoFunc, setTapTempoFunc] = useState(() => () => {});

  const togglePlay = () => setIsPaused((p) => !p);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '30px' }}>
        <span style={{ color: '#f8d38d' }}>Libre</span><span style={{ color: 'teal' }}>Metronome</span>
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
      />

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={togglePlay}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.4rem',
            marginRight: '15px'
          }}
        >
          {isPaused ? '▶' : '⏸'}
        </button>

        <button
          onClick={tapTempoFunc}
          style={{
            backgroundColor: '#008080',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Tap
        </button>
      </div>
    </div>
  );
}
