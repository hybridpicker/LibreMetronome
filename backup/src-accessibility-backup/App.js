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
import { Helmet, HelmetProvider } from 'react-helmet-async';
import ModeSelector from './components/ModeSelector'; // Import the new ModeSelector component
import { SupportButton, SupportPage } from './components/Support'; // Import the Support components
import { HelpButton, InfoModal } from './components/InfoSection'; // Import the Help components
// --- Start of Resolved Conflict Area ---
import {
  ScreenReaderAnnouncer,
  SkipToContent,
  FocusTrap
} from './components/accessibility'; // Import the Accessibility components
import {
  loadAccessibilitySettings,
  announceToScreenReader,
  triggerHapticFeedback,
  playAudioFeedback,
  detectSystemPreferences
} from './utils/accessibility/accessibilityUtils';
import './styles/focus-indicators.css'; // Import focus indicator styles
import './styles/color-blindness.css'; // Import color blindness styles
import './styles/high-contrast.css'; // Import high contrast styles
import './styles/enhanced-high-contrast.css'; // Import enhanced high contrast styles
import './styles/high-contrast-override.css'; // Import final high contrast overrides
import './styles/large-text.css'; // Import large text styles
import './styles/global-accessibility.css'; // Import global accessibility styles
// --- End of Resolved Conflict Area ---

const TEMPO_MIN = 15; // Keep this one
const TEMPO_MAX = 240;

