// File: src/components/MultiCircleMetronome.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import useMetronomeLogic from "../hooks/useMetronomeLogic";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

// Beat icons
import firstBeat from "../assets/svg/firstBeat.svg";
import firstBeatActive from "../assets/svg/firstBeatActive.svg";
import normalBeat from "../assets/svg/normalBeat.svg";
import normalBeatActive from "../assets/svg/normalBeatActive.svg";
import accentedBeat from "../assets/svg/accentedBeat.svg";
import accentedBeatActive from "../assets/svg/accentedBeatActive.svg";

// Control icons
import tapButtonIcon from "../assets/svg/tap-button.svg";
import playIcon from "../assets/svg/play.svg";
import pauseIcon from "../assets/svg/pause.svg";

// Subdivision icons (inactive)
import subdivision1 from "../assets/svg/subdivision-1.svg";
import subdivision2 from "../assets/svg/subdivision-2.svg";
import subdivision3 from "../assets/svg/subdivision-3.svg";
import subdivision4 from "../assets/svg/subdivision-4.svg";
import subdivision5 from "../assets/svg/subdivision-5.svg";
import subdivision6 from "../assets/svg/subdivision-6.svg";
import subdivision7 from "../assets/svg/subdivision-7.svg";
import subdivision8 from "../assets/svg/subdivision-8.svg";
import subdivision9 from "../assets/svg/subdivision-9.svg";

// Subdivision icons (active)
import subdivision1Active from "../assets/svg/subdivision-1Active.svg";
import subdivision2Active from "../assets/svg/subdivision-2Active.svg";
import subdivision3Active from "../assets/svg/subdivision-3-Active.svg";
import subdivision4Active from "../assets/svg/subdivision-4Active.svg";
import subdivision5Active from "../assets/svg/subdivision-5Active.svg";
import subdivision6Active from "../assets/svg/subdivision-6Active.svg";
import subdivision7Active from "../assets/svg/subdivision-7Active.svg";
import subdivision8Active from "../assets/svg/subdivision-8Active.svg";
import subdivision9Active from "../assets/svg/subdivision-9Active.svg";

// Hard limit of 3 circles maximum
const MAX_CIRCLES = 3;

