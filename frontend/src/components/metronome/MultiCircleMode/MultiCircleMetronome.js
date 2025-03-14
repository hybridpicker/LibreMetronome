// src/components/metronome/MultiCircleMode/MultiCircleMetronome.js - with all fixes
import React, { useState, useEffect, useRef, useCallback } from "react";
import useMultiCircleMetronomeLogic from "./hooks/useMultiCircleMetronomeLogic";
import useKeyboardShortcuts from "../../../hooks/useKeyboardShortcuts";
import CircleRenderer from "./CircleRenderer";
import tapButtonIcon from "../../../assets/svg/tap-button.svg";
import playIcon from "../../../assets/svg/play.svg";
import pauseIcon from "../../../assets/svg/pause.svg";
import "./MultiCircleMetronome.css";
import '../Controls/slider-styles.css';
import withTrainingContainer from '../../Training/withTrainingContainer'; // Use the standard training container
import { getActiveSoundSet } from "../../../services/soundSetService";
import { loadClickBuffers } from "../../../hooks/useMetronomeLogic/audioBuffers";

import NoteSelector from "../Controls/NoteSelector";
import SubdivisionSelector from "../Controls/SubdivisionSelector";
import AccelerateButton from "../Controls/AccelerateButton";
import { manualTempoAcceleration } from "../../../hooks/useMetronomeLogic/trainingLogic";

// Initialize global silence check function
window.isSilent = function() {
  return window.isSilencePhaseRef && window.isSilencePhaseRef.current === true;
};

// Maximum number of circles
const MAX_CIRCLES = 3;

const PlayButton = ({ handlePlayPause, isPaused }) => (
  <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
    <button
      className="play-pause-button"
      type="button"
      onClick={handlePlayPause}
      aria-label="Toggle Play/Pause"
      style={{ 
        background: "transparent", 
        border: "none", 
        cursor: "pointer",
        padding: "10px",
        transition: "all 0.2s ease",
        outline: "none"
      }}
    >
      <img 
        className="play-pause-icon"
        src={isPaused ? playIcon : pauseIcon}
        alt={isPaused ? "Play" : "Pause"}
        style={{
          width: "40px",
          height: "40px",
          objectFit: "contain",
          transition: "transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)"
        }}
      />
    </button>
  </div>
);

const AddCircleButton = ({ addCircle, containerSize, isMobile }) => (
  <div
    onClick={addCircle}
    style={{
      position: "relative",
      width: containerSize,
      height: containerSize,
      borderRadius: "50%",
      border: "2px dashed #00A0A0",
      margin: isMobile ? "15px 0" : "15px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      cursor: "pointer",
      transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
    }}
  >
    <div
      style={{
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        backgroundColor: "#00A0A0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        fontSize: "36px",
        fontWeight: "bold",
        boxShadow: "0 0 8px rgba(0, 160, 160, 0.5)"
      }}
    >
      +
    </div>
  </div>
);

