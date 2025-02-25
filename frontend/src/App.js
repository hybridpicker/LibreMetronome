// File: src/App.js
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import InfoOverlay from './components/InfoOverlay';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';
import MultiCircleMetronome from './components/MultiCircleMetronome';
import GridModeMetronome from './components/metronome/GridModeMetronome';
import TrainingOverlay from './components/training/TrainingOverlay';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import MetronomeControls from './components/metronome/MetronomeControls';

import quarterNotesActive from './assets/svg/quarter_eight_notes/quarterNotesActive.svg';
import quarterNotesInactive from './assets/svg/quarter_eight_notes/quarterNotesInactive.svg';
import eightNotesActive from './assets/svg/quarter_eight_notes/eightNotesActive.svg';
import eightNotesInactive from './assets/svg/quarter_eight_notes/eightNotesInactive.svg';

const TEMPO_MIN = 15;
const TEMPO_MAX = 240;

function App() {
  // Mode can be: "analog", "circle", "grid", or "multi"
  const [mode, setMode] = useState("circle");
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );

  // Reinitialize accents whenever subdivisions change.
  useEffect(() => {
    setAccents(Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1)));
  }, [subdivisions]);

  const toggleAccent = (index) => {
    if (index === 0) return;
    setAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = (newAccents[index] + 1) % 3;
      return newAccents;
    });
  };

  const [beatMode, setBeatMode] = useState("quarter");
  const [trainingSettings, setTrainingSettings] = useState({
    macroMode: 0,
    speedMode: 0,
    measuresUntilMute: 2,
    muteDurationMeasures: 1,
    muteProbability: 0.3,
    measuresUntilSpeedUp: 2,
    tempoIncreasePercent: 5
  });

  const togglePlayRef = useRef(null);
  const tapTempoRef = useRef(null);
  const registerTogglePlay = (fn) => { togglePlayRef.current = fn; };
  const registerTapTempo = (fn) => { tapTempoRef.current = fn; };

  useKeyboardShortcuts({
    onTogglePlayPause: () => { if (togglePlayRef.current) togglePlayRef.current(); },
    onTapTempo: () => { if (tapTempoRef.current) tapTempoRef.current(); },
    onSetSubdivisions: (num) => { setSubdivisions(num); },
    onIncreaseTempo: () => { setTempo(prev => Math.min(prev + 5, TEMPO_MAX)); },
    onDecreaseTempo: () => { setTempo(prev => Math.max(prev - 5, TEMPO_MIN)); },
    onSwitchToAnalog: () => { setMode("analog"); },
    onSwitchToCircle: () => { setMode("circle"); },
    onSwitchToGrid: () => { setMode("grid"); },
    onSwitchToMulti: () => { setMode("multi"); },
    onToggleInfoOverlay: () => { },
    onManualTempoIncrease: () => { }
  });

  const [isInfoActive, setIsInfoActive] = useState(false);

  // Render the metronome view based on the current mode.
  const renderMetronome = () => {
    switch (mode) {
      case "analog":
        return (
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
        );
      case "circle":
        return (
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
        );
      case "grid":
        return (
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
        );
      case "multi":
        return (
          <MultiCircleMetronome
            tempo={tempo}
            setTempo={setTempo}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            swing={swing}
            setSwing={setSwing}
            volume={volume}
            setVolume={setVolume}
            analogMode={false}
            {...trainingSettings}
            registerTogglePlay={registerTogglePlay}
            registerTapTempo={registerTapTempo}
          />
        );
      default:
        return null;
    }
  };

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
        <button onClick={() => setMode("analog")} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: mode === "analog" ? "#00A0A0" : "#ccc", color: "#fff", border: "none", borderRadius: "5px" }}>
          Analog Mode
        </button>
        <button onClick={() => setMode("circle")} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: mode === "circle" ? "#00A0A0" : "#ccc", color: "#fff", border: "none", borderRadius: "5px" }}>
          Circle Mode
        </button>
        <button onClick={() => setMode("grid")} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: mode === "grid" ? "#00A0A0" : "#ccc", color: "#fff", border: "none", borderRadius: "5px" }}>
          Grid Mode
        </button>
        <button onClick={() => setMode("multi")} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: mode === "multi" ? "#00A0A0" : "#ccc", color: "#fff", border: "none", borderRadius: "5px" }}>
          Multi Circle
        </button>
      </div>
      
      {/* Render the metronome view */}
      {renderMetronome()}

      {/* Render common controls only if mode is not multi.
          In analog mode, the SubdivisionSelector is hidden; notes and sliders appear once. */}
      {mode !== "multi" && (
        <MetronomeControls
          mode={mode}
          beatMode={beatMode}
          setBeatMode={setBeatMode}
          subdivisions={subdivisions}
          setSubdivisions={setSubdivisions}
          swing={swing}
          setSwing={setSwing}
          volume={volume}
          setVolume={setVolume}
          tempo={tempo}
          setTempo={setTempo}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
