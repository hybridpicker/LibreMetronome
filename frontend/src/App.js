// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronome';
import MultiCircleMetronome from './components/metronome/MultiCircleMode';
import GridModeMetronome from './components/metronome/GridMode/GridModeMetronome';
import PolyrhythmMetronome from './components/metronome/PolyrhythmMode';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import MetronomeControls from './components/metronome/Controls/MetronomeControls';
import MainMenu from './components/Menu/mainMenu';
import SettingsContent from './components/Menu/SettingsContent';
import { Helmet } from 'react-helmet';
import ModeSelector from './components/ModeSelector'; // Import the new ModeSelector component

const TEMPO_MIN = 15;
const TEMPO_MAX = 240;

// Global debug helper for testing sound preview
window.metronomeDebug = {
  audioBuffers: null,
  audioContext: null,
  playSound: function(type, volume = 0.5) {
    if (!this.audioContext) return false;
    if (!this.audioBuffers || !this.audioBuffers[type]) return false;
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      const source = this.audioContext.createBufferSource();
      source.buffer = this.audioBuffers[type];
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
      return true;
    } catch (error) {
      return false;
    }
  },
  checkEventListeners: function() {
    const soundEvent = new CustomEvent('metronome-preview-sound', { 
      detail: { type: 'first', volume: 0.5 } 
    });
    const patternEvent = new CustomEvent('metronome-preview-pattern', { 
      detail: { volume: 0.5 } 
    });
    window.dispatchEvent(soundEvent);
    window.dispatchEvent(patternEvent);
    return 'Check console for events';
  }
};

function App() {
  const [mode, setMode] = useState("circle"); // Options: "analog", "circle", "grid", "multi", "polyrhythm"
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );

  // Make tempo setter globally available (for tap tempo)
  window.setMetronomeTempo = setTempo;

  useEffect(() => {
    const handleTapTempoEvent = (event) => {
      if (event.detail && typeof event.detail.tempo === 'number') {
        setTempo(event.detail.tempo);
      }
    };
    window.addEventListener('metronome-set-tempo', handleTapTempoEvent);
    return () => window.removeEventListener('metronome-set-tempo', handleTapTempoEvent);
  }, []);

  useEffect(() => {
    setAccents(Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1)));
  }, [subdivisions]);

  const [prevMode, setPrevMode] = useState(mode);
  useEffect(() => {
    if (prevMode !== mode && !isPaused) {
      const timer = setTimeout(() => {
        if (togglePlayRef.current) {
          setIsPaused(true);
          setTimeout(() => setIsPaused(false), 50);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    setPrevMode(mode);
  }, [mode, isPaused, prevMode]);

  const toggleAccent = (index) => {
    setAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = (newAccents[index] + 1) % 4;
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

  const [soundSetReloadTrigger, setSoundSetReloadTrigger] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const togglePlayRef = useRef(null);
  const tapTempoRef = useRef(null);
  const registerTogglePlay = (fn) => { togglePlayRef.current = fn; };
  const registerTapTempo = (fn) => { tapTempoRef.current = fn; };

  window.tapTempoRef = tapTempoRef;

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
  });

  const version = '0.4.6';

  const getModeDescription = () => {
    const baseDescription = "LibreMetronome – An advanced, modular metronome service featuring various visualizations and training effects.";
    switch (mode) {
      case "analog":
        return `${baseDescription} Currently in Analog Mode with realistic pendulum animation.`;
      case "circle":
        return `${baseDescription} Currently in Circle Mode with interactive beat visualization.`;
      case "grid":
        return `${baseDescription} Currently in Grid Mode with customizable beat patterns.`;
      case "multi":
        return `${baseDescription} Currently in Multi-Circle Mode for polyrhythm practice.`;
      case "polyrhythm":
        return `${baseDescription} Currently in Polyrhythm Mode for practicing complex rhythmic patterns.`;
      default:
        return baseDescription;
    }
  };

  const handleApplySettings = () => {
    setSoundSetReloadTrigger(prev => prev + 1);
    setSettingsVisible(false);
  };

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
            soundSetReloadTrigger={soundSetReloadTrigger}
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
            soundSetReloadTrigger={soundSetReloadTrigger}
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
            soundSetReloadTrigger={soundSetReloadTrigger}
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
            key="multicircle"
            soundSetReloadTrigger={soundSetReloadTrigger}
          />
        );
      case "polyrhythm":
        return (
          <PolyrhythmMetronome
            tempo={tempo}
            setTempo={setTempo}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            swing={swing}
            volume={volume}
            setVolume={setVolume}
            {...trainingSettings}
            registerTogglePlay={registerTogglePlay}
            registerTapTempo={registerTapTempo}
            soundSetReloadTrigger={soundSetReloadTrigger}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Helmet>
        <title>{`LibreMetronome - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`}</title>
        <meta name="description" content={getModeDescription()} />
        <meta name="keywords" content={`Metronome, Music, Timing, Training, React, Web Audio, ${mode} mode`} />
        <meta name="application-version" content={version} />
        <meta property="og:title" content={`LibreMetronome - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`} />
        <meta property="og:description" content={getModeDescription()} />
        <meta name="twitter:title" content={`LibreMetronome - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`} />
        <meta name="twitter:description" content={getModeDescription()} />
      </Helmet>

      <MainMenu
        trainingSettings={trainingSettings}
        setTrainingSettings={setTrainingSettings}
        setMode={setMode}
        setIsPaused={setIsPaused}
        volume={volume}
        setVolume={setVolume}
        defaultTempo={tempo}
        setDefaultTempo={setTempo}
        defaultSubdivisions={subdivisions}
        setDefaultSubdivisions={setSubdivisions}
        currentMode={mode}
        setSoundSetReloadTrigger={setSoundSetReloadTrigger}
      />

      <Header />

      {/* Replace the old mode selector with the new ModeSelector component */}
      <ModeSelector mode={mode} setMode={setMode} />

      {renderMetronome()}

      {mode !== "multi" && mode !== "polyrhythm" && (
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

      {settingsVisible && (
        <SettingsContent
          volume={volume}
          setVolume={setVolume}
          defaultTempo={tempo}
          setDefaultTempo={setTempo}
          defaultSubdivisions={subdivisions}
          setDefaultSubdivisions={setSubdivisions}
          currentMode={mode}
          onClose={() => setSettingsVisible(false)}
          setSoundSetReloadTrigger={setSoundSetReloadTrigger}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;