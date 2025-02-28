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

// Maximum number of circles allowed
const MAX_CIRCLES = 3;
// Breakpoint for horizontal vs vertical layout
const MOBILE_BREAKPOINT = 768;

export default function MultiCircleMetronome(props) {
  const [circleSettings, setCircleSettings] = useState([
    {
      subdivisions: props.subdivisions || 4,
      accents: Array.from({ length: props.subdivisions || 4 }, (_, i) =>
        i === 0 ? 3 : 1
      ),
      beatMode: "quarter"
    }
  ]);
  const [activeCircle, setActiveCircle] = useState(0);
  const [playingCircle, setPlayingCircle] = useState(0);
  const [isVerticalLayout, setIsVerticalLayout] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  
  const currentSettings = circleSettings[activeCircle] || 
    { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" };
    
  // Important: Keep a stable reference to the currently PLAYING circle's settings
  const playingSettingsRef = useRef(circleSettings[playingCircle]);
  
  // Update the playing settings reference when playingCircle changes
  useEffect(() => {
    playingSettingsRef.current = circleSettings[playingCircle];
  }, [playingCircle, circleSettings]);
  
  // State references
  const isTransitioningRef = useRef(false);
  const prevSubdivisionRef = useRef(null);
  const measureCountRef = useRef(0);
  const isProcessingPlayPauseRef = useRef(false);
  const lastMeasureTimeRef = useRef(0);
  
  // Create metronome logic for the active circle.
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

  // Container size.
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
      setIsVerticalLayout(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const radius = containerSize / 2;

  // Add a new circle - LIMITED TO MAX_CIRCLES
  const addCircle = () => {
    setCircleSettings(prev => {
      // Stop at the maximum number of circles
      if (prev.length >= MAX_CIRCLES) {
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

  // Delete a circle by index
  const deleteCircle = (indexToDelete) => {
    setCircleSettings(prev => {
      // Don't delete if we only have one circle left
      if (prev.length <= 1) {
        return prev;
      }
      
      const newCircles = prev.filter((_, idx) => idx !== indexToDelete);
      
      // If we're deleting the active circle, adjust the active index
      if (activeCircle >= newCircles.length) {
        setActiveCircle(newCircles.length - 1);
      } else if (activeCircle === indexToDelete) {
        setActiveCircle(Math.max(0, activeCircle - 1));
      }
      
      // If we're deleting the playing circle, adjust the playing index
      if (playingCircle >= newCircles.length) {
        setPlayingCircle(newCircles.length - 1);
      } else if (playingCircle === indexToDelete) {
        setPlayingCircle(Math.max(0, playingCircle - 1));
      }
      
      return newCircles;
    });
  };

  // Update accent on beat click.
  const updateAccent = (beatIndex) => {
    if (beatIndex === 0) return;
    setCircleSettings((prev) => {
      const updated = [...prev];
      const acc = [...updated[activeCircle].accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...updated[activeCircle], accents: acc };
      return updated;
    });
  };

  // FIXED! Critical loop playback function - detect measure completion and cycle circles
  useEffect(() => {
    // Only monitor when playing and only if we have multiple circles
    if (props.isPaused || circleSettings.length <= 1) return;
    
    // Track subdivision changes to detect measure completion
    if (
      prevSubdivisionRef.current !== null &&
      prevSubdivisionRef.current !== logic.currentSubdivision &&
      logic.currentSubdivision === 0
    ) {
      // Add debounce to avoid duplicate triggers
      const now = Date.now();
      if (now - lastMeasureTimeRef.current > 500) {
        lastMeasureTimeRef.current = now;
        
        // Set a flag to indicate we're transitioning between circles
        isTransitioningRef.current = true;
        
        // Move to the next circle with wrap-around
        setPlayingCircle(prev => (prev + 1) % circleSettings.length);
        
        // Clear transition flag after a short delay
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 100);
      }
    }
    
    // Update the previous subdivision reference
    prevSubdivisionRef.current = logic.currentSubdivision;
  }, [logic.currentSubdivision, props.isPaused, circleSettings.length]);

  // Helper: renderCircle – returns beat icons for a circle
  const renderCircle = (settings, idx) => {
    const iconSize = 24;
    const beatData = Array.from({ length: settings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      const isActive =
        i === logic.currentSubdivision &&
        idx === playingCircle &&
        !props.isPaused &&
        logic.audioCtx &&
        logic.audioCtx.state === "running" &&
        !isTransitioningRef.current;
      let icon;
      if (i === 0) {
        icon = isActive ? firstBeatActive : firstBeat;
      } else {
        icon =
          settings.accents[i] === 2
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
          opacity: settings.accents[bd.i] === 0 ? 0.3 : 1
        }}
      />
    ));
  };

  // Helper: renderSubdivisionButtons – returns subdivision selector icons.
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
          style={{ cursor: "pointer", width: "36px", height: "36px", margin: "0 3px" }}
        />
      );
    });
  };

  // Helper: renderNoteSelector – returns note selector buttons.
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
              opacity: currentSettings.beatMode === "quarter" ? 1 : 0.5
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
              opacity: currentSettings.beatMode === "eighth" ? 1 : 0.5
            }}
          />
        </button>
      </div>
    );
  };

  // Handle play/pause with proper suspend/resume.
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
        lastMeasureTimeRef.current = 0;
        
        // Update the playing settings reference to match
        playingSettingsRef.current = circleSettings[0];
        
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
  }, [logic, props.setIsPaused, circleSettings]);

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

  // Register keyboard shortcuts
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
      {/* CIRCLES CONTAINER - ADAPTIVE LAYOUT */}
      <div style={{ 
        display: "flex", 
        flexDirection: isVerticalLayout ? "column" : "row", // Adaptive layout
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "20px" 
      }}>
        {/* Map through circle settings and render each circle */}
        {circleSettings.map((settings, idx) => {
          const isActiveUI = idx === activeCircle;
          const isPlaying = idx === playingCircle && !props.isPaused;
          
          return (
            <div
              key={idx}
              style={{
                position: "relative",
                width: containerSize,
                height: containerSize,
                margin: isVerticalLayout ? "15px 0" : "10px",
              }}
            >
              {/* The circle container */}
              <div
                onClick={() => setActiveCircle(idx)}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%", // Make perfectly round
                  boxShadow: isActiveUI
                    ? "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)"
                    : isPlaying
                      ? "0 0 0 3px #FFD700, 0 0 10px rgba(255, 215, 0, 0.6)"
                      : "none",
                  cursor: "pointer"
                }}
              >
                {renderCircle(settings, idx)}
              </div>
              
              {/* Delete button - only show if we have more than 1 circle */}
              {circleSettings.length > 1 && (
                <div
                  onClick={() => deleteCircle(idx)}
                  style={{
                    position: "absolute",
                    top: "-10px",
                    right: "-10px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: "#FF5252",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#fff",
                    fontSize: "20px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                    zIndex: 10
                  }}
                >
                  −
                </div>
              )}
            </div>
          );
        })}
        
        {/* Add circle button (only if under MAX_CIRCLES limit) */}
        {circleSettings.length < MAX_CIRCLES && (
          <div
            onClick={addCircle}
            style={{
              position: "relative",
              width: containerSize,
              height: containerSize,
              borderRadius: "50%", // Make perfectly round
              border: "2px dashed #00A0A0",
              margin: isVerticalLayout ? "15px 0" : "10px", // Adaptive spacing
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%", // Make perfectly round
                backgroundColor: "#00A0A0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#fff",
                fontSize: "36px",
                fontWeight: "bold"
              }}
            >
              +
            </div>
          </div>
        )}
      </div>
      
      {/* Play/Pause Control */}
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
              objectFit: "contain"
            }}
          />
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
      <div className="sliders-container" style={{ marginTop: "20px", width: "100%" }}>
        <div className="slider-item" style={{ marginBottom: "10px", maxWidth: "300px", margin: "0 auto" }}>
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
        <div className="slider-item" style={{ marginBottom: "10px", maxWidth: "300px", margin: "0 auto" }}>
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
        <div className="slider-item tempo-slider" style={{ maxWidth: "300px", margin: "0 auto" }}>
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
            style={{ height: "35px", objectFit: "contain" }}
          />
        </button>
      )}
    </div>
  );
}