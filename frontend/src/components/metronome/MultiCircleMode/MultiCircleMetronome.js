import React, { useState, useEffect, useRef, useCallback } from "react";
import useMetronomeLogic from "../../../hooks/useMetronomeLogic";
import useKeyboardShortcuts from "../../../hooks/useKeyboardShortcuts";

// Import SVG assets (beat icons, control icons, etc.)
import firstBeat from "../../../assets/svg/firstBeat.svg";
import firstBeatActive from "../../../assets/svg/firstBeatActive.svg";
import normalBeat from "../../../assets/svg/normalBeat.svg";
import normalBeatActive from "../../../assets/svg/normalBeatActive.svg";
import accentedBeat from "../../../assets/svg/accentedBeat.svg";
import accentedBeatActive from "../../../assets/svg/accentedBeatActive.svg";
import tapButtonIcon from "../../../assets/svg/tap-button.svg";
import playIcon from "../../../assets/svg/play.svg";
import pauseIcon from "../../../assets/svg/pause.svg";
import quarterNotesActive from "../../../assets/svg/quarter_eight_notes/quarterNotesActive.svg";
import quarterNotesInactive from "../../../assets/svg/quarter_eight_notes/quarterNotesInactive.svg";
import eightNotesActive from "../../../assets/svg/quarter_eight_notes/eightNotesActive.svg";
import eightNotesInactive from "../../../assets/svg/quarter_eight_notes/eightNotesInactive.svg";

// Import subdivision icons
import { subdivisionIcons } from "../../../assets/svg/subdivisionIcons";

// Initialize global silence check function
window.isSilent = function() {
  return window.isSilencePhaseRef && window.isSilencePhaseRef.current === true;
};

// Maximum number of circles
const MAX_CIRCLES = 3;

