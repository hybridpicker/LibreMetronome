// App.js
import React, { useState } from 'react';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';

function App() {
  const [tempo, setTempo] = useState(120);
  const [subdivisions, setSubdivisions] = useState(4);
  const [volume, setVolume] = useState(1.0);
  const [swing, setSwing] = useState(0.0);
  const [isPaused, setIsPaused] = useState(true);

  // Example: accent the second beat as well, if you want
  const accentedBeats = [0, 2];

  return (
    <div style={{ textAlign: 'center' }}>
      {/* We removed <h1> to hide the heading */}

      <div style={{ margin: '1rem' }}>
        <button onClick={() => setIsPaused(false)}>Start</button>
        <button onClick={() => setIsPaused(true)} style={{ marginLeft: '10px' }}>
          Pause
        </button>
      </div>

      <div style={{ margin: '1rem' }}>
        <label>Tempo: {tempo} BPM</label>
        <br />
        <input
          type="range"
          min={30}
          max={240}
          value={tempo}
          onChange={(e) => setTempo(Number(e.target.value))}
        />
      </div>

      <div style={{ margin: '1rem' }}>
        <label>Subdivisions: {subdivisions}</label>
        <br />
        <input
          type="range"
          min={1}
          max={8}
          value={subdivisions}
          onChange={(e) => setSubdivisions(Number(e.target.value))}
        />
      </div>

      <div style={{ margin: '1rem' }}>
        <label>Volume: {volume.toFixed(2)}</label>
        <br />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      <div style={{ margin: '1rem' }}>
        <label>Swing: {swing.toFixed(2)}</label>
        <br />
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={swing}
          onChange={(e) => setSwing(Number(e.target.value))}
        />
      </div>

      <AdvancedMetronomeWithCircle
        tempo={tempo}
        subdivisions={subdivisions}
        volume={volume}
        swing={swing}
        accentedBeats={accentedBeats}
        isPaused={isPaused}
        circleRadius={150}
      />
    </div>
  );
}

export default App;
