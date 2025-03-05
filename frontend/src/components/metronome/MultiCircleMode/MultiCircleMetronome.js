// src/components/metronome/MultiCircleMode/MultiCircleMetronome.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import useMultiCircleMetronomeLogic from "./hooks/useMultiCircleMetronomeLogic";
import useKeyboardShortcuts from "../../../hooks/useKeyboardShortcuts";
import CircleRenderer from "./CircleRenderer";
import tapButtonIcon from "../../../assets/svg/tap-button.svg";
import playIcon from "../../../assets/svg/play.svg";
import pauseIcon from "../../../assets/svg/pause.svg";
import "./MultiCircleMetronome.css";
import '../Controls/slider-styles.css';

import NoteSelector from "../Controls/NoteSelector";
import SubdivisionSelector from "../Controls/SubdivisionSelector";

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

const TrainingStatus = ({
  macroMode,
  speedMode,
  isSilencePhaseRef,
  measureCountRef,
  measuresUntilMute,
  muteMeasureCountRef,
  muteDurationMeasures
}) => {
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
          {isSilencePhaseRef?.current && 
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
        Measures: {measureCountRef?.current || 0}/{measuresUntilMute}
        {isSilencePhaseRef?.current && ` | Silence: ${muteMeasureCountRef?.current || 0}/${muteDurationMeasures}`}
      </div>
    </div>
  );
};

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
    registerTogglePlay,
    registerTapTempo,
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
  const currentSettings = {
    ...circleSettings[activeCircle] || { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" },
    activeCircle
  };
  
  // State tracking references
  const isProcessingPlayPauseRef = useRef(false);
  const lastCircleSwitchTimeRef = useRef(0);
  
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

  // Make silence phase ref globally available to metronome logic
  useEffect(() => {
    window.isSilencePhaseRef = logic.isSilencePhaseRef;
    
    return () => {
      // Cleanup global refs when component unmounts
      delete window.isSilencePhaseRef;
    };
  }, [logic.isSilencePhaseRef]);

  // Handle setting subdivisions (used by keyboard shortcuts)
  const handleSetSubdivisions = useCallback((subdivisionValue) => {
    if (subdivisionValue < 1 || subdivisionValue > 9) return;
    
    setCircleSettings(prev => {
      if (!prev || !prev.length) return prev;
      const updated = [...prev];
      if (activeCircle >= updated.length) return prev;
      
      updated[activeCircle] = {
        ...updated[activeCircle],
        subdivisions: subdivisionValue,
        accents: Array.from({ length: subdivisionValue }, (_, i) => (i === 0 ? 3 : 1))
      };
      return updated;
    });
  }, [activeCircle]);
  
  // ADD CIRCLE FUNCTION
  const addCircle = useCallback(() => {
    setCircleSettings(prev => {
      if (!prev || prev.length >= MAX_CIRCLES) {
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
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...circle, accents: acc };
      return updated;
    });
  }, [activeCircle, removeCircle]);

  // Handle subdivision changes and circle switching
  const prevSubdivisionRef = useRef(null);
  
  const handleSubdivisionChange = useCallback((newSubdivision) => {
    if (isPaused || !circleSettings || circleSettings.length <= 1) return;

    // Only detect end of measure when current subdivision is 0 and previous wasn't
    if (
      prevSubdivisionRef.current !== null &&
      prevSubdivisionRef.current !== newSubdivision &&
      newSubdivision === 0
    ) {
      // Simply update our reference of the current subdivision
      // We no longer need to manually switch circles here, as it's handled
      // automatically in the useMultiCircleMetronomeLogic hook
      console.log(`[Multi-Circle] Beat 0 detected, circle transitions now handled automatically`);
      
      // Note: The circle switching is now handled directly in the metronome logic
      // by detecting the last beat of each measure and triggering the transition there
    }

    prevSubdivisionRef.current = newSubdivision;
  }, [
    isPaused,
    circleSettings
  ]);
  
  useEffect(() => {
    if (!isPaused && logic && logic.currentSubdivision !== undefined) {
      handleSubdivisionChange(logic.currentSubdivision);
    }
  }, [logic?.currentSubdivision, handleSubdivisionChange, isPaused, logic]);

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
        prevSubdivisionRef.current = null;
        
        // Reset counters
        if (logic.measureCountRef) logic.measureCountRef.current = 0;
        if (logic.muteMeasureCountRef) logic.muteMeasureCountRef.current = 0;
        if (logic.isSilencePhaseRef) logic.isSilencePhaseRef.current = false;
        
        // Update global reference
        window.isSilencePhaseRef = logic.isSilencePhaseRef;
        
        lastCircleSwitchTimeRef.current = 0;
        
        // Make sure beatMode is set correctly for first circle
        if (logic.beatModeRef && circleSettings.length > 0) {
          logic.beatModeRef.current = circleSettings[0].beatMode;
          console.log(`[Multi-Circle] Setting initial beatMode to ${circleSettings[0].beatMode}`);
        }

        const startPlayback = () => {
          if (logic && logic.startScheduler) {
            logic.startScheduler();
          }
          isProcessingPlayPauseRef.current = false;
          clearTimeout(safetyTimeout);
        };
        
        // Make sure the AudioContext is available
        if (!logic || !logic.audioCtx) {
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
        prevSubdivisionRef.current = null;
        
        if (logic && logic.stopScheduler) {
          logic.stopScheduler();
        }
        
        if (logic && logic.audioCtx && logic.audioCtx.state === "running") {
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
    setPlayingCircle
  ]);

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

  // Toggle functionality for the note selector
  const handleNoteSelection = useCallback((mode) => {
    // Don't change note mode during playback if we're in a transition
    if (!isPaused && logic && logic.isTransitioning && logic.isTransitioning()) {
      console.log("[Multi-Circle] Note selection ignored during transition");
      return;
    }
    
    setCircleSettings(prev => {
      const updated = [...prev];
      
      // Only update if the mode is actually changing
      if (updated[activeCircle]?.beatMode === mode) {
        return prev;
      }
      
      updated[activeCircle] = { ...updated[activeCircle], beatMode: mode };
      
      // If this is the currently playing circle and we're not paused,
      // we need to update the beatMode in the logic
      if (!isPaused && activeCircle === playingCircle && logic?.beatModeRef) {
        // Only update the beatMode if we're not in a transition
        if (!logic.isTransitioning()) {
          logic.beatModeRef.current = mode;
          console.log(`[Multi-Circle] Updated active circle beatMode to ${mode}`);
        }
      }
      
      return updated;
    });
  }, [activeCircle, isPaused, logic, playingCircle]);

  return (
    <div style={{ textAlign: "center" }}>
      {/* Training status indicator */}
      <TrainingStatus
        macroMode={macroMode}
        speedMode={speedMode}
        isSilencePhaseRef={logic.isSilencePhaseRef}
        measureCountRef={logic.measureCountRef}
        measuresUntilMute={measuresUntilMute}
        muteMeasureCountRef={logic.muteMeasureCountRef}
        muteDurationMeasures={muteDurationMeasures}
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
            currentSubdivision={logic?.currentSubdivision}
            isPaused={isPaused}
            audioCtxRunning={logic?.audioCtx && logic.audioCtx.state === "running"}
            isTransitioning={logic.isTransitioning && logic.isTransitioning()}
            updateAccent={updateAccent}
            radius={containerSize / 2}
            containerSize={containerSize}
            setActiveCircle={setActiveCircle}
            circleSettings={circleSettings}
            macroMode={macroMode}
            isSilencePhaseRef={logic.isSilencePhaseRef}
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
        
        {/* Subdivision section */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3 className="section-title" style={{marginBottom: "10px"}}>
            Subdivision (Circle {activeCircle + 1})
          </h3>
          <SubdivisionSelector
            subdivisions={currentSettings.subdivisions}
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
      {isMobile && (
        <button
          onClick={logic?.tapTempo}
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