export default function MultiCircleMetronome(props) {
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
    analogMode = false,
    registerTogglePlay,
    registerTapTempo,
    // Training mode parameters
    macroMode = 0,
    speedMode = 0,
    measuresUntilMute = 2,
    muteDurationMeasures = 1,
    muteProbability = 0.3,
    tempoIncreasePercent = 5,
    measuresUntilSpeedUp = 2
  } = props;

  // State for circle settings
  const [circleSettings, setCircleSettings] = useState([
    {
      subdivisions: 4,
      accents: [3, 1, 1, 1],
      beatMode: "quarter"
    }
  ]);
  
  // Track which circle is active in the UI (for editing)
  const [activeCircle, setActiveCircle] = useState(0);
  
  // Track which circle is currently playing (will advance sequentially)
  const [playingCircle, setPlayingCircle] = useState(0);
  
  // Get current active settings
  const currentSettings = circleSettings[activeCircle] || { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" };
  
  // State tracking references
  const isTransitioningRef = useRef(false);
  const lastCircleSwitchCheckTimeRef = useRef(0);
  const measureCountRef = useRef(0);
  const isProcessingPlayPauseRef = useRef(false);
  
  // Training-specific references
  const isSilencePhaseRef = useRef(false);
  const muteMeasureCountRef = useRef(0);
  const lastTempoIncreaseRef = useRef(0);
  
  // Make silence phase ref globally available to metronome logic
  useEffect(() => {
    window.isSilencePhaseRef = isSilencePhaseRef;
    
    return () => {
      // Cleanup global refs when component unmounts
      delete window.isSilencePhaseRef;
    };
  }, []);
  
  // Create ref for playing settings (includes training settings)
  const playingSettingsRef = useRef({
    ...circleSettings[playingCircle],
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp
  });
  
  // Update the playing settings ref whenever relevant props change
  useEffect(() => {
    playingSettingsRef.current = {
      ...circleSettings[playingCircle],
      macroMode,
      speedMode,
      measuresUntilMute,
      muteDurationMeasures,
      muteProbability,
      tempoIncreasePercent,
      measuresUntilSpeedUp
    };
    console.log("Updated playing settings, beat mode:", playingSettingsRef.current.beatMode);
  }, [
    playingCircle, 
    circleSettings, 
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp
  ]);
  
  // Create metronome logic with current playing settings
  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions: playingSettingsRef.current.subdivisions,
    setSubdivisions: () => {},
    isPaused,
    setIsPaused,
    swing,
    volume,
    accents: playingSettingsRef.current.accents,
    analogMode,
    gridMode: false,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    beatMultiplier: playingSettingsRef.current.beatMode === "quarter" ? 1 : 2,
    multiCircleMode: true
  });

  // Container size calculation
  const getContainerSize = () => {
    if (window.innerWidth < 600) return Math.min(window.innerWidth - 40, 300);
    if (window.innerWidth < 1024) return Math.min(window.innerWidth - 40, 400);
    return 300;
  };
  
  const [containerSize, setContainerSize] = useState(getContainerSize());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setContainerSize(getContainerSize());
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const radius = containerSize / 2;
  
  // Handle setting subdivisions (used by keyboard shortcuts)
  const handleSetSubdivisions = useCallback((subdivisionValue) => {
    if (subdivisionValue < 1 || subdivisionValue > 9) return;
    
    setCircleSettings(prev => {
      const updated = [...prev];
      updated[activeCircle] = {
        ...updated[activeCircle],
        subdivisions: subdivisionValue,
        accents: Array.from({ length: subdivisionValue }, (_, i) => (i === 0 ? 3 : 1))
      };
      return updated;
    });
  }, [activeCircle]);
  
  // TRAINING MODE FUNCTIONS
  
  // Handle macro-timing silence phase
  const handleMacroTimingUpdate = useCallback(() => {
    if (macroMode === 1) {
      if (!isSilencePhaseRef.current) {
        // Not in silence phase, check if we should start one
        if (measureCountRef.current >= measuresUntilMute) {
          console.log(`[Training] 🔇 STARTING SILENCE PHASE 🔇 (after ${measureCountRef.current} measures)`);
          isSilencePhaseRef.current = true;
          window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
          muteMeasureCountRef.current = 0;
          // Don't reset measure count here
        }
      } else {
        // In silence phase, check if we should end it
        muteMeasureCountRef.current += 1;
        console.log(`[Training] Silence phase: ${muteMeasureCountRef.current}/${muteDurationMeasures}`);
        
        if (muteMeasureCountRef.current >= muteDurationMeasures) {
          console.log("[Training] 🔊 ENDING SILENCE PHASE 🔊");
          isSilencePhaseRef.current = false;
          window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
          muteMeasureCountRef.current = 0;
          measureCountRef.current = 0; // Only reset measure count AFTER silence ends
        }
      }
    } else if (isSilencePhaseRef.current) {
      // If macro mode is turned off but we're still in silence phase, exit it
      console.log("[Training] Macro mode disabled - ending silence phase");
      isSilencePhaseRef.current = false;
      window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
      muteMeasureCountRef.current = 0;
    }
  }, [macroMode, measuresUntilMute, muteDurationMeasures]);
  
  // Handle speed training tempo increase
  const handleSpeedTrainingUpdate = useCallback(() => {
    if (speedMode === 1) {
      if (measureCountRef.current >= measuresUntilSpeedUp) {
        const factor = 1 + tempoIncreasePercent / 100;
        const newTempo = Math.min(Math.round(tempo * factor), 240);
        console.log(`[Training] Increasing tempo from ${tempo} to ${newTempo}`);
        setTempo(newTempo);
        lastTempoIncreaseRef.current = Date.now();
        measureCountRef.current = 0;
      }
    }
  }, [speedMode, measuresUntilSpeedUp, tempoIncreasePercent, tempo, setTempo]);

  // ADD CIRCLE FUNCTION
  const addCircle = () => {
    setCircleSettings(prev => {
      if (prev.length >= MAX_CIRCLES) {
        return prev;
      }
      return [
        ...prev,
        {
          subdivisions: 4,
          accents: Array.from({ length: 4 }, (_, i) => (i === 0 ? 3 : 1)),
          beatMode: "quarter"
        }
      ];
    });
  };

  // REMOVE CIRCLE FUNCTION
  const removeCircle = (indexToRemove) => {
    if (circleSettings.length <= 1) {
      return;
    }
    
    setCircleSettings(prev => prev.filter((_, idx) => idx !== indexToRemove));
    
    // If the active circle is removed, set the active circle to 0
    if (activeCircle === indexToRemove) {
      setActiveCircle(0);
    } else if (activeCircle > indexToRemove) {
      // If a circle before the active circle is removed, adjust the index
      setActiveCircle(activeCircle - 1);
    }
    
    // If the playing circle is removed, set the playing circle to 0
    if (playingCircle === indexToRemove) {
      setPlayingCircle(0);
    } else if (playingCircle > indexToRemove) {
      // If a circle before the playing circle is removed, adjust the index
      setPlayingCircle(playingCircle - 1);
    }
  };

  // Update accent on beat click
  const updateAccent = (beatIndex) => {
    setCircleSettings(prev => {
      const updated = [...prev];
      const acc = [...updated[activeCircle].accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...updated[activeCircle], accents: acc };
      return updated;
    });
  };

  // Handle subdivision changes and circle switching
  const prevSubdivisionRef = useRef(null);
  
  const handleSubdivisionChange = useCallback((newSubdivision) => {
    if (isPaused || circleSettings.length <= 1) return;
    
    // Only detect end of measure when current subdivision is 0 and previous wasn't
    if (
      prevSubdivisionRef.current !== null &&
      prevSubdivisionRef.current !== newSubdivision &&
      newSubdivision === 0 &&
      !isTransitioningRef.current
    ) {
      // Update measure counter
      const newMeasureCount = measureCountRef.current + 1;
      measureCountRef.current = newMeasureCount;
      console.log(`[Multi-Circle] End of measure detected. Global count: ${newMeasureCount}/${measuresUntilMute}`);
      
      // TRAINING MODE LOGIC - Completely separate from circle switching
      if (macroMode === 1) {
        if (!isSilencePhaseRef.current) {
          // Check if we should enter silence phase
          if (newMeasureCount >= measuresUntilMute) {
            console.log(`[Training] 🔇 STARTING SILENCE PHASE 🔇 (after ${newMeasureCount} measures)`);
            isSilencePhaseRef.current = true; 
            window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
            muteMeasureCountRef.current = 0;
            // Keep measure count for reference
          }
        } else {
          // Already in silence phase, increment counter
          const newMuteCount = muteMeasureCountRef.current + 1;
          muteMeasureCountRef.current = newMuteCount;
          console.log(`[Training] Silence phase: ${newMuteCount}/${muteDurationMeasures}`);
          
          // Check if we should exit silence phase
          if (newMuteCount >= muteDurationMeasures) {
            console.log("[Training] 🔊 ENDING SILENCE PHASE 🔊");
            isSilencePhaseRef.current = false;
            window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
            muteMeasureCountRef.current = 0;
            measureCountRef.current = 0; // Only reset measure count AFTER silence ends
          }
        }
      }
      
      // SPEED TRAINING LOGIC
      if (speedMode === 1 && !isSilencePhaseRef.current) {
        if (newMeasureCount >= measuresUntilSpeedUp) {
          const factor = 1 + tempoIncreasePercent / 100;
          const newTempo = Math.min(Math.round(tempo * factor), 240);
          console.log(`[Training] ⏩ INCREASING TEMPO from ${tempo} to ${newTempo} BPM`);
          setTempo(newTempo);
          measureCountRef.current = 0; // Reset measure count after tempo increase
        }
      }
      
      // CIRCLE SWITCHING LOGIC - Independent of training mode
      const now = Date.now();
      if (now - lastCircleSwitchCheckTimeRef.current < 500) return;
      lastCircleSwitchCheckTimeRef.current = now;
      
      // Begin transition between circles
      isTransitioningRef.current = true;
      const nextCircleIndex = (playingCircle + 1) % circleSettings.length;
      console.log(`[Multi-Circle] Switching from circle ${playingCircle} to ${nextCircleIndex}`);
      
      // Make sure silence phase is consistent
      if (isSilencePhaseRef.current) {
        console.log("[Multi-Circle] Transferring silence phase to next circle");
        // Ensure global reference is updated
        window.isSilencePhaseRef = isSilencePhaseRef;
      }
      
      // Store the current and next beat modes
      const currentBeatMode = playingSettingsRef.current.beatMode;
      const nextBeatMode = circleSettings[nextCircleIndex].beatMode;
      console.log(`[Multi-Circle] Transitioning from ${currentBeatMode} to ${nextBeatMode} mode`);
      
      // Update the playing settings
      playingSettingsRef.current = {
        ...circleSettings[nextCircleIndex],
        macroMode,
        speedMode,
        measuresUntilMute,
        muteDurationMeasures,
        muteProbability,
        tempoIncreasePercent,
        measuresUntilSpeedUp,
      };
      
      // First stop the current scheduler
      logic.stopScheduler();
      
      // Update the playing circle
      setPlayingCircle(nextCircleIndex);
      
      // Use a minimal delay for the audio transition to avoid double beats
      if (!isPaused && logic.audioCtx) {
        const currentTime = logic.audioCtx.currentTime;
        const secondsPerBeat = 60 / (tempo * (nextBeatMode === "eighth" ? 2 : 1));
        
        setTimeout(() => {
          if (!isPaused && !isTransitioningRef.current) {
            try {
              // Start at precisely the next beat time
              logic.startScheduler(currentTime + secondsPerBeat);
              console.log(`[Multi-Circle] Started next circle rhythm at time ${currentTime + secondsPerBeat}`);
            } catch (err) {
              console.error("Error starting next circle:", err);
            }
          }
        }, 20);
      }
      
      // Clear transition flag with delay
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
    }
    
    prevSubdivisionRef.current = newSubdivision;
  }, [
    isPaused, 
    circleSettings, 
    playingCircle,
    logic,
    tempo,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    setTempo
  ]);
  
  useEffect(() => {
    if (!isPaused && logic.currentSubdivision !== undefined) {
      handleSubdivisionChange(logic.currentSubdivision);
    }
  }, [logic.currentSubdivision, handleSubdivisionChange, isPaused]);

  // Handle Play/Pause
  const handlePlayPause = useCallback(() => {
    if (isProcessingPlayPauseRef.current) {
      return;
    }
    
    // Set a timeout to reset the lock in case something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (isProcessingPlayPauseRef.current) {
        isProcessingPlayPauseRef.current = false;
      }
    }, 2000);
    
    isProcessingPlayPauseRef.current = true;
    
    setIsPaused(prev => {
      if (prev) {
        // Starting playback
        setPlayingCircle(0);
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        measureCountRef.current = 0;
        lastCircleSwitchCheckTimeRef.current = 0;
        
        // Reset training mode counters
        const wasInSilence = isSilencePhaseRef.current;
        isSilencePhaseRef.current = false;
        window.isSilencePhaseRef = isSilencePhaseRef; // Update global reference
        muteMeasureCountRef.current = 0;
        lastTempoIncreaseRef.current = 0;
        console.log(`[Training] Reset all training counters on play. Was in silence: ${wasInSilence}`);
        
        // Update playing settings with both circle and training settings
        playingSettingsRef.current = {
          ...circleSettings[0],
          macroMode,
          speedMode,
          measuresUntilMute,
          muteDurationMeasures,
          muteProbability,
          tempoIncreasePercent,
          measuresUntilSpeedUp
        };
        
        const startPlayback = () => {
          if (logic.currentSubStartRef) {
            logic.currentSubStartRef.current = 0;
          }
          logic.startScheduler();
          isProcessingPlayPauseRef.current = false;
          clearTimeout(safetyTimeout);
        };
        
        // Make sure the AudioContext is available
        if (!logic.audioCtx) {
          startPlayback();
        } else if (logic.audioCtx.state === "suspended") {
          logic.audioCtx
            .resume()
            .then(() => {
              startPlayback();
            })
            .catch(err => {
              console.error("Error resuming AudioContext:", err);
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout);
            });
        } else {
          startPlayback();
        }
        return false;
      } else {
        // Stopping playback
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        logic.stopScheduler();
        
        if (logic.audioCtx && logic.audioCtx.state === "running") {
          logic.audioCtx
            .suspend()
            .then(() => {
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout);
            })
            .catch(err => {
              console.error("Error suspending AudioContext:", err);
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout);
            });
        } else {
          isProcessingPlayPauseRef.current = false;
          clearTimeout(safetyTimeout);
        }
        setPlayingCircle(0);
        return true;
      }
    });
  }, [
    logic, 
    setIsPaused, 
    circleSettings, 
    isPaused,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp
  ]);

  // Register callbacks with parent if provided
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
    if (registerTapTempo && logic.tapTempo) {
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
  }, [handlePlayPause, logic.tapTempo, registerTogglePlay, registerTapTempo]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: () => {
      if (!isProcessingPlayPauseRef.current) {
        handlePlayPause();
      }
    },
    onTapTempo: logic.tapTempo,
    onSetSubdivisions: handleSetSubdivisions
  });

  // Render a single circle with beats
  const renderCircle = (settings, idx, isActiveUI, isPlaying) => {
    const iconSize = 24;
    const beats = Array.from({ length: settings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      
      const isActive = i === logic.currentSubdivision &&
                        isPlaying &&
                        !isPaused &&
                        logic.audioCtx &&
                        logic.audioCtx.state === "running" &&
                        !isTransitioningRef.current;
      
      let icon;
      if (i === 0) {
        icon = isActive ? firstBeatActive : firstBeat;
      } else {
        const accent = settings.accents[i] || 1;
        icon = accent === 2
          ? isActive ? accentedBeatActive : accentedBeat
          : isActive ? normalBeatActive : normalBeat;
      }
      
      return (
        <img
          key={i}
          src={icon}
          alt={`Beat ${i}`}
          onClick={() => { if (isActiveUI && i !== 0) updateAccent(i); }}
          style={{
            position: "absolute",
            left: `calc(50% + ${xPos}px - ${iconSize / 2}px)`,
            top: `calc(50% + ${yPos}px - ${iconSize / 2}px)`,
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            cursor: isActiveUI && i !== 0 ? "pointer" : "default",
            filter: isActive ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))" : "none",
            transition: "filter 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
          }}
        />
      );
    });
    
    // Add a remove button if there's more than one circle
    if (circleSettings.length > 1) {
      const removeButton = (
        <div
          key="remove-button"
          onClick={(e) => {
            e.stopPropagation();
            removeCircle(idx);
          }}
          style={{
            position: "absolute",
            top: "-15px",
            right: "-15px",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "#ff4d4d",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 0 5px rgba(0, 0, 0, 0.3)",
            zIndex: 10
          }}
        >
          -
        </div>
      );
      
      return [removeButton, ...beats];
    }
    
    return beats;
  };

  // Render all circles
  const renderAllCircles = () => {
    return circleSettings.map((settings, idx) => {
      const isActiveUI = idx === activeCircle;
      const isPlaying = idx === playingCircle && !isPaused;
      
      // Add visual indicators for macro-timing training
      let activeBoxShadow = isActiveUI
        ? "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)"
        : isPlaying
          ? "0 0 0 3px #FFD700, 0 0 10px rgba(255, 215, 0, 0.6)"
          : "none";
      
      // Add visual indicator for silence phase
      if (isPlaying && macroMode !== 0 && isSilencePhaseRef.current) {
        activeBoxShadow = "0 0 0 3px #ff5722, 0 0 10px rgba(255, 87, 34, 0.6)";
      }
      
      return (
        <div
          key={idx}
          onClick={() => setActiveCircle(idx)}
          style={{
            position: "relative",
            width: containerSize,
            height: containerSize,
            borderRadius: "50%",
            border: "2px solid transparent",
            boxShadow: activeBoxShadow,
            margin: isMobile ? "15px 0" : "15px",
            transition: "box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
            cursor: "pointer",
            overflow: "visible"
          }}
        >
          {renderCircle(settings, idx, isActiveUI, isPlaying)}
        </div>
      );
    });
  };

  // Render "Add Circle" button
  const renderAddCircleButton = () => {
    if (circleSettings.length >= MAX_CIRCLES) return null;
    return (
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
  };

  // Render note selector (quarter/eighth)
  const renderNotesSelector = () => {
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "10px 0" }}>
        <button
          onClick={() => {
            setCircleSettings(prev => {
              const updated = [...prev];
              updated[activeCircle] = { ...updated[activeCircle], beatMode: "quarter" };
              return updated;
            });
          }}
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <img
            src={currentSettings.beatMode === "quarter" ? quarterNotesActive : quarterNotesInactive}
            alt="Quarter Notes"
            style={{
              width: "50px",
              height: "50px",
              opacity: currentSettings.beatMode === "quarter" ? 1 : 0.5,
              transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
              filter: currentSettings.beatMode === "quarter" ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none",
              transform: currentSettings.beatMode === "quarter" ? "scale(1.05)" : "scale(1)"
            }}
          />
        </button>
        <button
          onClick={() => {
            setCircleSettings(prev => {
              const updated = [...prev];
              updated[activeCircle] = { ...updated[activeCircle], beatMode: "eighth" };
              return updated;
            });
          }}
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <img
            src={currentSettings.beatMode === "eighth" ? eightNotesActive : eightNotesInactive}
            alt="Eighth Notes"
            style={{
              width: "50px",
              height: "50px",
              opacity: currentSettings.beatMode === "eighth" ? 1 : 0.5,
              transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
              filter: currentSettings.beatMode === "eighth" ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none",
              transform: currentSettings.beatMode === "eighth" ? "scale(1.05)" : "scale(1)"
            }}
          />
        </button>
      </div>
    );
  };

  // Render subdivision selector
  const renderSubdivisionSelector = () => {
    return (
      <div className="subdivision-container" style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", margin: "10px 0" }}>
        {Array.from({ length: 9 }, (_, idx) => {
          const subVal = idx + 1;
          const isActive = subVal === currentSettings.subdivisions;
          const icon = isActive 
            ? subdivisionIcons[`subdivision${subVal}Active`] 
            : subdivisionIcons[`subdivision${subVal}`];
          
          return (
            <img
              key={subVal}
              src={icon}
              alt={`Subdivision ${subVal}`}
              onClick={() => handleSetSubdivisions(subVal)}
              className="subdivision-button"
              style={{
                cursor: "pointer",
                width: "36px",
                height: "36px",
                margin: "0 3px",
                transition: "transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                filter: isActive ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none"
              }}
            />
          );
        })}
      </div>
    );
  };

  // Render the training mode status indicator with diagnostics
  const renderTrainingStatus = () => {
    if (macroMode === 0 && speedMode === 0) return null;
    
    return (
      <div style={{
        marginTop: '10px',
        padding: '8px',
        borderRadius: '5px',
        backgroundColor: '#f8f8f8',
        border: '1px solid #ddd',
        maxWidth: '300px',
        margin: '10px auto'
      }}>
        <h4 style={{margin: '0 0 8px 0', color: '#00A0A0'}}>Training Active</h4>
        {macroMode !== 0 && (
          <div style={{marginBottom: '5px', fontSize: '14px'}}>
            Macro-Timing: {macroMode === 1 ? 'Fixed Silence' : 'Random Silence'}
            {isSilencePhaseRef.current && 
              <span style={{color: '#f44336', fontWeight: 'bold'}}> (Silent)</span>
            }
          </div>
        )}
        {speedMode !== 0 && (
          <div style={{fontSize: '14px'}}>
            Speed Training: Auto Increase
          </div>
        )}
        
        {/* Diagnostic counters */}
        <div style={{fontSize: '14px', color: '#666', marginTop: '5px'}}>
          Measures: {measureCountRef.current}/{measuresUntilMute}
          {isSilencePhaseRef.current && ` | Silence: ${muteMeasureCountRef.current}/${muteDurationMeasures}`}
        </div>
      </div>
    );
  };

  return (
    <div style={{ textAlign: "center" }}>
      {/* Training status indicator */}
      {renderTrainingStatus()}
      
      {/* Main circles container */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "20px",
        width: "100%",
        flexWrap: "wrap"
      }}>
        {renderAllCircles()}
        {renderAddCircleButton()}
      </div>
      
      {/* Play/Pause button */}
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
        <button
          className="play-pause-button"
          type="button"
          onClick={handlePlayPause}
          onKeyDown={e => { e.stopPropagation(); e.preventDefault(); }}
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
      
      {/* Controls section with consistent styling */}
      <div style={{ marginTop: "20px" }}>
        {/* Notes section */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3>Notes (Circle {activeCircle + 1})</h3>
          {renderNotesSelector()}
        </div>
        
        {/* Subdivision section */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3>Subdivision (Circle {activeCircle + 1})</h3>
          {renderSubdivisionSelector()}
        </div>
        
        {/* Sliders section with consistent styling */}
        <div className="sliders-container" style={{ marginTop: "20px", width: "100%", maxWidth: "300px", margin: "0 auto" }}>
          {/* Tempo slider FIRST */}
          <div className="slider-item tempo-slider" style={{ marginBottom: "15px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
            <label>Tempo: {tempo} BPM</label>
            <input
              type="range"
              min={15}
              max={240}
              step={1}
              value={tempo}
              onChange={e => setTempo(parseFloat(e.target.value))}
              style={{ width: "100%", display: "block", margin: "5px auto" }}
            />
          </div>
          
          {/* Volume slider SECOND */}
          <div className="slider-item" style={{ marginBottom: "15px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
            <label>Volume: {Math.round(volume * 100)}%</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              style={{ width: "100%", display: "block", margin: "5px auto" }}
            />
          </div>
          
          {/* Swing slider LAST - only shown when conditions are met */}
          {currentSettings.subdivisions % 2 === 0 && (
            <div className="slider-item" style={{ marginBottom: "15px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
              <label>Swing: {Math.round(swing * 200)}%</label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={swing}
                onChange={e => setSwing(parseFloat(e.target.value))}
                style={{ width: "100%", display: "block", margin: "5px auto" }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Tap tempo button for mobile */}
      {isMobile && (
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