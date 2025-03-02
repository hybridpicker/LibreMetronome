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

// Note mode icons
import quarterNotesActive from "../assets/svg/quarter_eight_notes/quarterNotesActive.svg";
import quarterNotesInactive from "../assets/svg/quarter_eight_notes/quarterNotesInactive.svg";
import eightNotesActive from "../assets/svg/quarter_eight_notes/eightNotesActive.svg";
import eightNotesInactive from "../assets/svg/quarter_eight_notes/eightNotesInactive.svg";

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
  
  // Stable reference to current active circle settings
  const currentSettings = circleSettings[activeCircle] || { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" };
  const playingSettingsRef = useRef(circleSettings[playingCircle]);
  
  useEffect(() => {
    // Important: Store the full settings object for proper beat multiplier handling
    playingSettingsRef.current = circleSettings[playingCircle];
    console.log("Updated playing settings, beat mode:", playingSettingsRef.current.beatMode);
  }, [playingCircle, circleSettings]);
  
  // Flags for state tracking
  const isTransitioningRef = useRef(false);
  const lastCircleSwitchCheckTimeRef = useRef(0);
  const measureCountRef = useRef(0);
  const isProcessingPlayPauseRef = useRef(false);
  
  // Create metronome logic using the stable reference to playing settings
  const logic = useMetronomeLogic({
    tempo: props.tempo,
    setTempo: props.setTempo,
    subdivisions: playingSettingsRef.current.subdivisions,
    setSubdivisions: () => {},
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
    
    console.log("Setting subdivision for active circle to:", subdivisionValue);
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
  
  // ADD CIRCLE FUNCTION
  const addCircle = () => {
    console.log("addCircle triggered");
    setCircleSettings(prev => {
      if (prev.length >= MAX_CIRCLES) {
        console.log("Max circles reached, not adding a new one.");
        return prev;
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

  // REMOVE CIRCLE FUNCTION
  const removeCircle = (indexToRemove) => {
    console.log("removeCircle triggered for index", indexToRemove);
    if (circleSettings.length <= 1) {
      console.log("Cannot remove the last circle.");
      return;
    }
    
    setCircleSettings(prev => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      return updated;
    });
    
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
    console.log("updateAccent triggered on beat index", beatIndex);
    setCircleSettings(prev => {
      const updated = [...prev];
      const acc = [...updated[activeCircle].accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...updated[activeCircle], accents: acc };
      return updated;
    });
  };

  // Render the subdivision buttons
  const renderSubdivisionSelector = () => {
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
    
    return (
      <div className="subdivision-container" style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", margin: "10px 0" }}>
        {subIcons.map((icon, idx) => {
          const subVal = idx + 1;
          const isActive = subVal === currentSettings.subdivisions;
          const iconToUse = isActive ? subIconsActive[idx] : icon;
          
          return (
            <img
              key={subVal}
              src={iconToUse}
              alt={`Subdivision ${subVal}`}
              onClick={() => {
                console.log("Subdivision button clicked:", subVal);
                setCircleSettings(prev => {
                  const updated = [...prev];
                  updated[activeCircle] = {
                    ...updated[activeCircle],
                    subdivisions: subVal,
                    accents: Array.from({ length: subVal }, (_, i) => (i === 0 ? 3 : 1))
                  };
                  return updated;
                });
              }}
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

  // Handle subdivision changes and circle switching
  const prevSubdivisionRef = useRef(null);
  
  const handleSubdivisionChange = useCallback((newSubdivision) => {
    if (props.isPaused || circleSettings.length <= 1) return;
    if (
      prevSubdivisionRef.current !== null &&
      prevSubdivisionRef.current !== newSubdivision &&
      newSubdivision === 0 &&
      !isTransitioningRef.current
    ) {
      measureCountRef.current += 1;
      const now = Date.now();
      if (now - lastCircleSwitchCheckTimeRef.current < 500) return;
      lastCircleSwitchCheckTimeRef.current = now;
      isTransitioningRef.current = true;
      
      const nextCircleIndex = (playingCircle + 1) % circleSettings.length;
      console.log("Switching to circle index:", nextCircleIndex);
      
      // Store the current and next beat modes for proper transition
      const currentBeatMode = playingSettingsRef.current.beatMode;
      const nextBeatMode = circleSettings[nextCircleIndex].beatMode;
      console.log(`Transitioning from ${currentBeatMode} to ${nextBeatMode} mode`);
      
      // Update the playing settings
      playingSettingsRef.current = circleSettings[nextCircleIndex];
      
      // Important: Restart the scheduler with new beat mode settings
      logic.stopScheduler();
      setPlayingCircle(nextCircleIndex);
      
      // Give a small delay before restarting to ensure clean transition
      setTimeout(() => {
        if (!props.isPaused && logic.audioCtx) {
          // Start from the next available time with correct beat multiplier
          logic.startScheduler(logic.audioCtx.currentTime + 0.1);
        }
      }, 50);
      
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
    }
    prevSubdivisionRef.current = newSubdivision;
  }, [props.isPaused, circleSettings, playingCircle, logic]);
  
  useEffect(() => {
    if (!props.isPaused && logic.currentSubdivision !== undefined) {
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
    
    // Add a remove button if there's more than one circle
    if (circleSettings.length > 1) {
      const removeButton = (
        <div
          key="remove-button"
          onClick={(e) => {
            e.stopPropagation(); // Prevent the click from activating the circle
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

  // Render all circles in a horizontal or vertical layout based on screen size
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
            borderRadius: "50%",
            border: "2px solid transparent",
            boxShadow: isActiveUI
              ? "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)"
              : isPlaying
                ? "0 0 0 3px #FFD700, 0 0 10px rgba(255, 215, 0, 0.6)"
                : "none",
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
            console.log("Switching note selector to quarter.");
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
            console.log("Switching note selector to eighth.");
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

  // Handle Play/Pause with logging, resume/suspend and prevention of duplicate calls
  const handlePlayPause = useCallback(() => {
    console.log("handlePlayPause triggered. Current isPaused:", props.isPaused);
    if (isProcessingPlayPauseRef.current) {
      console.log("Play/Pause action already processing, exiting.");
      return;
    }
    
    // Set a timeout to reset the lock in case something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (isProcessingPlayPauseRef.current) {
        console.log("Safety timeout: Resetting processing flag after 2 seconds");
        isProcessingPlayPauseRef.current = false;
      }
    }, 2000);
    
    isProcessingPlayPauseRef.current = true;
    
    props.setIsPaused(prev => {
      if (prev) {
        console.log("Resuming playback...");
        setPlayingCircle(0);
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        measureCountRef.current = 0;
        lastCircleSwitchCheckTimeRef.current = 0;
        playingSettingsRef.current = circleSettings[0];
        console.log("Starting playback with beat mode:", playingSettingsRef.current.beatMode);
        
        const startPlayback = () => {
          console.log("Playback started via scheduler.");
          if (logic.currentSubStartRef) {
            logic.currentSubStartRef.current = 0;
          }
          logic.startScheduler();
          isProcessingPlayPauseRef.current = false;
          clearTimeout(safetyTimeout); // Clear the safety timeout
        };
        
        // Make sure the AudioContext is available
        if (!logic.audioCtx) {
          console.error("AudioContext not available. Trying to continue anyway.");
          // Try to start playback anyway
          startPlayback();
        } else if (logic.audioCtx.state === "suspended") {
          console.log("AudioContext is suspended. Attempting to resume.");
          logic.audioCtx
            .resume()
            .then(() => {
              console.log("AudioContext resumed successfully.");
              startPlayback();
            })
            .catch(err => {
              console.error("Error resuming AudioContext:", err);
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout); // Clear the safety timeout
            });
        } else {
          startPlayback();
        }
        return false;
      } else {
        console.log("Suspending playback...");
        isTransitioningRef.current = false;
        prevSubdivisionRef.current = null;
        logic.stopScheduler();
        
        if (logic.audioCtx && logic.audioCtx.state === "running") {
          console.log("AudioContext running. Attempting to suspend.");
          logic.audioCtx
            .suspend()
            .then(() => {
              console.log("AudioContext suspended successfully.");
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout); // Clear the safety timeout
            })
            .catch(err => {
              console.error("Error suspending AudioContext:", err);
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout); // Clear the safety timeout
            });
        } else {
          isProcessingPlayPauseRef.current = false;
          clearTimeout(safetyTimeout); // Clear the safety timeout
        }
        setPlayingCircle(0);
        return true;
      }
    });
  }, [logic, props.setIsPaused, circleSettings]);

  // Register callbacks with parent if provided
  useEffect(() => {
    if (props.registerTogglePlay) {
      props.registerTogglePlay(handlePlayPause);
    }
    if (props.registerTapTempo && logic.tapTempo) {
      props.registerTapTempo(logic.tapTempo);
    }
  }, [handlePlayPause, logic.tapTempo, props.registerTogglePlay, props.registerTapTempo]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: () => {
      // Call directly without timeout, as useKeyboardShortcuts already has a timeout
      if (!isProcessingPlayPauseRef.current) {
        handlePlayPause();
      }
    },
    onTapTempo: logic.tapTempo,
    onSetSubdivisions: handleSetSubdivisions
  });

  return (
    <div style={{ textAlign: "center" }}>
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
            src={props.isPaused ? playIcon : pauseIcon}
            alt={props.isPaused ? "Play" : "Pause"}
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
            <label>Tempo: {props.tempo} BPM</label>
            <input
              type="range"
              min={15}
              max={240}
              step={1}
              value={props.tempo}
              onChange={e => props.setTempo(parseFloat(e.target.value))}
              style={{ width: "100%", display: "block", margin: "5px auto" }}
            />
          </div>
          
          {/* Volume slider SECOND */}
          <div className="slider-item" style={{ marginBottom: "15px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
            <label>Volume: {Math.round(props.volume * 100)}%</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.volume}
              onChange={e => props.setVolume(parseFloat(e.target.value))}
              style={{ width: "100%", display: "block", margin: "5px auto" }}
            />
          </div>
          
          {/* Swing slider LAST - only shown when conditions are met */}
          {currentSettings.subdivisions % 2 === 0 && (
            <div className="slider-item" style={{ marginBottom: "15px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
              <label>Swing: {Math.round(props.swing * 200)}%</label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={props.swing}
                onChange={e => props.setSwing(parseFloat(e.target.value))}
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