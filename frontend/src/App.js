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
  // Mode selection: "analog", "circle", or "grid"
  const [mode, setMode] = useState("circle");

  // Metronome parameters
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(0.5);

  // Accent state: first beat always true.
  // Accent states for Grid and Circle modes
  const [gridAccents, setGridAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0 ? 3 : 1) // 3 for first beat, 1 for others
  );
  const [circleAccents, setCircleAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0 ? 3 : 1) // 3 for first beat, 1 for others
  );

  React.useEffect(() => {
    setGridAccents(Array.from({ length: subdivisions }, (_, i) => i === 0 ? 3 : 1));
    setCircleAccents(Array.from({ length: subdivisions }, (_, i) => i === 0 ? 3 : 1));
  }, [subdivisions]);

  const toggleGridAccent = (index) => {
    if (index === 0) return;
    setGridAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = (newAccents[index] + 1) % 3;
      return newAccents;
    });
  };

  const toggleCircleAccent = (index) => {
    if (index === 0) return;
    setCircleAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = (newAccents[index] + 1) % 3;
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

  // Refs für Play/Pause und Tap Tempo
  const togglePlayRef = useRef(null);
  const tapTempoRef = useRef(null);

  const registerTogglePlay = (fn) => {
    togglePlayRef.current = fn;
  };

  const registerTapTempo = (fn) => {
    tapTempoRef.current = fn;
  };

  // Global keyboard shortcuts – der onTogglePlayPause Callback ruft den registrierten Handler auf.
  useKeyboardShortcuts({
    onTogglePlayPause: () => {
      if (togglePlayRef.current) {
        togglePlayRef.current();
      }
    },
    onTapTempo: () => {
      if (tapTempoRef.current) {
        tapTempoRef.current();
      }
    },
    onSetSubdivisions: (num) => {
      setSubdivisions(num);
    },
    onIncreaseTempo: () => {
      setTempo(prev => Math.min(prev + 5, TEMPO_MAX));
    },
    onDecreaseTempo: () => {
      setTempo(prev => Math.max(prev - 5, TEMPO_MIN));
    },
    onSwitchToAnalog: () => {
      setMode("analog");
    },
    onSwitchToCircle: () => {
      setMode("circle");
    },
    onSwitchToGrid: () => {
      setMode("grid");
    },
    onToggleInfoOverlay: () => {
      setIsInfoActive((prev) => !prev);
    },
    onManualTempoIncrease: () => {
      // Handled within the metronome hook.
    },
  });

  const [isInfoActive, setIsInfoActive] = useState(false);

  return (
    <div className="app-container">
      <InfoOverlay setActive={setIsInfoActive} />
      <Header />
      {/* Training button (displayed next to the info button) */}
      <TrainingOverlay trainingSettings={trainingSettings} setTrainingSettings={setTrainingSettings} setMode={setMode} setIsPaused={setIsPaused} />
      {/* Mode selection buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={() => {
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
      {(mode === "analog" || mode === "training") && (
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
          accents={mode === "grid" ? gridAccents : circleAccents}
          toggleAccent={mode === "grid" ? toggleGridAccent : toggleCircleAccent}
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
          accents={mode === "grid" ? gridAccents : circleAccents}
          toggleAccent={mode === "grid" ? toggleGridAccent : toggleCircleAccent}
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
          accents={gridAccents}
          updateAccents={setGridAccents}
          {...trainingSettings}
          registerTogglePlay={registerTogglePlay}
          registerTapTempo={registerTapTempo}
        />
      )}
      <Footer />
    </div>
  );
}

export default App;
