// File: src/App.js
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronome';
import MultiCircleMetronome from './components/metronome/MultiCircleMode';
import GridModeMetronome from './components/metronome/GridMode/GridModeMetronome';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import MetronomeControls from './components/metronome/Controls/MetronomeControls';
import MainMenu from './components/Menu/mainMenu';
import SettingsContent from './components/Menu/SettingsContent';
import { Helmet } from 'react-helmet';

const TEMPO_MIN = 15;
const TEMPO_MAX = 240;

// Global debug helper for sound preview
window.metronomeDebug = {
  // Store audio buffers globally for testing
  audioBuffers: null,
  audioContext: null,
  
  // Test function to play sounds directly
  playSound: function(type, volume = 0.5) {
    console.log(`!!!!! [GLOBAL] ATTEMPTING TO PLAY ${type} SOUND DIRECTLY !!!!!`);
    
    if (!this.audioContext) {
      console.error('!!!!! [GLOBAL] NO AUDIO CONTEXT AVAILABLE !!!!!');
      return false;
    }
    
    if (!this.audioBuffers || !this.audioBuffers[type]) {
      console.error(`!!!!! [GLOBAL] NO AUDIO BUFFER FOR ${type} AVAILABLE !!!!!`);
      console.log('Available buffers:', this.audioBuffers);
      return false;
    }
    
    try {
      // Resume context if needed
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = this.audioBuffers[type];
      
      // Set volume
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;
      
      // Connect and play
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
      
      console.log(`!!!!! [GLOBAL] SUCCESSFULLY PLAYED ${type} SOUND !!!!!`);
      return true;
    } catch (error) {
      console.error('!!!!! [GLOBAL] ERROR PLAYING SOUND:', error);
      return false;
    }
  },
  
  // Log all registered event listeners
  checkEventListeners: function() {
    console.log('!!!!! [GLOBAL] CHECKING EVENT LISTENERS !!!!!');
    
    // Create test events
    const soundEvent = new CustomEvent('metronome-preview-sound', { 
      detail: { type: 'first', volume: 0.5 } 
    });
    
    const patternEvent = new CustomEvent('metronome-preview-pattern', { 
      detail: { volume: 0.5 } 
    });
    
    // Dispatch test events to check if listeners are working
    console.log('!!!!! [GLOBAL] DISPATCHING TEST SOUND EVENT !!!!!');
    window.dispatchEvent(soundEvent);
    
    console.log('!!!!! [GLOBAL] DISPATCHING TEST PATTERN EVENT !!!!!');
    window.dispatchEvent(patternEvent);
    
    return 'Check console for events';
  }
};

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

  // This trigger is incremented when settings are applied.
  const [soundSetReloadTrigger, setSoundSetReloadTrigger] = useState(0);
  
  // State for showing the settings overlay
  const [settingsVisible, setSettingsVisible] = useState(false);

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
  });

  // Use the version from package.json directly
  const version = '0.4.6';

  // Helper function to generate a description for the current mode.
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
      default:
        return baseDescription;
    }
  };

  // This function is called when the user applies new settings.
  // It updates the backend and increments soundSetReloadTrigger.
  const handleApplySettings = () => {
    // (Assume that settings are sent to the backend here.)
    setSoundSetReloadTrigger(prev => prev + 1);
    setSettingsVisible(false);
  };

  // Render metronome view based on current mode.
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
            soundSetReloadTrigger={soundSetReloadTrigger} // Add this prop
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
            soundSetReloadTrigger={soundSetReloadTrigger} // Add this prop
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

      {/* Main Menu */}
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
        setSoundSetReloadTrigger={setSoundSetReloadTrigger} // Add this prop
      />

      <Header />

      {/* Mode Selection Buttons */}
      <div className="mode-selector">
        <button 
          onClick={() => setMode("analog")} 
          className={`mode-button ${mode === "analog" ? "mode-button-active" : ""}`}
        >
          Analog Mode
        </button>
        <button 
          onClick={() => setMode("circle")} 
          className={`mode-button ${mode === "circle" ? "mode-button-active" : ""}`}
        >
          Circle Mode
        </button>
        <button 
          onClick={() => setMode("grid")} 
          className={`mode-button ${mode === "grid" ? "mode-button-active" : ""}`}
        >
          Grid Mode
        </button>
        <button 
          onClick={() => setMode("multi")} 
          className={`mode-button ${mode === "multi" ? "mode-button-active" : ""}`}
        >
          Multi Circle
        </button>
      </div>

      {/* Render Metronome View */}
      {renderMetronome()}

      {/* Render Controls only if mode is not multi */}
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

      {/* Settings Overlay */}
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

      {/* Button to open Settings */}
      <button onClick={() => setSettingsVisible(true)}>Open Settings</button>
    </div>
  );
}

export default App;