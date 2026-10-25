// src/App.js
import React, { useState, useRef, useEffect } from 'react';
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
import { Helmet, HelmetProvider } from 'react-helmet-async';
import ModeSelector from './components/ModeSelector'; // Import the new ModeSelector component
import { SupportPage } from './components/Support';
import { InfoModal } from './components/InfoSection'; // Import the Help components
import { initAudioContext, resumeAudioContext } from './hooks/useMetronomeLogic/audioBuffers';
import { setScreenAwake } from './mobile';
import { DESKTOP_COMMAND_EVENT, reportDesktopState } from './desktop';
import { manualTempoAcceleration } from './hooks/useMetronomeLogic/trainingLogic';
import AccessibilityMenu from './components/accessibility/AccessibilityMenu';
import './styles/accessibility.css';
import './styles/layout.css';
import './styles/accessibility-modes.css';
import { IS_NATIVE_APP } from './nativeApp';
import { applyFallbackTap } from './utils/tapTempoFallback';
import { TEMPO_MIN, TEMPO_MAX } from './hooks/useMetronomeLogic/constants';
// StyleGuide component removed

// The click samples are mastered to their safe peak already. Starting below
// unity gain made the web app quieter than the selected device level even
// before the user touched the volume control.
const DEFAULT_VOLUME = 1;
const PREVIOUS_DEFAULT_VOLUME = 0.85;
const VOLUME_STORAGE_KEY = 'libreMetronome.volume';
const VOLUME_DEFAULT_MIGRATION_KEY = 'libreMetronome.volumeDefault.v2';
const TEMPO_STORAGE_KEY = 'libreMetronome.tempo';

const getInitialVolume = () => {
  const storedVolume = Number.parseFloat(
    window.localStorage?.getItem(VOLUME_STORAGE_KEY)
  );

  // Existing installations persisted the previous 85% default. Upgrade that
  // value once, while leaving every other explicitly chosen volume untouched.
  if (
    storedVolume === PREVIOUS_DEFAULT_VOLUME &&
    window.localStorage?.getItem(VOLUME_DEFAULT_MIGRATION_KEY) !== '1'
  ) {
    window.localStorage?.setItem(VOLUME_DEFAULT_MIGRATION_KEY, '1');
    return DEFAULT_VOLUME;
  }

  return Number.isFinite(storedVolume)
    ? Math.max(0, Math.min(1, storedVolume))
    : DEFAULT_VOLUME;
};