function MultiCircleMetronome(props) {
  // Destructure props for clarity
  const {
    tempo,
    setTempo,
    isPaused,
    setIsPaused,
    swing,
    setSwing,
    volume,
    setVolume,
    registerTogglePlay,
    registerTapTempo,
    macroMode = 0,
    speedMode = 0,
    measuresUntilMute = 2,
    muteDurationMeasures = 1,
    muteProbability = 0.3,
    tempoIncreasePercent = 5,
    measuresUntilSpeedUp = 2,
    soundSetReloadTrigger = 0,
    // Get training-related refs from props
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef
  } = props;

  // Initialize with default settings for two circles
  const [circleSettings, setCircleSettings] = useState([
    {
      subdivisions: 4,
      accents: [3, 1, 1, 1],
      beatMode: "quarter"
    },
    {
      subdivisions: 3,
      accents: [3, 1, 1],
      beatMode: "quarter"
    }
  ]);
  
  // Track which circle is active in the UI (for editing)
  const [activeCircle, setActiveCircle] = useState(0);
  
  // Track which circle is currently playing (will advance sequentially)
  const [playingCircle, setPlayingCircle] = useState(0);
  
  // HOTFIX: Add local measure counter for training
  const localMeasureCountRef = useRef(0);
  const localMuteMeasureCountRef = useRef(0);
  const localIsSilencePhaseRef = useRef(false);
  
  // Setup initial values if refs are passed
  useEffect(() => {
    if (measureCountRef) localMeasureCountRef.current = measureCountRef.current;
    if (muteMeasureCountRef) localMuteMeasureCountRef.current = muteMeasureCountRef.current;
    if (isSilencePhaseRef) localIsSilencePhaseRef.current = isSilencePhaseRef.current;
    
    // Setup interval to sync values
    const syncInterval = setInterval(() => {
      if (measureCountRef) measureCountRef.current = localMeasureCountRef.current;
      if (muteMeasureCountRef) muteMeasureCountRef.current = localMuteMeasureCountRef.current;
      if (isSilencePhaseRef) isSilencePhaseRef.current = localIsSilencePhaseRef.current;
      
      // Update global reference
      window.isSilencePhaseRef = isSilencePhaseRef || localIsSilencePhaseRef;
      
      // Dispatch event to force training UI update
      window.dispatchEvent(new CustomEvent('training-measure-update'));
    }, 200);
    
    return () => clearInterval(syncInterval);
  }, [measureCountRef, muteMeasureCountRef, isSilencePhaseRef]);
  
  // Get current active settings
  const currentSettings = {
    ...circleSettings[activeCircle] || { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" },
    activeCircle
  };
  
  // Debugging for initialization
  useEffect(() => {
    console.log("MultiCircleMetronome initialized with settings:", {
      circleSettings,
      activeCircle,
      playingCircle,
      isPaused,
      speedMode,
      macroMode
    });
  }, []);
  
  // State tracking references
  const isProcessingPlayPauseRef = useRef(false);
  const lastCircleChangeTimeRef = useRef(0);
  
  // Track last beat for measure counting
  const lastBeatTimeRef = useRef(0);
  const measureStartTimeRef = useRef(0);
  
  // Container size calculation
  const getContainerSize = () => {
    if (window.innerWidth < 600) return Math.min(window.innerWidth - 40, 300);
    if (window.innerWidth < 1024) return Math.min(window.innerWidth - 40, 400);
    return 300;
  };
  
  const [containerSize, setContainerSize] = useState(getContainerSize());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1400);
  
  useEffect(() => {
    const handleResize = () => {
      setContainerSize(getContainerSize());
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Use our specialized multi-circle metronome logic
  const logic = useMultiCircleMetronomeLogic({
    tempo,
    setTempo,
    subdivisions: circleSettings[playingCircle]?.subdivisions || 4,
    setSubdivisions: () => {},
    isPaused,
    setIsPaused,
    swing,
    volume,
    accents: circleSettings[playingCircle]?.accents || [3, 1, 1, 1],
    analogMode: false,
    gridMode: false,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    // Pass the current circle's beat mode
    beatMode: circleSettings[playingCircle]?.beatMode || "quarter",
    // Pass all circle settings for reference
    circleSettings,
    playingCircle,
    onCircleChange: setPlayingCircle
  });

  // Listen for beat-mode-change events
  useEffect(() => {
    const handleBeatModeChange = (event) => {
      const { beatMode, beatMultiplier } = event.detail;
      
      console.log(`[MultiCircleMetronome] Beat mode change event received: ${beatMode} (multiplier: ${beatMultiplier})`);
      
      // Update the active circle's beat mode
      setCircleSettings(prev => {
        const updated = [...prev];
        
        // Only update if the mode is actually changing
        if (updated[activeCircle]?.beatMode !== beatMode) {
          updated[activeCircle] = { ...updated[activeCircle], beatMode };
        }
        
        return updated;
      });
      
      // If the active circle is currently playing, update the logic
      if (activeCircle === playingCircle && logic && logic.updateBeatMultiplier) {
        console.log(`[MultiCircleMetronome] Updating beat multiplier to: ${beatMultiplier}`);
        
        // First stop the current scheduler if it's running
        if (!isPaused && logic.stopScheduler) {
          logic.stopScheduler();
        }
        
        // Update beat multiplier in the logic
        logic.updateBeatMultiplier(beatMultiplier);
        
        // If playing, immediately restart the scheduler with new timing
        if (!isPaused && logic.startScheduler) {
          // Short timeout to ensure state updates have propagated
          setTimeout(() => {
            logic.startScheduler();
          }, 20);
        }
      }
    };
    
    window.addEventListener('beat-mode-change', handleBeatModeChange);
    
    return () => {
      window.removeEventListener('beat-mode-change', handleBeatModeChange);
    };
  }, [activeCircle, playingCircle, logic, isPaused]);

  // Make silence phase ref globally available to metronome logic
  useEffect(() => {
    if (logic && logic.isSilencePhaseRef) {
      window.isSilencePhaseRef = logic.isSilencePhaseRef;
      
      // Also update our local refs
      localIsSilencePhaseRef.current = logic.isSilencePhaseRef.current;
      
      return () => {
        // Cleanup global refs when component unmounts
        if (window.isSilencePhaseRef === logic.isSilencePhaseRef) {
          delete window.isSilencePhaseRef;
        }
      };
    }
  }, [logic]);

  // Add a new effect to handle audio buffer reloading when soundSetReloadTrigger changes
  useEffect(() => {
    if (!logic || !logic.reloadSounds || !soundSetReloadTrigger) return;
    
    console.log("Reloading sound buffers due to soundSetReloadTrigger change");
    logic.reloadSounds()
      .then(success => {
        if (success) {
          console.log("Successfully reloaded sound buffers");
        } else {
          console.warn("Failed to reload sound buffers");
        }
      })
      .catch(err => {
        console.error("Error reloading sound buffers:", err);
      });
  }, [soundSetReloadTrigger, logic]);

  // Handle setting subdivisions (used by keyboard shortcuts)
  const handleSetSubdivisions = useCallback((subdivisionValue) => {
    if (subdivisionValue < 1 || subdivisionValue > 9) return;
    
    setCircleSettings(prev => {
      const updated = [...prev];
      updated[activeCircle] = {
        ...updated[activeCircle],
        subdivisions: subdivisionValue,
        // Create new accents array with first beat as 3 (emphasized)
        accents: Array.from({ length: subdivisionValue }, (_, i) => (i === 0 ? 3 : 1))
      };
      return updated;
    });
  }, [activeCircle]);

  // HOTFIX: Directly handle measure count updates for training mode
  useEffect(() => {
    if (!logic || isPaused) return;
    
    // Listen for "measure-start" events from beat visualization
    const handleMeasureStart = () => {
      if (isPaused) return;
      
      // Increment the measure counter
      localMeasureCountRef.current += 1;
      
      console.log(`[MultiCircle] [Training] Measure count: ${localMeasureCountRef.current}/${measuresUntilSpeedUp}, speedMode=${speedMode}`);
      
      // Macro Timing Mode - Handle silence phase
      if (macroMode === 1) {
        if (!localIsSilencePhaseRef.current) {
          // Check if we should enter silence phase
          if (localMeasureCountRef.current >= measuresUntilMute) {
            console.log(`[MultiCircle] [Training] 🔇 STARTING SILENCE PHASE 🔇`);
            localIsSilencePhaseRef.current = true;
            localMuteMeasureCountRef.current = 0;
            
            // Make sure the global silence reference is updated
            window.isSilencePhaseRef = localIsSilencePhaseRef;
            
            // Update the original refs if provided
            if (isSilencePhaseRef) isSilencePhaseRef.current = true;
            if (muteMeasureCountRef) muteMeasureCountRef.current = 0;
          }
        } else {
          // Already in silence phase, increment counter
          localMuteMeasureCountRef.current += 1;
          
          console.log(`[MultiCircle] [Training] Silence phase: ${localMuteMeasureCountRef.current}/${muteDurationMeasures}`);
          
          // Check if we should exit silence phase
          if (localMuteMeasureCountRef.current >= muteDurationMeasures) {
            console.log(`[MultiCircle] [Training] 🔊 ENDING SILENCE PHASE 🔊`);
            localIsSilencePhaseRef.current = false;
            localMuteMeasureCountRef.current = 0;
            localMeasureCountRef.current = 0; // Reset measure count after silence ends
            
            // Update refs and global reference
            window.isSilencePhaseRef = localIsSilencePhaseRef;
            if (isSilencePhaseRef) isSilencePhaseRef.current = false;
            if (muteMeasureCountRef) muteMeasureCountRef.current = 0;
            if (measureCountRef) measureCountRef.current = 0;
          }
        }
      }
      
      // Speed Training Mode - Handle auto tempo increase
      if (speedMode === 1 && !localIsSilencePhaseRef.current) {
        if (localMeasureCountRef.current >= measuresUntilSpeedUp) {
          // Calculate new tempo with percentage increase
          const factor = 1 + tempoIncreasePercent / 100;
          const newTempo = Math.min(Math.round(tempo * factor), 240);
          
          // Only increase if it would change by at least 1 BPM
          if (newTempo > tempo) {
            console.log(`[MultiCircle] ⏩ AUTO INCREASING TEMPO from ${tempo} to ${newTempo} BPM (${tempoIncreasePercent}%)`);
            
            // Set new tempo
            setTempo(newTempo);
            
            // Reset measure counter after tempo increase
            localMeasureCountRef.current = 0;
            if (measureCountRef) measureCountRef.current = 0;
          }
        }
      }
      
      // Dispatch event to update UI
      window.dispatchEvent(new CustomEvent('training-measure-update'));
    };
    
    // Custom event listener for the first beat of each circle
    const handleCircleStart = (e) => {
      // This is a circle change event, check if it's time to count a new measure
      const now = Date.now();
      
      // We only want to trigger measure-start on the first beat of each circle
      // and make sure we don't count measures too rapidly
      if (now - lastCircleChangeTimeRef.current > 500) {
        lastCircleChangeTimeRef.current = now;
        
        // Only on the first circle (index 0) do we count a measure
        // This ensures we count measures based on complete cycles through all circles
        if (e.detail && e.detail.circleIndex === 0) {
          handleMeasureStart();
        }
      }
    };
    
    // Set up a tick timer to update measure counts based on logic.currentSubdivision changes
    const tickTimer = setInterval(() => {
      if (logic.currentSubdivision === 0 && 
          playingCircle === 0 &&
          !isPaused) {
        // First subdivision of circle 0 - count as measure start  
        const now = Date.now();
        if (now - lastCircleChangeTimeRef.current > 500) {
          lastCircleChangeTimeRef.current = now;
          handleMeasureStart();
        }
      }
    }, 50);
    
    window.addEventListener('circle-changed', handleCircleStart);
    
    return () => {
      window.removeEventListener('circle-changed', handleCircleStart);
      clearInterval(tickTimer);
    };
  }, [
    logic, 
    isPaused, 
    macroMode, 
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    tempo,
    setTempo,
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    playingCircle
  ]);

  // Reset training references when starting/stopping
  useEffect(() => {
    if (isPaused) {
      // Do nothing when paused
    } else {
      // Reset counters when starting
      localMeasureCountRef.current = 0;
      localMuteMeasureCountRef.current = 0;
      localIsSilencePhaseRef.current = false;
      
      // Update original refs if available
      if (measureCountRef) measureCountRef.current = 0;
      if (muteMeasureCountRef) muteMeasureCountRef.current = 0;
      if (isSilencePhaseRef) isSilencePhaseRef.current = false;
      
      // Update global reference
      window.isSilencePhaseRef = localIsSilencePhaseRef;
      
      // Dispatch event to update UI
      window.dispatchEvent(new CustomEvent('training-measure-update'));
    }
  }, [isPaused, measureCountRef, muteMeasureCountRef, isSilencePhaseRef]);

  // Handle Play/Pause with proper state management
  const handlePlayPause = useCallback(() => {
    if (isProcessingPlayPauseRef.current) {
      console.log("Ignoring play/pause - already processing");
      return;
    }

    console.log("Play/Pause button clicked, current state:", isPaused ? "paused" : "playing");
    isProcessingPlayPauseRef.current = true;
    
    // Set a safety timeout to reset the flag
    setTimeout(() => {
      isProcessingPlayPauseRef.current = false;
    }, 500);

    if (isPaused) {
      // Starting playback
      console.log("Starting playback, resetting to circle 0");
      
      // Reset state for clean start
      setPlayingCircle(0);
      
      // Reset training counters
      localMeasureCountRef.current = 0;
      localMuteMeasureCountRef.current = 0;
      localIsSilencePhaseRef.current = false;
      
      // Update original refs if available
      if (measureCountRef) measureCountRef.current = 0;
      if (muteMeasureCountRef) muteMeasureCountRef.current = 0;
      if (isSilencePhaseRef) isSilencePhaseRef.current = false;
      
      // Update global reference
      window.isSilencePhaseRef = localIsSilencePhaseRef;
      
      if (logic && logic.audioCtx) {
        if (logic.audioCtx.state === "suspended") {
          logic.audioCtx.resume()
            .then(() => {
              console.log("AudioContext resumed");
              setIsPaused(false);
              
              // Use a small delay to ensure context is fully ready
              setTimeout(() => {
                if (logic.startScheduler) {
                  logic.startScheduler();
                }
                isProcessingPlayPauseRef.current = false;
              }, 50);
            })
            .catch(err => {
              console.error("Failed to resume AudioContext:", err);
              isProcessingPlayPauseRef.current = false;
            });
        } else {
          setIsPaused(false);
          // Use small delay for stability
          setTimeout(() => {
            if (logic.startScheduler) {
              logic.startScheduler();
            }
            isProcessingPlayPauseRef.current = false;
          }, 20);
        }
      } else {
        // No audio context yet, setIsPaused will trigger creation
        setIsPaused(false);
        isProcessingPlayPauseRef.current = false;
      }
    } else {
      // Stopping playback
      setIsPaused(true);
      if (logic && logic.stopScheduler) {
        logic.stopScheduler();
      }
      // Reset to first circle on pause
      setPlayingCircle(0);
      isProcessingPlayPauseRef.current = false;
    }
  }, [isPaused, setIsPaused, logic, setPlayingCircle, measureCountRef, muteMeasureCountRef, isSilencePhaseRef]);

  // Handle manual tempo acceleration
  const handleAccelerate = useCallback(() => {
    if (!props.isPaused && tempoIncreasePercent > 0) {
      manualTempoAcceleration({
        tempoIncreasePercent,
        tempoRef: { current: tempo },
        setTempo
      });
      
      // Reset measure counter after manual increase
      localMeasureCountRef.current = 0;
      if (measureCountRef) measureCountRef.current = 0;
      
      // Dispatch event to update UI
      window.dispatchEvent(new CustomEvent('training-measure-update'));
    }
  }, [props.isPaused, tempoIncreasePercent, tempo, setTempo, measureCountRef]);

  // Register callbacks with parent if provided
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
    if (registerTapTempo && logic && logic.tapTempo) {
      registerTapTempo(logic.tapTempo);
    }
    
    return () => {
      // Clean up callbacks when component unmounts
      if (registerTogglePlay) {
        registerTogglePlay(null);
      }
      if (registerTapTempo) {
        registerTapTempo(null);
      }
    };
  }, [handlePlayPause, logic, registerTogglePlay, registerTapTempo]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: () => {
      if (!isProcessingPlayPauseRef.current) {
        handlePlayPause();
      }
    },
    onTapTempo: logic?.tapTempo,
    onSetSubdivisions: handleSetSubdivisions
  });

  // Toggle functionality for the note selector - IMPROVED VERSION
  const handleNoteSelection = useCallback((mode) => {
    // Don't update if the mode isn't changing
    if (circleSettings[activeCircle]?.beatMode === mode) {
      console.log(`[MultiCircleMetronome] Note selection unchanged: ${mode}`);
      return;
    }
    
    console.log(`[MultiCircleMetronome] Note selection changed to: ${mode}`);
    
    // Update the active circle's beat mode
    setCircleSettings(prev => {
      const updated = [...prev];
      updated[activeCircle] = { ...updated[activeCircle], beatMode: mode };
      return updated;
    });
    
    // Calculate multiplier for the event
    const multiplier = mode === "quarter" ? 1 : 2;
    
    // Dispatch a custom event to notify of beat mode change
    const beatModeChangeEvent = new CustomEvent('beat-mode-change', {
      detail: { 
        beatMode: mode,
        beatMultiplier: multiplier
      }
    });
    window.dispatchEvent(beatModeChangeEvent);
    
    // If the active circle is currently playing, stop and restart the scheduler
    if (activeCircle === playingCircle && logic && !isPaused) {
      console.log(`[MultiCircleMetronome] Directly restarting scheduler for immediate beat mode change`);
      
      // Stop the scheduler
      if (logic.stopScheduler) {
        logic.stopScheduler();
      }
      
      // Update beat multiplier
      if (logic.updateBeatMultiplier) {
        logic.updateBeatMultiplier(multiplier);
      }
      
      // Restart the scheduler after a short delay to ensure settings are updated
      setTimeout(() => {
        if (logic.startScheduler) {
          logic.startScheduler();
        }
      }, 20);
    }
  }, [activeCircle, playingCircle, logic, isPaused, circleSettings]);

  // ADD CIRCLE FUNCTION
  const addCircle = useCallback(() => {
    setCircleSettings(prev => {
      if (!prev || prev.length >= MAX_CIRCLES) {
        return prev;
      }
      
      // Create a new circle with some variety compared to the last one
      const lastCircle = prev[prev.length - 1];
      const newSubdivisions = lastCircle.subdivisions === 4 ? 3 : 4;
      
      return [
        ...prev,
        {
          subdivisions: newSubdivisions,
          accents: Array.from({ length: newSubdivisions }, (_, i) => (i === 0 ? 3 : 1)),
          beatMode: lastCircle.beatMode === "quarter" ? "eighth" : "quarter"
        }
      ];
    });
  }, []);

  // REMOVE CIRCLE FUNCTION
  const removeCircle = useCallback((indexToRemove) => {
    if (!circleSettings || circleSettings.length <= 1) {
      return;
    }
    
    setCircleSettings(prev => prev.filter((_, idx) => idx !== indexToRemove));
    
    // If the playing circle is removed, set the playing circle to 0
    if (playingCircle === indexToRemove) {
      setPlayingCircle(0);
    } else if (playingCircle > indexToRemove) {
      // If a circle before the playing circle is removed, adjust the index
      setPlayingCircle(prev => prev - 1);
    }
    
    // If the active circle is removed, set it to 0
    if (activeCircle === indexToRemove) {
      setActiveCircle(0);
    } else if (activeCircle > indexToRemove) {
      setActiveCircle(prev => prev - 1);
    }
  }, [circleSettings, playingCircle, activeCircle]);

  // Update accent on beat click
  const updateAccent = useCallback((beatIndex, circleIndex) => {
    if (beatIndex === 'remove') {
      removeCircle(circleIndex);
      return;
    }
    
    setCircleSettings(prev => {
      if (!prev || !prev.length) return prev;
      const updated = [...prev];
      if (activeCircle >= updated.length) return prev;
      
      const circle = updated[activeCircle];
      if (!circle.accents || beatIndex >= circle.accents.length) return prev;
      
      const acc = [...circle.accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 4; // cycle 0→1→2→3→0
      
      // Force a deep copy to ensure React detects the change
      updated[activeCircle] = { 
        ...circle, 
        accents: [...acc] 
      };
      
      return updated;
    });
  }, [activeCircle, removeCircle]);

  // Dispatch an event when the playing circle changes
  useEffect(() => {
    // Dispatch an event for the circle change
    window.dispatchEvent(new CustomEvent('circle-changed', {
      detail: {
        circleIndex: playingCircle,
        isFirst: playingCircle === 0
      }
    }));
  }, [playingCircle]);

  return (
    <div style={{ textAlign: "center" }}>
      {/* Accelerate button for Training Mode */}
      <AccelerateButton 
        onClick={handleAccelerate} 
        speedMode={speedMode}
      />
      
      {/* Main circles container */}
      <div className="circles-container" style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "20px",
        width: "100%",
        flexWrap: "wrap"
      }}>
        {circleSettings.map((settings, idx) => (
          <CircleRenderer
            key={idx}
            settings={settings}
            idx={idx}
            isActiveUI={idx === activeCircle}
            isPlaying={idx === playingCircle && !isPaused}
            currentSubdivision={logic?.currentSubdivision || 0}
            isPaused={isPaused}
            audioCtxRunning={logic?.audioCtx && logic.audioCtx.state === "running"}
            isTransitioning={logic.isTransitioning && logic.isTransitioning()}
            updateAccent={updateAccent}
            radius={containerSize / 2}
            containerSize={containerSize}
            setActiveCircle={setActiveCircle}
            circleSettings={circleSettings}
            macroMode={macroMode}
            isSilencePhaseRef={localIsSilencePhaseRef}
            isMobile={isMobile}
          />
        ))}
        
        {circleSettings.length < MAX_CIRCLES && (
          <AddCircleButton
            addCircle={addCircle}
            containerSize={containerSize}
            isMobile={isMobile}
          />
        )}
      </div>
      
      {/* Play/Pause button */}
      <PlayButton handlePlayPause={handlePlayPause} isPaused={isPaused} />
      
      {/* Controls section */}
      <div className="controls-section" style={{ marginTop: "20px" }}>
        {/* Notes section */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3 className="section-title" style={{marginBottom: "10px"}}>
            Notes (Circle {activeCircle + 1})
          </h3>
          <NoteSelector 
            beatMode={currentSettings.beatMode}
            onSelect={handleNoteSelection}
          />
        </div>
        
        {/* Beats per Bar section */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3 className="section-title" style={{marginBottom: "10px"}}>
            Beats per Bar (Circle {activeCircle + 1})
          </h3>
          <SubdivisionSelector
            subdivisions={circleSettings[activeCircle].subdivisions}
            onSelect={handleSetSubdivisions}
          />
        </div>
        
        {/* Sliders section */}
        <div className="sliders-container">
              <label>
                Tempo: {tempo} BPM
                <input 
                  type="range" 
                  min={15} 
                  max={240} 
                  step={1} 
                  value={tempo} 
                  onChange={(e) => setTempo(Number(e.target.value))} 
                  className="tempo-slider"
                />
              </label>
              <label>
                Volume: {Math.round(volume * 100)}%
                <input 
                  type="range" 
                  min={0} 
                  max={1} 
                  step={0.01} 
                  value={volume} 
                  onChange={(e) => setVolume(Number(e.target.value))} 
                  className="volume-slider"
                />
              </label>
              {currentSettings.subdivisions % 2 === 0 && (
                <label>
                  Swing: {Math.round(swing * 200)}%
                  <input 
                    type="range" 
                    min={0} 
                    max={0.5} 
                    step={0.01} 
                    value={swing} 
                    onChange={(e) => setSwing(Number(e.target.value))} 
                    className="swing-slider"
                  />
                </label>
              )}
        </div>
      </div>
      
      {/* Tap tempo button for mobile */}
      {isMobile && logic?.tapTempo && (
        <button
          onClick={logic.tapTempo}
          style={{ 
            background: "transparent", 
            border: "none", 
            cursor: "pointer", 
            marginTop: "20px",
            padding: "10px",
            outline: "none"
          }}
          aria-label="Tap Tempo"
        >
          <img
            src={tapButtonIcon}
            alt="Tap Tempo"
            style={{
              height: "35px",
              objectFit: "contain",
              transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
            }}
          />
        </button>
      )}
    </div>
  );
}

// Use the regular withTrainingContainer so everything still works with the UI
export default withTrainingContainer(MultiCircleMetronome);