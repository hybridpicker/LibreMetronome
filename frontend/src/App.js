// File: src/App.js
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import InfoOverlay from './components/InfoOverlay';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';
import GridModeMetronome from './components/GridModeMetronome';
import TrainingOverlay from './components/training/TrainingOverlay';
import useKeyboardShortcuts from './hooks/KeyboardShortcuts';

// Import SVGs for quarter/eighth note buttons
import quarterNotesActive from './assets/svg/quarter_eight_notes/quarterNotesActive.svg';
import quarterNotesInactive from './assets/svg/quarter_eight_notes/quarterNotesInactive.svg';
import eightNotesActive from './assets/svg/quarter_eight_notes/eightNotesActive.svg';
import eightNotesInactive from './assets/svg/quarter_eight_notes/eightNotesInactive.svg';

const TEMPO_MIN = 15;
const TEMPO_MAX = 240;

function App() {
  // Mode selection: "analog", "circle", or "grid"
  const [mode, setMode] = useState("circle");

  // Metronome parameters
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  // Subdivisions remains user selectable via the 1–9 buttons.
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(0.5);

  // Unified accent state (first beat fixed as 3, others start as 1)
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0 ? 3 : 1)
  );
  useEffect(() => {
    setAccents(Array.from({ length: subdivisions }, (_, i) => i === 0 ? 3 : 1));
  }, [subdivisions]);

  // Unified toggle function for accents: cycles non-first beats from mute (0) → normal (1) → accent (2) → mute (0)
  const toggleAccent = (index) => {
    if (index === 0) return;
    setAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = (newAccents[index] + 1) % 3;
      return newAccents;
    });
  };

  // New: beatMode state for quarter/eighth note selection.
  // "quarter" uses beatMultiplier = 1; "eighth" uses beatMultiplier = 2.
  const [beatMode, setBeatMode] = useState("quarter");

  // Training mode parameters (default values)
  const [trainingSettings, setTrainingSettings] = useState({
    macroMode: 0,
    speedMode: 0,
    measuresUntilMute: 2,
    muteDurationMeasures: 1,
    muteProbability: 0.3,
    measuresUntilSpeedUp: 2,
    tempoIncreasePercent: 5
  });

  // Refs for Play/Pause and Tap Tempo – these allow our keyboard shortcuts to trigger the correct handlers.
  const togglePlayRef = useRef(null);
  const tapTempoRef = useRef(null);
  const registerTogglePlay = (fn) => { togglePlayRef.current = fn; };
  const registerTapTempo = (fn) => { tapTempoRef.current = fn; };

  // Global keyboard shortcuts registration.
  useKeyboardShortcuts({
    onTogglePlayPause: () => { if (togglePlayRef.current) togglePlayRef.current(); },
    onTapTempo: () => { if (tapTempoRef.current) tapTempoRef.current(); },
    onSetSubdivisions: (num) => { setSubdivisions(num); },
    onIncreaseTempo: () => { setTempo(prev => Math.min(prev + 5, TEMPO_MAX)); },
    onDecreaseTempo: () => { setTempo(prev => Math.max(prev - 5, TEMPO_MIN)); },
    onSwitchToAnalog: () => { setMode("analog"); },
    onSwitchToCircle: () => { setMode("circle"); },
    onSwitchToGrid: () => { setMode("grid"); },
    onToggleInfoOverlay: () => { setIsInfoActive(prev => !prev); },
    onManualTempoIncrease: () => { }
  });

  const [isInfoActive, setIsInfoActive] = useState(false);

  return (
    <div className="app-container">
      <InfoOverlay setActive={setIsInfoActive} />
      <Header />
      <TrainingOverlay 
        trainingSettings={trainingSettings} 
        setTrainingSettings={setTrainingSettings} 
        setMode={setMode} 
        setIsPaused={setIsPaused} 
      />
      {/* Mode selection buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={() => setMode("analog")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: mode === "analog" ? "#00A0A0" : "#ccc",
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
            background: mode === "circle" ? "#00A0A0" : "#ccc",
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
            background: mode === "grid" ? "#00A0A0" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Grid Mode
        </button>
      </div>
      
      {/* Quarter/Eighth note buttons with heading */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3>Notes</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          <button
            onClick={() => setBeatMode("quarter")}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <img
              src={beatMode === "quarter" ? quarterNotesActive : quarterNotesInactive}
              alt="Quarter Notes"
              style={{ width: "50px", height: "50px" }}
            />
          </button>
          <button
            onClick={() => setBeatMode("eighth")}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <img
              src={beatMode === "eighth" ? eightNotesActive : eightNotesInactive}
              alt="Eighth Notes"
              style={{ width: "50px", height: "50px" }}
            />
          </button>
        </div>
      </div>
      
      {/* Render metronome based on selected mode.
          The beatMultiplier prop is determined by beatMode.
          The subdivision buttons remain available inside each metronome component. */}
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
          togglePlay={() => { if (togglePlayRef.current) togglePlayRef.current(); }}
          analogMode={true}
          accents={accents}
          toggleAccent={toggleAccent}
          {...trainingSettings}
          registerTogglePlay={registerTogglePlay}
          beatMultiplier={beatMode === "quarter" ? 1 : 2}
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
          togglePlay={() => { if (togglePlayRef.current) togglePlayRef.current(); }}
          analogMode={false}
          accents={accents}
          toggleAccent={toggleAccent}
          {...trainingSettings}
          registerTogglePlay={registerTogglePlay}
          beatMultiplier={beatMode === "quarter" ? 1 : 2}
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
          togglePlay={() => { if (togglePlayRef.current) togglePlayRef.current(); }}
          analogMode={false}
          gridMode={true}
          accents={accents}
          updateAccents={setAccents}
          {...trainingSettings}
          registerTogglePlay={registerTogglePlay}
          registerTapTempo={registerTapTempo}
          beatMultiplier={beatMode === "quarter" ? 1 : 2}
        />
      )}
      <Footer />
    </div>
  );
}

export default App;
