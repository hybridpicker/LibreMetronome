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
import StyleGuide from './components/StyleGuide'; // Import the StyleGuide component

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
  // This hidden button and effect helps initialize the audio context
  // Many browsers require a user interaction to start audio
  const audioButtonRef = useRef(null);
  
  useEffect(() => {
    // Auto-click the audio initialization button
    const triggerAudioContextInit = () => {
      if (audioButtonRef.current) {
        console.log("Auto-triggering audio context initialization");
        audioButtonRef.current.click();
      }
    };
    
    // Try to initialize on page load
    triggerAudioContextInit();
    
    // Also add event listeners for user interaction to ensure it works
    const handleUserInteraction = () => {
      triggerAudioContextInit();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);
  
  const handleAudioContextInit = () => {
    try {
      // Create a silent audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.error("Web Audio API not supported in this browser");
        return;
      }
      
      // If there's already an audio context but it's closed, remove it
      if (window._audioContextInit && window._audioContextInit.state === 'closed') {
        console.log("Removing closed audio context");
        window._audioContextInit = null;
      }
      
      // Create and store in window for debugging/access
      if (!window._audioContextInit) {
        window._audioContextInit = new AudioContext({
          // Use 48kHz sample rate for professional audio quality
          sampleRate: 48000,
          // Set latencyHint to 'interactive' for better timing precision
          latencyHint: 'interactive'
        });
        console.log("Audio context initialized: ", window._audioContextInit.state);
        
        // Play a silent sound to ensure the audio context is fully activated
        const silentOscillator = window._audioContextInit.createOscillator();
        const silentGain = window._audioContextInit.createGain();
        silentGain.gain.value = 0.001; // Nearly silent
        silentOscillator.connect(silentGain);
        silentGain.connect(window._audioContextInit.destination);
        silentOscillator.start();
        silentOscillator.stop(window._audioContextInit.currentTime + 0.001);
        
        // Try to resume it immediately
        window._audioContextInit.resume().then(() => {
          console.log("Audio context resumed: ", window._audioContextInit.state);
          
          // Play another silent sound after resume to ensure it's working
          setTimeout(() => {
            try {
              if (window._audioContextInit && window._audioContextInit.state === 'running') {
                const checkOscillator = window._audioContextInit.createOscillator();
                const checkGain = window._audioContextInit.createGain();
                checkGain.gain.value = 0.001;
                checkOscillator.connect(checkGain);
                checkGain.connect(window._audioContextInit.destination);
                checkOscillator.start();
                checkOscillator.stop(window._audioContextInit.currentTime + 0.001);
                console.log("Verification sound played successfully");
              }
            } catch (e) {
              console.error("Error playing verification sound:", e);
            }
          }, 500);
        }).catch(err => {
          console.error("Failed to resume audio context:", err);
        });
      } else if (window._audioContextInit.state === 'suspended') {
        // If it exists but is suspended, try to resume it
        console.log("Attempting to resume existing audio context");
        window._audioContextInit.resume().then(() => {
          console.log("Existing audio context resumed: ", window._audioContextInit.state);
        }).catch(err => {
          console.error("Failed to resume existing audio context:", err);
        });
      }
    } catch (err) {
      console.error("Error initializing audio context:", err);
    }
  };
  
  const [mode, setMode] = useState("circle"); // Options: "analog", "circle", "grid", "multi", "polyrhythm"
  const [showStyleGuide, setShowStyleGuide] = useState(false); // Toggle for style guide display
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

  // Track when mode is changed
  const [prevMode, setPrevMode] = useState(mode);
  const playStateRef = useRef(isPaused);
  
  // Update playStateRef when isPaused changes
  useEffect(() => {
    playStateRef.current = isPaused;
  }, [isPaused]);

  // Handle mode changes and preserve playing state
  useEffect(() => {
    if (prevMode !== mode) {
      const wasPlaying = !playStateRef.current;
      
      // Set a small delay to allow the new component to mount before trying to play
      if (wasPlaying) {
        // Temporarily pause during transition
        setIsPaused(true);
        
        // Resume playback after component has mounted
        const timer = setTimeout(() => {
          if (togglePlayRef.current) {
            setIsPaused(false);
          }
        }, 150); // Slightly longer delay to ensure component is ready
        
        return () => clearTimeout(timer);
      }
    }
    setPrevMode(mode);
  }, [mode, prevMode]);

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
    onSwitchToAnalog: () => { setMode("analog"); setShowStyleGuide(false); },
    onSwitchToCircle: () => { setMode("circle"); setShowStyleGuide(false); },
    onSwitchToGrid: () => { setMode("grid"); setShowStyleGuide(false); },
    onSwitchToMulti: () => { setMode("multi"); setShowStyleGuide(false); },
    onToggleInfoOverlay: () => { },
    onToggleStyleGuide: () => { setShowStyleGuide(prev => !prev); }, // Toggle style guide with keyboard
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
      {/* Hidden button to initialize audio context */}
      <button 
        ref={audioButtonRef}
        onClick={handleAudioContextInit}
        style={{ 
          position: 'absolute', 
          opacity: 0, 
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
        aria-hidden="true"
      >
        Initialize Audio
      </button>
      <Helmet>
        <title>{showStyleGuide 
          ? "LibreMetronome - Style Guide" 
          : `LibreMetronome - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`}</title>
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
        showStyleGuide={showStyleGuide}
        setShowStyleGuide={setShowStyleGuide}
      />

      <Header />

      {showStyleGuide ? (
        <div className="style-guide-container">
          <div className="style-guide-header-controls">
            <button 
              className="btn-base btn-primary"
              onClick={() => setShowStyleGuide(false)}
            >
              Back to Metronome
            </button>
          </div>
          <StyleGuide />
        </div>
      ) : (
        <>
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
        </>
      )}

      <Footer />
    </div>
  );
}

export default App;