// Global debug helper for testing sound preview
// ... (rest of the debug helper code remains the same) ...
window.metronomeDebug = window.metronomeDebug || {
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
  // ... (audio context initialization useEffect remains the same) ...
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
        // Audio context initialized

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
          // Audio context resumed

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
                // Verification sound played successfully
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
        // Attempting to resume existing audio context
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


  const [mode, setMode] = useState("analog"); // Options: "analog", "circle", "grid", "multi", "polyrhythm"
  const [showSupportPage, setShowSupportPage] = useState(false);
  // Style guide toggle removed
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

  // Tap Tempo useEffect remains the same
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

      // Constants for tempo calculation
      const MIN_TAP_INTERVAL = 200; // Milliseconds
      const MAX_TAP_INTERVAL = 2000; // Milliseconds
      const COMMON_TEMPOS = [60, 90, 100, 120, 140, 160, 180]; // Common tempos for stability

      // Store timestamp for future tap tempo calculation
      window._tapTempoTimes = window._tapTempoTimes || [];

      // Get the current timestamp
      const now = event.detail.timestamp || performance.now();

      // Check if this tap is too close to the previous one (debounce)
      if (window._tapTempoTimes.length > 0) {
        const lastTap = window._tapTempoTimes[window._tapTempoTimes.length - 1];
        if (now - lastTap < MIN_TAP_INTERVAL) {
          console.log(`[APP] Tap too soon after previous (${Math.round(now - lastTap)}ms), ignoring`);
          return;
        }

        // Reset if too long between taps
        if (now - lastTap > MAX_TAP_INTERVAL) {
          console.log(`[APP] Too long since last tap (${Math.round(now - lastTap)}ms), resetting`);
          window._tapTempoTimes = [now];
          return;
        }
      }

      // Add the current tap time
      window._tapTempoTimes.push(now);
      console.log(`[APP] Tap recorded: ${window._tapTempoTimes.length} total taps`);

      // Keep only the last 6 taps
      while (window._tapTempoTimes.length > 6) {
        window._tapTempoTimes.shift();
      }

      // Need at least 3 taps for a stable tempo
      if (window._tapTempoTimes.length >= 3) {
        // Calculate intervals between consecutive taps
        let intervals = [];
        for (let i = 1; i < window._tapTempoTimes.length; i++) {
          const interval = window._tapTempoTimes[i] - window._tapTempoTimes[i-1];
          if (interval >= MIN_TAP_INTERVAL && interval <= MAX_TAP_INTERVAL) {
            intervals.push(interval);
            console.log(`[APP] Interval ${i}: ${Math.round(interval)}ms`);
          }
        }

        // Need at least one valid interval
        if (intervals.length === 0) {
          console.log("[APP] No valid intervals");
          return;
        }

        // Remove outliers (intervals that are too far from median)
        if (intervals.length >= 3) {
          intervals.sort((a, b) => a - b);
          const median = intervals[Math.floor(intervals.length / 2)];
          const filteredIntervals = intervals.filter(i => Math.abs(i - median) / median < 0.4);

          // Only use filtered intervals if we have enough
          if (filteredIntervals.length >= 2) {
            intervals = filteredIntervals;
          }
        }

        // Calculate average interval
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        let newTempo = Math.round(60000 / avgInterval);

        // Snap to common tempos if close
        for (const commonTempo of COMMON_TEMPOS) {
          const percentDifference = Math.abs(newTempo - commonTempo) / commonTempo;
          if (percentDifference < 0.05) {
            console.log(`[APP] Snapping from ${newTempo} to ${commonTempo} BPM (common tempo)`);
            newTempo = commonTempo;
            break;
          }
        }

        // Clamp tempo to valid range
        const clampedTempo = Math.min(Math.max(newTempo, TEMPO_MIN), TEMPO_MAX);
        console.log(`[APP] Calculated tempo: ${clampedTempo} BPM`);

        // Only actually set the tempo after we have enough taps for accuracy
        if (window._tapTempoTimes.length >= 4) {
          console.log(`[APP] Setting tempo to ${clampedTempo} BPM`);
          setTempo(clampedTempo);

          // Reset for next sequence after successfully setting tempo
          window._tapTempoTimes = [];
        } else {
          console.log(`[APP] Need ${4 - window._tapTempoTimes.length} more tap(s) to confirm tempo`);
        }
      } else {
        console.log(`[APP] Need ${3 - window._tapTempoTimes.length} more tap(s) to calculate tempo`);
      }
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


  // --- Start of Accessibility useEffect (from HEAD branch) ---
  // Initialize accessibility settings on app load and respond to system preference changes
  useEffect(() => {
    // Function to load settings
    const initAccessibility = () => {
      const settings = loadAccessibilitySettings();
      console.log('App: Accessibility settings initialized:', settings);
    };

    // Load settings initially
    initAccessibility();

    // Listen for settings changes - rebuild accessibility state entirely
    const handleAccessibilitySettingsChanged = (event) => {
      console.log('App: Accessibility setting changed:', event.detail);

      // Provide haptic feedback when settings change
      if (window.hapticFeedbackEnabled && event.detail && event.detail.setting) {
        triggerHapticFeedback('short');
      }

      // Announce the change to screen readers
      if (window.screenReaderMessagesEnabled && event.detail && event.detail.setting) {
        const settingName = event.detail.setting;
        const value = event.detail.value;

        let message = '';
        switch(settingName) {
          case 'highContrast':
            message = `High contrast mode ${value ? 'enabled' : 'disabled'}`;
            break;
          case 'largeText':
            message = `Large text mode ${value ? 'enabled' : 'disabled'}`;
            break;
          case 'reducedMotion':
            message = `Reduced motion ${value ? 'enabled' : 'disabled'}`;
            break;
          case 'audioFeedback':
            message = `Audio feedback ${value ? 'enabled' : 'disabled'}`;
            break;
          case 'screenReaderMessages':
            message = `Screen reader announcements ${value ? 'enabled' : 'disabled'}`;
            break;
          case 'focusIndicators':
            message = `Enhanced focus indicators ${value ? 'enabled' : 'disabled'}`;
            break;
          case 'hapticFeedback':
            message = `Haptic feedback ${value ? 'enabled' : 'disabled'}`;
            break;
          case 'colorBlindMode':
            if (value === 'none') {
              message = 'Color blind mode disabled';
            } else {
              message = `Color blind mode set to ${value}`;
            }
            break;
          default:
            message = `Accessibility setting updated`;
        }

        announceToScreenReader(message, 'polite');
      }

      // Reload all settings to ensure consistency
      initAccessibility();
    };

    // Try to create media queries with fallbacks for tests
    let reducedMotionQuery, highContrastQuery, darkModeQuery;

    try {
      // Only create these if matchMedia is available
      if (window.matchMedia && typeof window.matchMedia === 'function') {
        reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        highContrastQuery = window.matchMedia('(prefers-contrast: more)');
        darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      }
    } catch (e) {
      console.error('Error creating media queries:', e);
    }

    const handleReducedMotionChange = (e) => {
      console.log('App: System preference for reduced motion changed:', e.matches);
      if (e.matches) {
        // Only apply if not explicitly disabled
        if (localStorage.getItem('accessibility-reduced-motion') !== 'false') {
          document.body.classList.add('reduced-motion');
          localStorage.setItem('accessibility-reduced-motion', 'true');
          console.log('App: Applied reduced motion from system preference');

          // Announce change to screen readers
          if (window.screenReaderMessagesEnabled) {
            announceToScreenReader('Reduced motion enabled based on system preference', 'polite');
          }
        }
      } else {
        // If user hasn't explicitly enabled it, turn it off when system preference changes
        if (localStorage.getItem('accessibility-reduced-motion') !== 'true') {
          document.body.classList.remove('reduced-motion');
          localStorage.setItem('accessibility-reduced-motion', 'false');
          console.log('App: Removed reduced motion based on system preference');
        }
      }
    };

    const handleHighContrastChange = (e) => {
      console.log('App: System preference for high contrast changed:', e.matches);
      if (e.matches) {
        // Only apply if not explicitly disabled
        if (localStorage.getItem('accessibility-high-contrast') !== 'false') {
          document.body.classList.add('high-contrast');
          localStorage.setItem('accessibility-high-contrast', 'true');
          console.log('App: Applied high contrast from system preference');

          // Announce change to screen readers
          if (window.screenReaderMessagesEnabled) {
            announceToScreenReader('High contrast mode enabled based on system preference', 'polite');
          }
        }
      } else {
        // If user hasn't explicitly enabled it, turn it off when system preference changes
        if (localStorage.getItem('accessibility-high-contrast') !== 'true') {
          document.body.classList.remove('high-contrast');
          localStorage.setItem('accessibility-high-contrast', 'false');
          console.log('App: Removed high contrast based on system preference');
        }
      }
    };

    // Set up event listeners
    window.addEventListener('accessibility-settings-changed', handleAccessibilitySettingsChanged);

    // Only add event listeners if the media queries are available
    if (reducedMotionQuery && typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    }

    if (highContrastQuery && typeof highContrastQuery.addEventListener === 'function') {
      highContrastQuery.addEventListener('change', handleHighContrastChange);
    }

    // Initial check for system preferences using the utility function
    const systemPreferences = detectSystemPreferences();
    if (systemPreferences.reducedMotion) {
      handleReducedMotionChange({ matches: true });
    }

    if (systemPreferences.highContrast) {
      handleHighContrastChange({ matches: true });
    }

    // Check accessibility settings every time the app is focused
    window.addEventListener('focus', initAccessibility);

    // For debugging: add a global method to check current accessibility state
    window.checkAccessibilityState = () => {
      const state = {
        highContrast: document.body.classList.contains('high-contrast'),
        largeText: document.body.classList.contains('large-text'),
        reducedMotion: document.body.classList.contains('reduced-motion'),
        focusIndicators: document.body.classList.contains('focus-visible-enabled'),
        colorBlind: document.body.classList.contains('color-blind'),
        colorBlindMode: document.body.className.match(/protanopia|deuteranopia|tritanopia|monochromacy/)?.[0] || 'none',
        audioFeedback: window.audioFeedbackEnabled,
        screenReaderMessages: window.screenReaderMessagesEnabled,
        hapticFeedback: window.hapticFeedbackEnabled,
        systemPreferences: detectSystemPreferences(),
        localStorage: {
          highContrast: localStorage.getItem('accessibility-high-contrast'),
          largeText: localStorage.getItem('accessibility-large-text'),
          reducedMotion: localStorage.getItem('accessibility-reduced-motion'),
          audioFeedback: localStorage.getItem('accessibility-audio-feedback'),
          screenReaderMessages: localStorage.getItem('accessibility-screen-reader-messages'),
          focusIndicators: localStorage.getItem('accessibility-focus-indicators'),
          hapticFeedback: localStorage.getItem('accessibility-haptic-feedback'),
          colorBlindMode: localStorage.getItem('accessibility-color-blind-mode')
        }
      };
      console.log('Current accessibility state:', state);
      return state;
    };

    return () => {
      window.removeEventListener('accessibility-settings-changed', handleAccessibilitySettingsChanged);

      // Only remove event listeners if they were added
      if (reducedMotionQuery && typeof reducedMotionQuery.removeEventListener === 'function') {
        reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      }

      if (highContrastQuery && typeof highContrastQuery.removeEventListener === 'function') {
        highContrastQuery.removeEventListener('change', handleHighContrastChange);
      }

      window.removeEventListener('focus', initAccessibility);
    };
  }, []);
  // --- End of Accessibility useEffect ---


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

  const togglePlayRef = useRef(null);
  const tapTempoRef = useRef(null);
  const registerTogglePlay = (fn) => { togglePlayRef.current = fn; };
  const registerTapTempo = (fn) => { tapTempoRef.current = fn; };

  window.tapTempoRef = tapTempoRef;

  // useKeyboardShortcuts hook remains the same
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
    // Style guide toggle removed
  });

  const version = '0.4.6';

  // getModeDescription function remains the same
  const getModeDescription = () => {
    const baseDescription = "LibreMetronome – A free online metronome featuring tap tempo, custom time signatures, and advanced rhythm training tools.";
    switch (mode) {
      case "analog":
        return `${baseDescription} Currently in Analog Mode with realistic pendulum animation for traditional practice.`;
      case "circle":
        return `${baseDescription} Currently in Circle Mode with interactive beat visualization for tempo precision.`;
      case "grid":
        return `${baseDescription} Currently in Grid Mode with customizable beat patterns for complex time signatures.`;
      case "multi":
        return `${baseDescription} Currently in Multi-Circle Mode for polyrhythm practice and advanced timing exercises.`;
      case "polyrhythm":
        return `${baseDescription} Currently in Polyrhythm Mode for practicing complex rhythmic patterns and improving coordination.`;
      default:
        return baseDescription;
    }
  };

  // renderMetronome function remains the same
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

  // Return statement (JSX) remains the same
  return (
    <HelmetProvider>
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

      {/* Help button positioned at bottom-left corner */}
      <HelpButton onClick={() => setInfoModalOpen(true)} />
      <Helmet>
        <title>{`LibreMetronome - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`}</title>
        <meta name="description" content={getModeDescription()} />
        <meta name="keywords" content={`Free Online Metronome, Tap Tempo, Time Signatures, Beat Counter, ${mode} mode, Music Practice Tool, Rhythm Training`} />
        <meta name="application-version" content={version} />
        <meta property="og:title" content={`LibreMetronome - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`} />
        <meta property="og:description" content={getModeDescription()} />
        <meta name="twitter:title" content={`LibreMetronome - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`} />
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
      />

      <Header />

      {showSupportPage ? (
        <div className="support-page-container">
          <div style={{
            position: 'sticky',
            top: '0',
            zIndex: '10',
            backgroundColor: 'var(--neutral-bg)',
            padding: '15px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center'
          }}>
            <button
              className="back-button"
              onClick={() => setShowSupportPage(false)}
              style={{
                padding: '10px 18px',
                backgroundColor: 'var(--secondary-gold)',
                color: 'var(--text-primary)',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontFamily: 'Lato, sans-serif',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.12)';
                e.currentTarget.style.backgroundColor = 'var(--secondary-gold-dark)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.backgroundColor = 'var(--secondary-gold)';
              }}
            >
              <span style={{ fontSize: '1.2em', lineHeight: 1 }}>←</span> Back to Metronome
            </button>
          </div>
          <SupportPage />
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