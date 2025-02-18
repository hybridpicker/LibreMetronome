// File: src/App.js
import React, { useState, useRef } from 'react';
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
  console.log("[App] Rendering App component");
  // Mode selection: "analog", "circle", or "grid"
  const [mode, setMode] = useState("circle");

  // Metronome parameters
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(0.5);

  // Accent state: first beat always true.
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );
  React.useEffect(() => {
    setAccents(Array.from({ length: subdivisions }, (_, i) => i === 0));
  }, [subdivisions]);
  const toggleAccent = (index) => {
    if (index === 0) return;
    setAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = !newAccents[index];
      console.log(`[App] Toggle accent at index ${index}:`, newAccents[index]);
      return newAccents;
    });
  };

  // Training mode parameters (default values)
  const [trainingSettings, setTrainingSettings] = useState({
    macroMode: 0,              // 0=Off, 1=Fixed Silence, 2=Random Silence
    speedMode: 0,              // 0=Off, 1=Auto Increase, 2=Manual Increase
    measuresUntilMute: 2,
    muteDurationMeasures: 1,
    muteProbability: 0.3,
    measuresUntilSpeedUp: 2,
    tempoIncreasePercent: 5
  });
  console.log("[App] Initial trainingSettings:", trainingSettings);

  // Ref to hold the current play/pause handler from the active metronome component.
  const togglePlayRef = useRef(null);
  const registerTogglePlay = (fn) => {
    console.log("[App] Registered play/pause handler");
    togglePlayRef.current = fn;
  };

  // Global keyboard shortcuts – the onTogglePlayPause callback calls the registered handler.
  useKeyboardShortcuts({
    onTogglePlayPause: () => {
      console.log("[App] onTogglePlayPause triggered via keyboard");
      if (togglePlayRef.current) {
        togglePlayRef.current();
      }
    },
    onTapTempo: () => console.log("[App] onTapTempo triggered"),
    onSetSubdivisions: (num) => {
      console.log("[App] onSetSubdivisions triggered with:", num);
      setSubdivisions(num);
    },
    onIncreaseTempo: () => {
      console.log("[App] onIncreaseTempo triggered");
      setTempo(prev => Math.min(prev + 5, TEMPO_MAX));
    },
    onDecreaseTempo: () => {
      console.log("[App] onDecreaseTempo triggered");
      setTempo(prev => Math.max(prev - 5, TEMPO_MIN));
    },
    onSwitchToAnalog: () => {
      console.log("[App] Switching mode to Analog");
      setMode("analog");
    },
    onSwitchToCircle: () => {
      console.log("[App] Switching mode to Circle");
      setMode("circle");
    },
    onSwitchToGrid: () => {
      console.log("[App] Switching mode to Grid");
      setMode("grid");
    },
    onToggleInfoOverlay: () => {
      console.log("[App] onToggleInfoOverlay triggered");
      setIsInfoActive((prev) => !prev);
    },
    onManualTempoIncrease: () => {
      console.log("[App] onManualTempoIncrease triggered");
      // Handled within the metronome hook.
    },
  });

  const [isInfoActive, setIsInfoActive] = useState(false);

  return (
    <div className="app-container">
      <InfoOverlay setActive={setIsInfoActive} />
      <Header />
      {/* Training button (displayed next to the info button) */}
      <TrainingOverlay trainingSettings={trainingSettings} setTrainingSettings={setTrainingSettings} />
      {/* Mode selection buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={() => {
            console.log("[App] Mode switched to Analog");
            setMode("analog");
          }}
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
          onClick={() => {
            console.log("[App] Mode switched to Circle");
            setMode("circle");
          }}
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
          onClick={() => {
            console.log("[App] Mode switched to Grid");
            setMode("grid");
          }}
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

      {/* Render metronome based on selected mode; training settings are spread as props */}
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
          togglePlay={() => {
            if (togglePlayRef.current) togglePlayRef.current();
          }}
          analogMode={true}
          accents={accents}
          toggleAccent={toggleAccent}
          {...trainingSettings}
          registerTogglePlay={registerTogglePlay}
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
          togglePlay={() => {
            if (togglePlayRef.current) togglePlayRef.current();
          }}
          analogMode={false}
          accents={accents}
          toggleAccent={toggleAccent}
          {...trainingSettings}
          registerTogglePlay={registerTogglePlay}
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
          togglePlay={() => {
            if (togglePlayRef.current) togglePlayRef.current();
          }}
          analogMode={false}
          gridMode={true}
          accents={accents}
          updateAccents={setAccents}
          {...trainingSettings}
          registerTogglePlay={registerTogglePlay}
        />
      )}
      <Footer />
    </div>
  );
}

export default App;
