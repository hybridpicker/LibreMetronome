// File: src/App.js
import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import InfoOverlay from './components/InfoOverlay';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';
import GridModeMetronome from './components/GridModeMetronome';
import TrainingOverlay from './components/training/TrainingOverlay';
import useKeyboardShortcuts from './hooks/KeyboardShortcuts';

const TEMPO_MIN = 15;
const TEMPO_MAX = 240;

function App() {
  // Mode selection: "analog", "circle" or "grid"
  const [mode, setMode] = useState("circle");

  // Metronom parameters
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(0.5);

  const togglePlay = () => setIsPaused(prev => !prev);

  // Accent state (first beat always true)
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );
  // Reset accents when subdivisions change
  React.useEffect(() => {
    setAccents(Array.from({ length: subdivisions }, (_, i) => i === 0));
  }, [subdivisions]);
  const toggleAccent = (index) => {
    if (index === 0) return;
    setAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = !newAccents[index];
      return newAccents;
    });
  };

  // Trainingsmodus-Parameter (Standardwerte)
  const [trainingSettings, setTrainingSettings] = useState({
    macroMode: 0,              // 0=Off, 1=Fixed Silence, 2=Random Silence
    speedMode: 0,              // 0=Off, 1=Auto Increase, 2=Manual Increase
    measuresUntilMute: 2,
    muteDurationMeasures: 1,
    muteProbability: 0.3,
    measuresUntilSpeedUp: 2,
    tempoIncreasePercent: 5
  });

  // Globale Tastaturkürzel
  useKeyboardShortcuts({
    onTogglePlayPause: togglePlay,
    onTapTempo: () => console.log("Tap Tempo triggered"),
    onSetSubdivisions: setSubdivisions,
    onIncreaseTempo: () => setTempo(prev => Math.min(prev + 5, TEMPO_MAX)),
    onDecreaseTempo: () => setTempo(prev => Math.max(prev - 5, TEMPO_MIN)),
    onSwitchToAnalog: () => setMode("analog"),
    onSwitchToCircle: () => setMode("circle"),
    onSwitchToGrid: () => setMode("grid"),
    onToggleInfoOverlay: () => {} // Implementiere ggf. Deine Info-Overlay Logik
  });

  return (
    <div className="app-container">
      <InfoOverlay />
      <Header />
      {/* Trainingsbutton (neben dem Info-Button) */}
      <TrainingOverlay trainingSettings={trainingSettings} setTrainingSettings={setTrainingSettings} />
      {/* Mode selection buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={() => setMode("analog")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: mode === "analog" ? "#0ba3b2" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Analog Mode
        </button>
        <button
          onClick={() => setMode("circle")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: mode === "circle" ? "#0ba3b2" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Circle Mode
        </button>
        <button
          onClick={() => setMode("grid")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: mode === "grid" ? "#0ba3b2" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Grid Mode
        </button>
      </div>

      {/* Render metronome based on selected mode, passing training parameters */}
      {mode === "analog" && (
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
          analogMode={true}
          accents={accents}
          toggleAccent={toggleAccent}
          {...trainingSettings}
        />
      )}
      {mode === "circle" && (
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
          analogMode={false}
          accents={accents}
          toggleAccent={toggleAccent}
          {...trainingSettings}
        />
      )}
      {mode === "grid" && (
        <GridModeMetronome
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
          analogMode={false}
          gridMode={true}
          accents={accents}
          updateAccents={setAccents}
          {...trainingSettings}
        />
      )}
      <Footer />
    </div>
  );
}

export default App;
