// src/components/MultiCircleMetronome.js
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

// ---------------------
// MultiCircleMetronome Component
// ---------------------
export default function MultiCircleMetronome(props) {
  const mountLogRef = useRef(false);
  // Only log on initial render, not on updates
  useEffect(() => {
    if (!mountLogRef.current) {
      mountLogRef.current = true;
    }
  }, []);
  
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
  // This prevents subdivision changes in other circles from affecting the currently playing one
  const playingSettingsRef = useRef(circleSettings[playingCircle]);
  
  // Update the playing settings reference when playingCircle changes
  useEffect(() => {
    playingSettingsRef.current = circleSettings[playingCircle];
  }, [playingCircle, circleSettings]);
  
  // Flag to track if we need to restart the scheduler after a circle change
  const needRestartRef = useRef(false);
  
  // Flag to track if we're currently in a circle transition
  const isTransitioningRef = useRef(false);
  
  // Flag to prevent duplicate firing of subdivision 0 when switching circles
  const preventDuplicateFirstBeatRef = useRef(false);
  
  // Create metronome logic using the stable reference to playing settings
  const logicRef = useRef(null);
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
  
  // Store a reference to the logic object
  logicRef.current = logic;

  // Global scheduler reference to ensure only one scheduler is running
  const globalSchedulerRef = useRef(null);
  
  // Simplified playingCircle change handler
  useEffect(() => {
    // Update the playing settings reference
    playingSettingsRef.current = circleSettings[playingCircle];
    
    // No need to stop and restart the scheduler - our new approach handles this differently
  }, [playingCircle, circleSettings]);

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

  // Track previous subdivision to detect measure completion
  const prevSubdivisionRef = useRef(null);
  
  // COMPLETELY NEW APPROACH: Use a custom scheduler for circle switching
  // Instead of trying to coordinate multiple schedulers, we'll use a single scheduler
  // and handle the circle switching logic directly in the component
  
  // Track the last time we checked for a circle switch
  const lastCircleSwitchCheckTimeRef = useRef(0);
  
  // Track the measure count for each circle
  const measureCountRef = useRef(0);
  
  // Custom function to handle subdivision changes and circle switching
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
  
  // CRITICAL FIX: Use a direct subscription to subdivision changes instead of an interval
  // This prevents multiple intervals from running simultaneously
  useEffect(() => {
    // Only set up the handler if we're not paused
    if (!props.isPaused && logic.currentSubdivision !== undefined) {
      // Call the handler directly when the subdivision changes
      handleSubdivisionChange(logic.currentSubdivision);
    }
  }, [logic.currentSubdivision, handleSubdivisionChange, props.isPaused, logic]);

  // Container size calculation
  const getContainerSize = () => {
    if (window.innerWidth < 600) return Math.min(window.innerWidth - 40, 300);
    if (window.innerWidth < 1024) return Math.min(window.innerWidth - 40, 400);
    return 300;
  };
  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    const handleResize = () => setContainerSize(getContainerSize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const radius = containerSize / 2;

  // Helper: renderActiveCircleHelper – returns dynamic beat icons for the active circle
  const renderActiveCircleHelper = () => {
    const iconSize = 24;
    const beatData = Array.from({ length: currentSettings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / currentSettings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      
      // A beat is active only if it's the current subdivision AND this circle is the playing circle
      // AND we're not in a transition between circles
      const isActive =
        i === logic.currentSubdivision &&
        activeCircle === playingCircle &&
        !props.isPaused &&
        logic.audioCtx &&
        logic.audioCtx.state === "running" &&
        !isTransitioningRef.current;
        
      let icon;
      if (i === 0) {
        icon = isActive ? firstBeatActive : firstBeat;
      } else {
        icon =
          currentSettings.accents[i] === 2
            ? isActive ? accentedBeatActive : accentedBeat
            : isActive ? normalBeatActive : normalBeat;
      }
      return { i, xPos, yPos, icon, isActive };
    });
    
    return beatData.map((bd) => (
      <img
        key={bd.i}
        src={bd.icon}
        alt={`Beat ${bd.i}`}
        onClick={() => {
          if (bd.i !== 0) updateAccent(bd.i);
        }}
        style={{
          position: "absolute",
          left: `calc(50% + ${bd.xPos}px - ${iconSize / 2}px)`,
          top: `calc(50% + ${bd.yPos}px - ${iconSize / 2}px)`,
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          cursor: bd.i === 0 ? "default" : "pointer",
          filter: bd.isActive ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))" : "none",
          transition: "filter 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
        }}
      />
    ));
  };

  // Helper: renderSubdivisionButtons – returns subdivision selector icons
  const renderSubdivisionButtons = () => {
    const subIcons = [
      subdivision1,
      subdivision2,
      subdivision3,
      subdivision4,
      subdivision5,
      subdivision6,
      subdivision7,
      subdivision8,
      subdivision9
    ];
    const subIconsActive = [
      subdivision1Active,
      subdivision2Active,
      subdivision3Active,
      subdivision4Active,
      subdivision5Active,
      subdivision6Active,
      subdivision7Active,
      subdivision8Active,
      subdivision9Active
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
            // Update subdivisions for the active circle only
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

  // Helper: renderNoteSelector – returns note selector buttons
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
          onMouseOver={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img && currentSettings.beatMode !== "quarter") {
              img.style.transform = 'scale(1.05)';
              img.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))';
            }
          }}
          onMouseOut={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img && currentSettings.beatMode !== "quarter") {
              img.style.transform = 'scale(1)';
              img.style.filter = 'none';
            }
          }}
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
          onMouseOver={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img && currentSettings.beatMode !== "eighth") {
              img.style.transform = 'scale(1.05)';
              img.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))';
            }
          }}
          onMouseOut={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img && currentSettings.beatMode !== "eighth") {
              img.style.transform = 'scale(1)';
              img.style.filter = 'none';
            }
          }}
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

  // Helper: renderStaticCircle – returns static beat icons for an inactive circle
  const renderStaticCircle = (settings, idx, radius) => {
    const iconSize = 24;
    const isPlaying = idx === playingCircle && !props.isPaused;
    
    // Create beat icons
    const beats = Array.from({ length: settings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      
      // Determine if this specific beat is active
      // Also check if we're in a transition between circles
      const isActive =
        i === logic.currentSubdivision &&
        isPlaying &&
        logic.audioCtx &&
        logic.audioCtx.state === "running" &&
        !isTransitioningRef.current;
      
      // Choose correct icon based on beat type and active state
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
          style={{
            position: "absolute",
            left: `calc(50% + ${xPos}px - ${iconSize / 2}px)`,
            top: `calc(50% + ${yPos}px - ${iconSize / 2}px)`,
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            filter: isActive ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))" : "none",
            transition: "filter 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
          }}
        />
      );
    });
    
    return beats;
  };

  // Helper: renderAllCircles – returns an array of circle previews
  const renderAllCircles = () => {
    return circleSettings.map((settings, idx) => {
      const isActiveUI = idx === activeCircle;
      const isPlaying = idx === playingCircle && !props.isPaused;
      
      return (
        <div
          key={idx}
          onClick={() => {
            setActiveCircle(idx);
          }}
          style={{
            position: "relative",
            width: containerSize,
            height: containerSize,
            boxShadow: isActiveUI
              ? "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)"  // Active in UI (selected) with glow
              : isPlaying
                ? "0 0 0 3px #FFD700, 0 0 10px rgba(255, 215, 0, 0.6)" // Currently playing with glow
                : "none",
            borderRadius: "50%",
            transition: "box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
            cursor: "pointer"
          }}
        >
          {isActiveUI
            ? renderActiveCircleHelper()
            : renderStaticCircle(settings, idx, radius)}
        </div>
      );
    });
  };

  // Handle play/pause with proper suspend/resume
  // Added lightweight protection to prevent issues with keyboard shortcuts
  const isProcessingPlayPauseRef = useRef(false);
  
  // Simplified play/pause handler that works with our new approach
  const handlePlayPause = useCallback(() => {
    // Prevent rapid consecutive calls
    if (isProcessingPlayPauseRef.current) {
      return;
    }
    
    isProcessingPlayPauseRef.current = true;
    
    props.setIsPaused((prev) => {
      if (prev) {
        // Starting playback
        
        // Always start with the first circle
        setPlayingCircle(0);
        
        // Reset state
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        measureCountRef.current = 0;
        lastCircleSwitchCheckTimeRef.current = 0;
        
        // Update the playing settings reference to match
        playingSettingsRef.current = circleSettings[0];
        
        // Start playback with clean state
        const startPlayback = () => {
          // Reset subdivision to 0
          if (logic.currentSubStartRef) {
            logic.currentSubStartRef.current = 0;
          }
          
          // Start the scheduler
          logic.startScheduler();
          
          // Release the lock
          setTimeout(() => {
            isProcessingPlayPauseRef.current = false;
          }, 100);
        };
        
        // Ensure audio context is running
        if (logic.audioCtx) {
          if (logic.audioCtx.state === "suspended") {
            logic.audioCtx
              .resume()
              .then(() => {
                startPlayback();
              })
              .catch((err) => {
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
        
        // Reset state
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        
        // Stop the scheduler
        logic.stopScheduler();
        
        // Suspend audio context
        if (logic.audioCtx && logic.audioCtx.state === "running") {
          logic.audioCtx
            .suspend()
            .then(() => {
              isProcessingPlayPauseRef.current = false;
            })
            .catch((err) => {
              isProcessingPlayPauseRef.current = false;
            });
        } else {
          isProcessingPlayPauseRef.current = false;
        }
        
        // Reset to first circle for next playback
        setPlayingCircle(0);
        
        return true;
      }
    });
  }, [logic, props.setIsPaused, props.isPaused, circleSettings]);

  // Register the handle play/pause function with parent component via ref
  useEffect(() => {
    if (props.registerTogglePlay) {
      props.registerTogglePlay(handlePlayPause);
    }
  }, [handlePlayPause, props.registerTogglePlay]);

  // Register tap tempo function with parent component if provided
  useEffect(() => {
    if (props.registerTapTempo && logic.tapTempo) {
      props.registerTapTempo(logic.tapTempo);
    }
  }, [logic.tapTempo, props.registerTapTempo]);

  // Register keyboard shortcuts with a special handler for keyboard events
  // This ensures we don't have conflicts between button clicks and keyboard shortcuts
  const keyboardPlayPauseHandler = useCallback(() => {
    // CRITICAL: Stop any existing interval for subdivision checking
    // This prevents multiple intervals from running simultaneously
    const existingIntervals = window.setInterval(() => {}, 100);
    for (let i = 1; i < existingIntervals; i++) {
      window.clearInterval(i);
    }
    
    // Add a significant delay to ensure we're not processing too quickly
    // This helps prevent issues with rapid key presses and multiple schedulers
    setTimeout(() => {
      // Make sure we're not already processing
      if (!isProcessingPlayPauseRef.current) {
        handlePlayPause();
      } else {
        // Ignoring keyboard play/pause - already processing
      }
    }, 150); // Increased from 20ms to 150ms
  }, [handlePlayPause]);
  
  useKeyboardShortcuts({
    onTogglePlayPause: keyboardPlayPauseHandler,
    onTapTempo: logic.tapTempo
  });

  // Mobile responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Add a circle
  const addCircle = () => {
    setCircleSettings((prev) => [
      ...prev,
      {
        subdivisions: props.subdivisions || 4,
        accents: Array.from({ length: props.subdivisions || 4 }, (_, i) =>
          i === 0 ? 3 : 1
        ),
        beatMode: "quarter"
      }
    ]);
  };

  // Styles
  const previewContainerStyle = {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    flexWrap: "wrap"
  };

  return (
    <div style={{ textAlign: "center" }}>
      {/* Render all circles in a row */}
      <div style={previewContainerStyle}>{renderAllCircles()}</div>
      
      {/* Controls */}
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "20px" }}>
        <button
          onClick={handlePlayPause}
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
          aria-label="Toggle Play/Pause"
          onMouseOver={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1.1)';
              img.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))';
            }
          }}
          onMouseOut={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1)';
              img.style.filter = 'none';
            }
          }}
        >
          <img
            src={props.isPaused ? playIcon : pauseIcon}
            alt={props.isPaused ? "Play" : "Pause"}
            style={{
              width: "36px",
              height: "36px",
              objectFit: "contain",
              transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
            }}
          />
        </button>
        <button
          onClick={addCircle}
          style={{
            background: "#00A0A0",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            cursor: "pointer",
            color: "#fff",
            fontSize: "24px",
            lineHeight: "50px",
            boxShadow: "0 0 8px rgba(0, 160, 160, 0.5)",
            transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0, 160, 160, 0.7)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 0 8px rgba(0, 160, 160, 0.5)";
          }}
          aria-label="Add Circle"
        >
          +
        </button>
      </div>
      
      {/* Subdivision controls */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <h3>Subdivision</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
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
          onMouseOver={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1.1)';
              img.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))';
            }
          }}
          onMouseOut={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1)';
              img.style.filter = 'none';
            }
          }}
        >
          <img
            src={tapButtonIcon}
            alt="Tap Tempo"
            style={{
              height: "35px",
              objectFit: "contain",
              transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
            }}
          />
        </button>
      )}
    </div>
  );
}