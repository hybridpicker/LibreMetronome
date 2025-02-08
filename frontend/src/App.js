// src/App.js
import React from 'react';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';
import Footer from './components/Footer';
import './App.css';

function App() {
  // States for tempo, subdivisions, pause status, swing, and volume
  const [tempo, setTempo] = React.useState(120);
  const [subdivisions, setSubdivisions] = React.useState(4);
  const [isPaused, setIsPaused] = React.useState(true);
  const [swing, setSwing] = React.useState(0);
  const [volume, setVolume] = React.useState(0.5);

  // Toggle play/pause state
  const togglePlay = () => setIsPaused((prev) => !prev);

  return (
    <div className="app-container">
      {/* Main metronome component */}
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
        togglePlay={togglePlay}
      />
      
      {/* Footer integration */}
      <Footer />
    </div>
  );
}

export default App;