export default function MultiCircleMetronome(props) {
  // State for circle settings and active circles
  const [circleSettings, setCircleSettings] = useState([
    {
      subdivisions: props.subdivisions || 4,
      accents: Array.from({ length: props.subdivisions || 4 }, (_, i) =>
        i === 0 ? 3 : 1
      ),
      beatMode: "quarter"
    }
  ]);
  
  // Track which circle is active in the UI (for editing)
  const [activeCircle, setActiveCircle] = useState(0);
  
  // Track which circle is currently playing (will advance sequentially)
  const [playingCircle, setPlayingCircle] = useState(0);
  
  // Store a stable reference to current active circle settings
  const currentSettings = circleSettings[activeCircle] || 
    { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" };
    
  // Important: Keep a stable reference to the currently PLAYING circle's settings
  const playingSettingsRef = useRef(circleSettings[playingCircle]);
  
  // Update the playing settings reference when playingCircle changes
  useEffect(() => {
    playingSettingsRef.current = circleSettings[playingCircle];
  }, [playingCircle, circleSettings]);
  
  // Flags for state tracking
  const isTransitioningRef = useRef(false);
  const preventDuplicateFirstBeatRef = useRef(false);
  const lastCircleSwitchCheckTimeRef = useRef(0);
  const measureCountRef = useRef(0);
  const isProcessingPlayPauseRef = useRef(false);
  
  // Create metronome logic using the stable reference to playing settings
  const logic = useMetronomeLogic({
    tempo: props.tempo,
    setTempo: props.setTempo,
    subdivisions: playingSettingsRef.current.subdivisions,
    setSubdivisions: () => {}, // Intentionally empty - we handle subdivisions ourselves
    isPaused: props.isPaused,
    setIsPaused: props.setIsPaused,
    swing: props.swing,
    volume: props.volume,
    accents: playingSettingsRef.current.accents,
    analogMode: props.analogMode,
    gridMode: props.gridMode,
    macroMode: props.macroMode,
    speedMode: props.speedMode,
    measuresUntilMute: props.measuresUntilMute,
    muteDurationMeasures: props.muteDurationMeasures,
    muteProbability: props.muteProbability,
    tempoIncreasePercent: props.tempoIncreasePercent,
    measuresUntilSpeedUp: props.measuresUntilSpeedUp,
    beatMultiplier: playingSettingsRef.current.beatMode === "quarter" ? 1 : 2,
    multiCircleMode: true // Flag to indicate we're in multi circle mode
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
  
  // ADD CIRCLE FUNCTION - Strict enforcement of 3 circle maximum
  const addCircle = () => {
    setCircleSettings(prev => {
      // IMPORTANT: Only add if we're below the max limit
      if (prev.length >= MAX_CIRCLES) {
        return prev; // Do not add, return unchanged
      }
      
      return [
        ...prev,
        {
          subdivisions: props.subdivisions || 4,
          accents: Array.from({ length: props.subdivisions || 4 }, (_, i) => (i === 0 ? 3 : 1)),
          beatMode: "quarter"
        }
      ];
    });
  };

  // Update accent on beat click
  const updateAccent = (beatIndex) => {
    setCircleSettings((prev) => {
      const updated = [...prev];
      const acc = [...updated[activeCircle].accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...updated[activeCircle], accents: acc };
      return updated;
    });
  };

  // Custom function to handle subdivision changes and circle switching
  const prevSubdivisionRef = useRef(null);
  
  const handleSubdivisionChange = useCallback((newSubdivision) => {
    // Only proceed if we're playing and have multiple circles
    if (props.isPaused || circleSettings.length <= 1) return;
    
    // Check if we've completed a measure (subdivision went back to 0)
    if (
      prevSubdivisionRef.current !== null &&
      prevSubdivisionRef.current !== newSubdivision &&
      newSubdivision === 0 &&
      !isTransitioningRef.current // Don't switch if we're already transitioning
    ) {
      // Increment measure count
      measureCountRef.current += 1;
      
      // Get current time to prevent rapid checks
      const now = Date.now();
      
      // Ensure we don't check too frequently (at least 500ms between checks)
      if (now - lastCircleSwitchCheckTimeRef.current < 500) {
        return;
      }
      
      lastCircleSwitchCheckTimeRef.current = now;
      
      // Set transition flag to prevent multiple transitions
      isTransitioningRef.current = true;
      
      // Move to the next circle
      const nextCircleIndex = (playingCircle + 1) % circleSettings.length;
      
      // Update the playing settings reference
      playingSettingsRef.current = circleSettings[nextCircleIndex];
      
      // Update the playing circle state
      setPlayingCircle(nextCircleIndex);
      
      // Clear transition flag after a delay
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
    }
    
    // Update the previous subdivision reference
    prevSubdivisionRef.current = newSubdivision;
  }, [props.isPaused, circleSettings, playingCircle]);
  
  // Use a direct subscription to subdivision changes
  useEffect(() => {
    // Only set up the handler if we're not paused
    if (!props.isPaused && logic.currentSubdivision !== undefined) {
      // Call the handler directly when the subdivision changes
      handleSubdivisionChange(logic.currentSubdivision);
    }
  }, [logic.currentSubdivision, handleSubdivisionChange, props.isPaused, logic]);

  // Render a single circle with beats
  const renderCircle = (settings, idx, isActiveUI, isPlaying) => {
    const iconSize = 24;
    const beats = Array.from({ length: settings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      
      const isActive = i === logic.currentSubdivision && 
                        isPlaying && 
                        !props.isPaused && 
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
    
    return beats;
  };

  // Render all circles in a VERTICAL LAYOUT
  const renderAllCircles = () => {
    return circleSettings.map((settings, idx) => {
      const isActiveUI = idx === activeCircle;
      const isPlaying = idx === playingCircle && !props.isPaused;
      
      return (
        <div
          key={idx}
          onClick={() => setActiveCircle(idx)}
          style={{
            position: "relative",
            width: containerSize,
            height: containerSize,
            borderRadius: "50%", // Make sure circle is perfectly round
            border: "2px solid transparent",
            boxShadow: isActiveUI
              ? "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)"
              : isPlaying
                ? "0 0 0 3px #FFD700, 0 0 10px rgba(255, 215, 0, 0.6)"
                : "none",
            margin: "15px 0", // Vertical spacing between circles
            transition: "box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
            cursor: "pointer",
            overflow: "visible", // Allow beat icons to extend beyond circle if needed
          }}
        >
          {renderCircle(settings, idx, isActiveUI, isPlaying)}
        </div>
      );
    });
  };

  // Render the add circle button in the middle of a circle
  const renderAddCircleButton = () => {
    // IMPORTANT: Only show if under the max limit
    if (circleSettings.length >= MAX_CIRCLES) {
      return null; // Don't render anything if we hit the max
    }
    
    return (
      <div
        onClick={addCircle}
        style={{
          position: "relative",
          width: containerSize,
          height: containerSize,
          borderRadius: "50%", // Perfectly round circle
          border: "2px dashed #00A0A0",
          margin: "15px 0", // Vertical spacing
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
            borderRadius: "50%", // Perfectly round inner circle
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

  // Render subdivision selector buttons
  const renderSubdivisionButtons = () => {
    const subIcons = [
      subdivision1, subdivision2, subdivision3, 
      subdivision4, subdivision5, subdivision6, 
      subdivision7, subdivision8, subdivision9
    ];
    
    const subIconsActive = [
      subdivision1Active, subdivision2Active, subdivision3Active,
      subdivision4Active, subdivision5Active, subdivision6Active,
      subdivision7Active, subdivision8Active, subdivision9Active
    ];
    
    return subIcons.map((icon, idx) => {
      const subVal = idx + 1;
      const isActive = subVal === currentSettings.subdivisions;
      const iconToUse = isActive ? subIconsActive[idx] : icon;
      
      return (
        <img
          key={subVal}
          src={iconToUse}
          alt={`Subdivision ${subVal}`}
          onClick={() => {
            setCircleSettings((prev) => {
              const updated = [...prev];
              updated[activeCircle] = {
                ...updated[activeCircle],
                subdivisions: subVal,
                accents: Array.from({ length: subVal }, (_, i) => (i === 0 ? 3 : 1))
              };
              return updated;
            });
          }}
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
    });
  };

  // Render note selector (quarter/eighth)
  const renderNoteSelector = () => {
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <button
          onClick={() => {
            setCircleSettings((prev) => {
              const updated = [...prev];
              updated[activeCircle] = { ...updated[activeCircle], beatMode: "quarter" };
              return updated;
            });
          }}
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <img
            src={require("../assets/svg/quarter_eight_notes/quarterNotesActive.svg").default}
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
            setCircleSettings((prev) => {
              const updated = [...prev];
              updated[activeCircle] = { ...updated[activeCircle], beatMode: "eighth" };
              return updated;
            });
          }}
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <img
            src={require("../assets/svg/quarter_eight_notes/eightNotesActive.svg").default}
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

  // Handle play/pause with proper suspend/resume
  const handlePlayPause = useCallback(() => {
    if (isProcessingPlayPauseRef.current) return;
    
    isProcessingPlayPauseRef.current = true;
    
    props.setIsPaused((prev) => {
      if (prev) {
        // Starting playback
        setPlayingCircle(0);
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        measureCountRef.current = 0;
        lastCircleSwitchCheckTimeRef.current = 0;
        playingSettingsRef.current = circleSettings[0];
        
        const startPlayback = () => {
          if (logic.currentSubStartRef) {
            logic.currentSubStartRef.current = 0;
          }
          logic.startScheduler();
          setTimeout(() => {
            isProcessingPlayPauseRef.current = false;
          }, 100);
        };
        
        if (logic.audioCtx) {
          if (logic.audioCtx.state === "suspended") {
            logic.audioCtx
              .resume()
              .then(startPlayback)
              .catch(() => {
                isProcessingPlayPauseRef.current = false;
              });
          } else {
            startPlayback();
          }
        } else {
          isProcessingPlayPauseRef.current = false;
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
            })
            .catch(() => {
              isProcessingPlayPauseRef.current = false;
            });
        } else {
          isProcessingPlayPauseRef.current = false;
        }
        
        setPlayingCircle(0);
        return true;
      }
    });
  }, [logic, props.setIsPaused, circleSettings]);

  // Register handlers with parent
  useEffect(() => {
    if (props.registerTogglePlay) {
      props.registerTogglePlay(handlePlayPause);
    }
    if (props.registerTapTempo && logic.tapTempo) {
      props.registerTapTempo(logic.tapTempo);
    }
  }, [handlePlayPause, logic.tapTempo, props.registerTogglePlay, props.registerTapTempo]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: () => {
      setTimeout(() => {
        if (!isProcessingPlayPauseRef.current) {
          handlePlayPause();
        }
      }, 150);
    },
    onTapTempo: logic.tapTempo
  });

  return (
    <div style={{ textAlign: "center" }}>
      {/* MAIN CIRCLES CONTAINER - VERTICAL STACK */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", // VERTICAL LAYOUT
        alignItems: "center",
        justifyContent: "center", 
        marginTop: "20px",
        width: "100%"
      }}>
        {renderAllCircles()}
        {renderAddCircleButton()}
      </div>
      
      {/* Controls */}
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "20px" }}>
        <button
          onClick={handlePlayPause}
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
          aria-label="Toggle Play/Pause"
        >
          <img
            src={props.isPaused ? playIcon : pauseIcon}
            alt={props.isPaused ? "Play" : "Pause"}
            style={{
              width: "36px",
              height: "36px",
              objectFit: "contain",
              transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
            }}
          />
        </button>
      </div>
      
      {/* Subdivision controls */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <h3>Subdivision</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
          {renderSubdivisionButtons()}
        </div>
      </div>
      
      {/* Note selector */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <h3>Notes</h3>
        {renderNoteSelector()}
      </div>
      
      {/* Global sliders */}
      <div className="sliders-container" style={{ marginTop: "20px", width: "100%", maxWidth: "500px", margin: "0 auto" }}>
        <div className="slider-item" style={{ marginBottom: "10px", maxWidth: "500px", margin: "0 auto", width: "100%" }}>
          {currentSettings.subdivisions % 2 === 0 && (
            <>
              <label>Swing: {Math.round(props.swing * 200)}% </label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={props.swing}
                onChange={(e) => props.setSwing(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </>
          )}
        </div>
        <div className="slider-item" style={{ marginBottom: "10px", maxWidth: "500px", margin: "0 auto", width: "100%" }}>
          <label>Volume: {Math.round(props.volume * 100)}% </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={props.volume}
            onChange={(e) => props.setVolume(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
        <div className="slider-item tempo-slider" style={{ maxWidth: "500px", margin: "0 auto", width: "100%" }}>
          <label>Tempo: {props.tempo} BPM </label>
          <input
            type="range"
            min={15}
            max={240}
            step={1}
            value={props.tempo}
            onChange={(e) => props.setTempo(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>
      
      {/* Tap tempo button for mobile */}
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          style={{ background: "transparent", border: "none", cursor: "pointer", marginTop: "20px" }}
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