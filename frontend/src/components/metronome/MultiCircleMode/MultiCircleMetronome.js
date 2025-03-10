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
import withTrainingContainer from "../../Training/withTrainingContainer";

import NoteSelector from "../Controls/NoteSelector";
import SubdivisionSelector from "../Controls/SubdivisionSelector";
import AccelerateButton from "../Controls/AccelerateButton";

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
  }, [
    tempo, 
    setTempo, 
    circleSettings, 
    playingCircle, 
    isPaused, 
    setIsPaused, 
    swing, 
    volume, 
    macroMode, 
    speedMode, 
    measuresUntilMute, 
    muteDurationMeasures, 
    muteProbability, 
    tempoIncreasePercent, 
    measuresUntilSpeedUp
  ]);

  // Make silence phase ref globally available to metronome logic
  useEffect(() => {
    window.isSilencePhaseRef = logic.isSilencePhaseRef;
    
    return () => {
      // Cleanup global refs when component unmounts
      delete window.isSilencePhaseRef;
    };
  }, [logic.isSilencePhaseRef]);

  // This function will be implemented in future updates for advanced subdivision handling
  const handleSubdivisionChange = useCallback((newSubdivision) => {
    // Reserved for future implementation of advanced subdivision change handling
  }, []); // Empty dependency array since it's not actively used

  // Handle setting subdivisions (used by keyboard shortcuts)
  const handleSetSubdivisions = useCallback((subdivisionValue) => {
    if (subdivisionValue < 1 || subdivisionValue > 9) return;
    
    setCircleSettings(prev => {
      const updated = [...prev];
      updated[activeCircle] = {
        ...updated[activeCircle],
        subdivisions: subdivisionValue
      };
      return updated;
    });
  }, [activeCircle]);

  // Handle Play/Pause with proper state management
  const handlePlayPause = useCallback(() => {
    if (isProcessingPlayPauseRef.current) {
      return;
    }

    isProcessingPlayPauseRef.current = true;
    setIsPaused(prev => !prev);

    // Reset the processing flag after a short delay
    setTimeout(() => {
      isProcessingPlayPauseRef.current = false;
    }, 200);
  }, [setIsPaused]); // Include setIsPaused in dependencies

  // Handle manual tempo acceleration
  const handleAccelerate = useCallback(() => {
    if (tempoIncreasePercent > 0) {
      setTempo(prevTempo => {
        const newTempo = Math.min(240, prevTempo * (1 + tempoIncreasePercent / 100));
        return Math.round(newTempo);
      });
    }
  }, [tempoIncreasePercent, setTempo]); // Include setTempo in dependencies

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
    setCircleSettings(prev => {
      const updated = [...prev];
      
      // Only update if the mode is actually changing
      if (updated[activeCircle]?.beatMode === mode) {
        return prev;
      }
      
      updated[activeCircle] = { ...updated[activeCircle], beatMode: mode };
      return updated;
    });
  }, [activeCircle, setCircleSettings]);

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
    
    console.log("Before update - beatIndex:", beatIndex, "activeCircle:", activeCircle);
    
    setCircleSettings(prev => {
      if (!prev || !prev.length) return prev;
      const updated = [...prev];
      if (activeCircle >= updated.length) return prev;
      
      const circle = updated[activeCircle];
      if (!circle.accents || beatIndex >= circle.accents.length) return prev;
      
      const acc = [...circle.accents];
      const oldState = acc[beatIndex];
      
      // Ensure we properly cycle through all states including 0
      acc[beatIndex] = (acc[beatIndex] + 1) % 4; // cycle 0→1→2→3→0
      
      console.log("Updating accent - from:", oldState, "to:", acc[beatIndex], "full array:", acc);
      
      // Force a deep copy to ensure React detects the change
      updated[activeCircle] = { 
        ...circle, 
        accents: [...acc] 
      };
      
      return updated;
    });
  }, [activeCircle, removeCircle]);

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

export default withTrainingContainer(MultiCircleMetronome);