const getInitialTempo = () => {
  const storedTempo = Number.parseInt(
    window.localStorage?.getItem(TEMPO_STORAGE_KEY),
    10
  );
  return Number.isFinite(storedTempo)
    ? Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, storedTempo))
    : 120;
};

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
        // Audio context initialization
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
      const context = initAudioContext();
      if (!context) return;

      // Invoke resume while the pointer/touch gesture is still active. Every
      // mode subsequently reuses this exact context.
      resumeAudioContext(context).catch((error) => {
        console.error("Failed to unlock audio output:", error);
      });
    } catch (err) {
      console.error("Error initializing audio context:", err);
    }
  };
  
  const [mode, setMode] = useState("analog"); // Options: "analog", "circle", "grid", "multi", "polyrhythm"
  const [showSupportPage, setShowSupportPage] = useState(false);
  // Style guide toggle removed
  const [tempo, setTempo] = useState(getInitialTempo);
  const [isPaused, setIsPaused] = useState(true);
  const [audioError, setAudioError] = useState('');
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(getInitialVolume);
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );

  useEffect(() => {
    window.localStorage?.setItem(VOLUME_STORAGE_KEY, volume.toString());
  }, [volume]);

  // Keep the last selected BPM across screen locks, app suspension, and a
  // complete relaunch of the Capacitor app.
  useEffect(() => {
    window.localStorage?.setItem(TEMPO_STORAGE_KEY, tempo.toString());
  }, [tempo]);

  // iPadOS may otherwise dim and lock the display during a practice session.
  // Requesting the lock only while playing avoids changing the user's normal
  // screen timeout when the metronome is stopped.
  useEffect(() => {
    setScreenAwake(!isPaused);

    return () => {
      setScreenAwake(false);
    };
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) return undefined;

    setAudioError('');
    const healthTimer = window.setTimeout(() => {
      const context = window._audioContextInit || window._audioContext;
      if (!context || context.state !== 'running') {
        setIsPaused(true);
        setAudioError('Audio could not start. Tap Start again to restore the audio session.');
      }
    }, 800);

    return () => window.clearTimeout(healthTimer);
  }, [isPaused]);

  // Make tempo setter globally available (for tap tempo)
  window.setMetronomeTempo = setTempo;
  
  // Expose support page navigation function
  window.setShowSupportPage = setShowSupportPage;
  
  // Create a universal tap tempo handler for direct access
  window.handleGlobalTapTempo = () => {
    console.log("[GLOBAL] Tap tempo triggered");
    // Check all possible sources for tap tempo handlers
    if (tapTempoRef.current) {
      console.log("[GLOBAL] Using tapTempoRef.current");
      tapTempoRef.current();
    } else if (window.tapTempoRef && typeof window.tapTempoRef.current === 'function') {
      console.log("[GLOBAL] Using window.tapTempoRef.current");
      window.tapTempoRef.current();
    } else {
      // Create a tap tempo event for the event handler to process
      console.log("[GLOBAL] No direct handler found, dispatching event");
      const now = performance.now();
      window.dispatchEvent(
        new CustomEvent("metronome-tap-tempo", {
          detail: { timestamp: now }
        })
      );
    }
  };

  useEffect(() => {
    // Handle the 'metronome-set-tempo' event (created by the tap tempo logic)
    const handleTapTempoEvent = (event) => {
      if (event.detail && typeof event.detail.tempo === 'number') {
        setTempo(event.detail.tempo);
      }
    };
    
    // Handle the 'metronome-tap-tempo' event (created by tap tempo button clicks)
    const handleRawTapTempoEvent = (event) => {
      console.log("[APP] Tap tempo event received");
      
      // First try to use registered handlers
      if (tapTempoRef.current) {
        console.log("[APP] Using registered tapTempoRef handler");
        tapTempoRef.current();
        return;
      } else if (window.tapTempoRef && typeof window.tapTempoRef.current === 'function') {
        console.log("[APP] Using global window.tapTempoRef handler");
        window.tapTempoRef.current();
        return;
      }
      
      // Fallback to built-in implementation
      console.log("[APP] No tap tempo handler registered, using fallback implementation");
      
      applyFallbackTap(event, setTempo);
    };
    
    // Handle the 'register-tap-tempo' event (from any metronome component)
    const handleRegisterTapTempo = (event) => {
      if (event.detail && typeof event.detail.handler === 'function') {
        console.log("[APP] Received tap tempo handler registration");
        tapTempoRef.current = event.detail.handler;
      }
    };
    
    window.addEventListener('metronome-set-tempo', handleTapTempoEvent);
    window.addEventListener('metronome-tap-tempo', handleRawTapTempoEvent);
    window.addEventListener('register-tap-tempo', handleRegisterTapTempo);
    
    return () => {
      window.removeEventListener('metronome-set-tempo', handleTapTempoEvent);
      window.removeEventListener('metronome-tap-tempo', handleRawTapTempoEvent);
      window.removeEventListener('register-tap-tempo', handleRegisterTapTempo);
    };
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
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);

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
    onSwitchToPolyrhythm: () => { setMode("polyrhythm"); },
    onToggleInfoOverlay: () => { setInfoModalOpen(prev => !prev); },
    onManualTempoIncrease: () => {
      if (!isPaused) {
        manualTempoAcceleration({
          tempoIncreasePercent: trainingSettings.tempoIncreasePercent,
          tempoRef: { current: tempo },
          setTempo
        });
      }
    },
    // Style guide toggle removed
  });

  // Mirror transport state to the macOS shell (Dock badge, menus, media keys).
  useEffect(() => {
    reportDesktopState({ tempo, isPaused, mode, subdivisions });
  }, [tempo, isPaused, mode, subdivisions]);

  // Commands from the macOS shell: menu bar, Dock menu and media keys.
  useEffect(() => {
    const handleNativeCommand = (event) => {
      const { command, value } = event.detail || {};
      switch (command) {
        case 'togglePlay':
          if (togglePlayRef.current) togglePlayRef.current();
          break;
        case 'play':
          if (playStateRef.current && togglePlayRef.current) togglePlayRef.current();
          break;
        case 'pause':
          if (!playStateRef.current && togglePlayRef.current) togglePlayRef.current();
          break;
        case 'adjustTempo':
          setTempo(prev => Math.min(Math.max(prev + Number(value || 0), TEMPO_MIN), TEMPO_MAX));
          break;
        case 'setTempo':
          setTempo(Math.min(Math.max(Math.round(Number(value) || 0), TEMPO_MIN), TEMPO_MAX));
          break;
        case 'tapTempo':
          if (tapTempoRef.current) tapTempoRef.current();
          break;
        case 'setMode':
          if (["analog", "circle", "grid", "multi", "polyrhythm"].includes(value)) setMode(value);
          break;
        case 'setSubdivisions': {
          const beats = Math.round(Number(value));
          if (beats >= 1 && beats <= 9) setSubdivisions(beats);
          break;
        }
        case 'toggleSettings':
          setSettingsVisible(prev => !prev);
          break;
        case 'toggleInfo':
          setInfoModalOpen(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener(DESKTOP_COMMAND_EVENT, handleNativeCommand);
    return () => window.removeEventListener(DESKTOP_COMMAND_EVENT, handleNativeCommand);
  }, []);

  const version = '0.4.6';

  const getModeDescription = () => {
    const baseDescription = "LibreMetronome – A free online metronome featuring tap tempo, custom time signatures, and advanced rhythm training tools.";
    switch (mode) {
      case "analog":
        return `${baseDescription} Currently in Analog Mode with realistic pendulum animation for traditional practice.`;
      case "circle":
        return `${baseDescription} Currently in Beat Mode with interactive beat visualization for tempo precision.`;
      case "grid":
        return `${baseDescription} Currently in Grid Mode with customizable beat patterns for complex time signatures.`;
      case "multi":
        return `${baseDescription} Currently in Sequence Mode for repeating sequences of bars.`;
      case "polyrhythm":
        return `${baseDescription} Currently in Polyrhythm Mode for practicing complex rhythmic patterns and improving coordination.`;
      default:
        return baseDescription;
    }
  };

  // Function removed as it was unused

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
            registerTapTempo={registerTapTempo}
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
            registerTapTempo={registerTapTempo}
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
    <HelmetProvider>
    <div className={`app-container mode-${mode} ${isPaused ? 'is-paused' : 'is-playing'}`}>
      <a className="skip-link" href="#metronome-workspace">Skip to metronome</a>
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
        tabIndex="-1"
      >
        Initialize Audio
      </button>
      
      <AccessibilityMenu isOpen={accessibilityOpen} onClose={() => setAccessibilityOpen(false)} />
      <Helmet>
        <title>{`LibreMetronome - ${({ circle: 'Beat', multi: 'Sequence' }[mode] || mode.charAt(0).toUpperCase() + mode.slice(1))} Mode`}</title>
        <meta name="description" content={getModeDescription()} />
        <meta name="keywords" content={`Free Online Metronome, Tap Tempo, Time Signatures, Beat Counter, ${mode} mode, Music Practice Tool, Rhythm Training`} />
        <meta name="application-version" content={version} />
        <meta property="og:title" content={`LibreMetronome - ${({ circle: 'Beat', multi: 'Sequence' }[mode] || mode.charAt(0).toUpperCase() + mode.slice(1))} Mode`} />
        <meta property="og:description" content={getModeDescription()} />
        <meta name="twitter:title" content={`LibreMetronome - ${({ circle: 'Beat', multi: 'Sequence' }[mode] || mode.charAt(0).toUpperCase() + mode.slice(1))} Mode`} />
        <meta name="twitter:description" content={getModeDescription()} />
      </Helmet>

      {/* Main menu button positioned at top-right corner */}
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
        onOpenAccessibility={() => setAccessibilityOpen(true)}
        onOpenGuide={() => setInfoModalOpen(true)}
      />

      <Header />

      <div className="sr-status" role="status" aria-live="polite" aria-atomic="true">
        {isPaused ? 'Metronome paused' : 'Metronome playing'}
      </div>
      {audioError && (
        <div className="audio-error" role="alert">
          {audioError}
        </div>
      )}

      {showSupportPage && !IS_NATIVE_APP ? (
        <div className="support-page-container">
          <div className="support-page-bar">
            <button
              type="button"
              className="back-button"
              onClick={() => setShowSupportPage(false)}
            >
              <span aria-hidden="true">&larr;</span> Back to Metronome
            </button>
          </div>
          <SupportPage />
        </div>
      ) : (
        <>
          <ModeSelector mode={mode} setMode={setMode} />

          <main id="metronome-workspace" className={`practice-workspace mode-${mode}`} tabIndex="-1">
            <section className="metronome-stage" aria-label={`${mode} metronome`}>
              {renderMetronome()}
            </section>

            {mode !== "multi" && mode !== "polyrhythm" && (
              <aside className="practice-controls" aria-label="Metronome controls">
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
              </aside>
            )}
          </main>

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
      
      {/* Info Modal */}
      <InfoModal 
        isOpen={infoModalOpen} 
        onClose={() => setInfoModalOpen(false)} 
      />
    </div>
    </HelmetProvider>
  );
}

export default App;
