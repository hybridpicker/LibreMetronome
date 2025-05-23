import React, { useState, useEffect, useCallback, useRef } from "react";
import usePolyrhythmLogic from "./usePolyrhythmLogic";
import playIcon from "../../../assets/svg/play.svg";
import pauseIcon from "../../../assets/svg/pause.svg";
import swapIcon from "../../../assets/svg/swap-icon.svg";
import tapButtonIcon from "../../../assets/svg/tap-button.svg";
import { getSubdivisionIcon } from "../../../assets/svg/subdivisionIcons";
import CircleRenderer from "./CircleRenderer";
// Removed unused import
import "./PolyrhythmMetronome.css";
import "./EnhancedPolyrhythmStyles.css";
import withTrainingContainer from "../../Training/withTrainingContainer";
import AccelerateButton from "../Controls/AccelerateButton";
import { manualTempoAcceleration } from "../../../hooks/useMetronomeLogic/trainingLogic";

import DirectBeatIndicator from "./DirectBeatIndicator";

// Utility debounce function to prevent rapid changes
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const PolyrhythmMetronome = (props) => {
  const {
    tempo,
    setTempo,
    isPaused,
    setIsPaused,
    swing,
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
    // Training container refs
    measureCountRef: containerMeasureCountRef,
    muteMeasureCountRef: containerMuteMeasureCountRef,
    isSilencePhaseRef: containerSilencePhaseRef
  } = props;

  const [innerBeats, setInnerBeats] = useState(4);
  const [outerBeats, setOuterBeats] = useState(3);
  const [activeCircle, setActiveCircle] = useState("inner");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef(null);

  const [innerAccents, setInnerAccents] = useState(
    Array.from({ length: innerBeats }, (_, i) => (i === 0 ? 3 : 1))
  );
  const [outerAccents, setOuterAccents] = useState(
    Array.from({ length: outerBeats }, (_, i) => (i === 0 ? 3 : 1))
  );

  const [soundsSwapped, setSoundsSwapped] = useState(false);
  const [circleColorSwapped, setCircleColorSwapped] = useState(false);

  useEffect(() => {
    setInnerAccents(
      Array.from({ length: innerBeats }, (_, i) => (i === 0 ? 3 : 1))
    );
  }, [innerBeats]);

  useEffect(() => {
    setOuterAccents(
      Array.from({ length: outerBeats }, (_, i) => (i === 0 ? 3 : 1))
    );
  }, [outerBeats]);

  const getContainerSize = () => {
    if (window.innerWidth < 600) return Math.min(window.innerWidth - 40, 300);
    if (window.innerWidth < 1024) return Math.min(window.innerWidth - 40, 400);
    return 300;
  };
  const [containerSize, setContainerSize] = useState(getContainerSize());
  // Removed unused variable
  
  // Removed unused isMobileOrTablet variable

  // Keep track of first beat events to prevent rapid firing
  // firstBeatTimerRef removed as it's unused
  const lastFirstBeatTimeRef = useRef(0);
  
  // Track beat count to only show indicator after second beat
  const beatCountRef = useRef(0);
  
  const handleInnerBeatTriggered = useCallback((beatIndex) => {
    // Only dispatch first beat event if we're at beat index 0
    // and enough time has passed since last event (prevents double triggers)
    if (beatIndex === 0) {
      const now = performance.now();
      const timeSinceLastBeat = now - lastFirstBeatTimeRef.current;
      
      // Count beats for the indicator to appear on second beat
      beatCountRef.current++;
      
      // Only dispatch if at least 500ms have passed since last beat
      // This prevents multiple triggers in short succession
      if (timeSinceLastBeat > 500) {
        lastFirstBeatTimeRef.current = now;
        window.dispatchEvent(new CustomEvent('polyrhythm-first-beat'));
      }
    }
  }, []);

  const handleOuterBeatTriggered = useCallback((beatIndex) => {
    // Additional actions when outer beat is triggered (if needed)
  }, []);

  const polyrhythmLogic = usePolyrhythmLogic({
    tempo,
    innerBeats,
    outerBeats,
    innerAccents,
    outerAccents,
    isPaused,
    volume,
    swing,
    soundsSwapped,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    onInnerBeatTriggered: handleInnerBeatTriggered,
    onOuterBeatTriggered: handleOuterBeatTriggered,
    setTempo
  });

  const {
    innerCurrentSubdivision = 0,
    outerCurrentSubdivision = 0,
    isSilencePhaseRef = { current: false },
    measureCountRef: polyrhythmMeasureCountRef = { current: 0 },
    muteMeasureCountRef: polyrhythmMuteMeasureCountRef = { current: 0 },
    tapTempo = () => {},
    reloadSounds = () => Promise.resolve(true),
    startScheduler = () => {},
    stopScheduler = () => {}
  } = polyrhythmLogic || {};

  useEffect(() => {
    if (containerMeasureCountRef)
      containerMeasureCountRef.current = polyrhythmMeasureCountRef.current;
    if (containerMuteMeasureCountRef)
      containerMuteMeasureCountRef.current = polyrhythmMuteMeasureCountRef.current;
    if (containerSilencePhaseRef)
      containerSilencePhaseRef.current = isSilencePhaseRef.current;

    const syncInterval = setInterval(() => {
      if (containerMeasureCountRef)
        containerMeasureCountRef.current = polyrhythmMeasureCountRef.current;
      if (containerMuteMeasureCountRef)
        containerMuteMeasureCountRef.current = polyrhythmMuteMeasureCountRef.current;
      if (containerSilencePhaseRef)
        containerSilencePhaseRef.current = isSilencePhaseRef.current;
      window.isSilencePhaseRef =
        containerSilencePhaseRef || isSilencePhaseRef;
    }, 500);

    return () => clearInterval(syncInterval);
  }, [
    containerMeasureCountRef,
    containerMuteMeasureCountRef,
    containerSilencePhaseRef,
    polyrhythmMeasureCountRef,
    polyrhythmMuteMeasureCountRef,
    isSilencePhaseRef
  ]);

  useEffect(() => {
    if (registerTapTempo && tapTempo) {
      console.log("[POLYRHYTHM] Registering tap tempo function with parent");
      registerTapTempo(tapTempo);
    }

    return () => {
      if (registerTapTempo) {
        registerTapTempo(null);
      }
    };
  }, [registerTapTempo, tapTempo]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.isSilencePhaseRef = isSilencePhaseRef;
      const handleTrainingSettingsUpdate = (event) => {
        const { type, newValue } = event.detail;

        if (type === "macroMode" && newValue !== macroMode) {
          console.log(`[Polyrhythm] Received macroMode update: ${newValue}`);
          polyrhythmMeasureCountRef.current = 0;
          polyrhythmMuteMeasureCountRef.current = 0;
          isSilencePhaseRef.current = false;
          window.dispatchEvent(
            new CustomEvent("training-measure-update")
          );
        }

        if (type === "speedMode" && newValue !== speedMode) {
          console.log(`[Polyrhythm] Received speedMode update: ${newValue}`);
          polyrhythmMeasureCountRef.current = 0;
          window.dispatchEvent(
            new CustomEvent("training-measure-update")
          );
        }
      };

      window.addEventListener("training-param-update", handleTrainingSettingsUpdate);
      window.addEventListener("training-mode-toggle", handleTrainingSettingsUpdate);

      return () => {
        window.removeEventListener("training-param-update", handleTrainingSettingsUpdate);
        window.removeEventListener("training-mode-toggle", handleTrainingSettingsUpdate);
      };
    }
  }, [macroMode, speedMode, polyrhythmMeasureCountRef, polyrhythmMuteMeasureCountRef, isSilencePhaseRef]);

  useEffect(() => {
    const handleResize = () => {
      setContainerSize(getContainerSize());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (soundSetReloadTrigger > 0 && reloadSounds) {
      reloadSounds().catch(console.error);
    }
  }, [soundSetReloadTrigger, reloadSounds]);
  
  // Reset beat indicator when play state changes
  useEffect(() => {
    if (!isPaused) {
      // Reset beat counter on play
      beatCountRef.current = 0;
      
      // Create a custom event to signal the start of playback
      // This helps synchronize visual elements with audio playback
      window.dispatchEvent(new CustomEvent('polyrhythm-playback-start', {
        detail: {
          timestamp: performance.now(),
          tempo: tempo,
          innerBeats: innerBeats
        }
      }));
    }
  }, [isPaused, tempo, innerBeats]);

  const handlePlayPause = useCallback(() => {
    if (isTransitioning) return;
    if (!isPaused) {
      stopScheduler();
    }
    setIsPaused(!isPaused);
  }, [isPaused, setIsPaused, isTransitioning, stopScheduler]);

  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay, handlePlayPause]);

  // Fix: Use a regular function instead of useCallback with unknown dependencies
  // Fix: Pass an inline function instead of useCallback with unknown dependencies
  const handleTapTempo = () => {
    console.log("[POLYRHYTHM] Tap tempo button clicked or 'T' key pressed");

    if (isTransitioning) {
      console.log("[POLYRHYTHM] Ignoring tap - transition in progress");
      return;
    }

    let handled = false;
    
    // Try to use the hook's tapTempo implementation
    if (tapTempo && typeof tapTempo === "function") {
      console.log("[POLYRHYTHM] Using hook's tapTempo implementation");
      tapTempo();
      handled = true;
    } else {
      console.warn("[POLYRHYTHM] No tapTempo implementation found in hook");
    }
    
    // Always dispatch the global event for consistency
    const now = performance.now();
    console.log("[POLYRHYTHM] Dispatching global tap tempo event");
    window.dispatchEvent(
      new CustomEvent("metronome-tap-tempo", {
        detail: { timestamp: now, handled }
      })
    );
  };

  const handleCircleChange = useCallback(
    (circle) => {
      if (activeCircle === circle || isTransitioning) return;

      setIsTransitioning(true);

      if (!isPaused) {
        stopScheduler();
      }

      setActiveCircle(circle);

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        if (!isPaused) {
          startScheduler();
        }
      }, 100);
    },
    [activeCircle, isPaused, isTransitioning, startScheduler, stopScheduler]
  );

  const handleToggleAccent = useCallback(
    (index, circle) => {
      if (isTransitioning) return;

      setIsTransitioning(true);

      if (!isPaused) {
        stopScheduler();
      }

      if (circle === "inner") {
        setInnerAccents((prev) => {
          const newAccents = [...prev];
          newAccents[index] = (newAccents[index] + 1) % 4;
          return newAccents;
        });
      } else {
        setOuterAccents((prev) => {
          const newAccents = [...prev];
          newAccents[index] = (newAccents[index] + 1) % 4;
          return newAccents;
        });
      }

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        if (!isPaused) {
          startScheduler();
        }
      }, 100);
    },
    [isPaused, isTransitioning, startScheduler, stopScheduler]
  );

  const handleSetSubdivisions = useCallback(
    (value, circle) => {
      if (isTransitioning) return;

      console.log(`[Polyrhythm] Setting ${circle} beats to ${value} (from ${circle === "inner" ? innerBeats : outerBeats})`);
      setIsTransitioning(true);

      if (!isPaused) {
        stopScheduler();
      }

      if (circle === "inner") {
        setInnerBeats(value);
      } else {
        setOuterBeats(value);
      }

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        if (!isPaused) {
          console.log(`[Polyrhythm] Restarting scheduler after beat change to ${value}`);
          startScheduler();
        }
      }, 200);
    },
    [isPaused, isTransitioning, startScheduler, stopScheduler, innerBeats, outerBeats]
  );

  // Fix: Pass an inline function instead of a debounced function reference
  const debouncedSetSubdivisions = (value, circle) => {
    // Using debounce directly as recommended by ESLint
    debounce((v, c) => handleSetSubdivisions(v, c), 150)(value, circle);
  };

  const handleSwitchCircles = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    if (!isPaused) {
      stopScheduler();
    }

    const tempBeats = innerBeats;
    setInnerBeats(outerBeats);
    setOuterBeats(tempBeats);

    const tempAccents = [...innerAccents];
    setInnerAccents([...outerAccents]);
    setOuterAccents(tempAccents);

    setSoundsSwapped(!soundsSwapped);
    setCircleColorSwapped(!circleColorSwapped);

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      if (!isPaused) {
        startScheduler();
      }
    }, 200);
  }, [
    innerBeats,
    outerBeats,
    innerAccents,
    outerAccents,
    soundsSwapped,
    circleColorSwapped,
    isPaused,
    isTransitioning,
    startScheduler,
    stopScheduler
  ]);

  const handleAccelerate = useCallback(() => {
    if (!isPaused && !isTransitioning && (speedMode === 1 || speedMode === 2)) {
      console.log(
        `[Polyrhythm] Manual tempo acceleration (${tempoIncreasePercent}%) - Speed Mode: ${speedMode}`
      );

      const newTempo = manualTempoAcceleration({
        tempoIncreasePercent,
        tempoRef: { current: tempo },
        setTempo
      });
      
      console.log(`[Polyrhythm] Successfully increased tempo to ${newTempo} BPM`);

      if (polyrhythmMeasureCountRef) {
        polyrhythmMeasureCountRef.current = 0;
        window.dispatchEvent(
          new CustomEvent("training-measure-update")
        );
      }
    }
  }, [
    isPaused,
    isTransitioning,
    speedMode,
    tempoIncreasePercent,
    tempo,
    setTempo,
    polyrhythmMeasureCountRef
  ]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  return (
    <div style={{ textAlign: "center", position: "relative" }}>
      <div className="polyrhythm-container">
        <CircleRenderer
          innerBeats={innerBeats}
          outerBeats={outerBeats}
          innerAccents={innerAccents}
          outerAccents={outerAccents}
          innerCurrentSubdivision={innerCurrentSubdivision}
          outerCurrentSubdivision={outerCurrentSubdivision}
          isPaused={isPaused}
          containerSize={containerSize}
          activeCircle={activeCircle}
          setActiveCircle={handleCircleChange}
          handleToggleAccent={handleToggleAccent}
          macroMode={macroMode}
          isSilencePhaseRef={
            polyrhythmLogic ? polyrhythmLogic.isSilencePhaseRef : null
          }
          isTransitioning={isTransitioning}
          circleColorSwapped={circleColorSwapped}
        />
        
        {/* Direct beat indicator synchronized with the actual beat position */}
        <DirectBeatIndicator
          containerSize={containerSize}
          isPaused={isPaused || isTransitioning}
          tempo={tempo}
          innerBeats={innerBeats}
        />
      </div>

      {/* Play/Pause button positioned immediately after the metronome canvas */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={handlePlayPause}
          className="play-pause-button"
          style={{
            background: "transparent",
            border: "none",
            cursor: isTransitioning ? "not-allowed" : "pointer",
            padding: "10px",
            opacity: isTransitioning ? 0.7 : 1
          }}
          aria-label="Toggle play/pause"
          disabled={isTransitioning}
        >
          <img
            src={isPaused ? playIcon : pauseIcon}
            alt={isPaused ? "Play" : "Pause"}
            className="play-pause-icon"
            style={{ width: 40, height: 40 }}
          />
        </button>
      </div>

      {/* Accelerate Button positioned after the play button */}
      <AccelerateButton onClick={handleAccelerate} speedMode={speedMode} />

      <div style={{ 
        marginTop: '20px', 
        marginBottom: '20px',
        display: 'flex', 
        justifyContent: 'center', 
        gap: '15px',
        flexWrap: 'wrap',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: 'var(--beat-inner)', 
            borderRadius: '50%',
            marginRight: '5px',
            border: '1px solid var(--neutral-border)'
          }}></div>
          Inner Beat
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: 'var(--beat-outer)', 
            borderRadius: '50%',
            marginRight: '5px',
            border: '1px solid var(--neutral-border)'
          }}></div>
          Outer Beat
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: 'var(--beat-first)', 
            borderRadius: '50%',
            marginRight: '5px',
            border: '1px solid var(--neutral-border)'
          }}></div>
          First Beat
        </div>
      </div>

      <div className="polyrhythm-controls">
        <div className="polyrhythm-config">
          <div className="circle-header">
            <div className="circle-badge inner-badge">Inner</div>
            <div className="circle-beat-count">{innerBeats} Beats</div>
          </div>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <div
                key={`inner-${num}`}
                className={`subdivision-button-container ${innerBeats === num ? "active" : ""}`}
                onClick={() => !isTransitioning && debouncedSetSubdivisions(num, "inner")}
                style={{
                  cursor: isTransitioning ? "not-allowed" : "pointer",
                  opacity: isTransitioning ? 0.7 : 1
                }}
              >
                <img
                  src={innerBeats === num 
                    ? getSubdivisionIcon(num, true) 
                    : getSubdivisionIcon(num, false)}
                  alt={`${num} beats`}
                  className="subdivision-button"
                  style={{
                    cursor: isTransitioning ? "not-allowed" : "pointer",
                    width: "36px",
                    height: "36px",
                    margin: "0 3px",
                    transition: "transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
                    transform: innerBeats === num ? "scale(1.1)" : "scale(1)",
                    filter: innerBeats === num ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none"
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="polyrhythm-config">
          <div className="circle-header">
            <div className="circle-badge outer-badge">Outer</div>
            <div className="circle-beat-count">{outerBeats} Beats</div>
          </div>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <div
                key={`outer-${num}`}
                className={`subdivision-button-container ${outerBeats === num ? "active" : ""}`}
                onClick={() => !isTransitioning && debouncedSetSubdivisions(num, "outer")}
                style={{
                  cursor: isTransitioning ? "not-allowed" : "pointer",
                  opacity: isTransitioning ? 0.7 : 1
                }}
              >
                <img
                  src={outerBeats === num 
                    ? getSubdivisionIcon(num, true) 
                    : getSubdivisionIcon(num, false)}
                  alt={`${num} beats`}
                  className="subdivision-button"
                  style={{
                    cursor: isTransitioning ? "not-allowed" : "pointer",
                    width: "36px",
                    height: "36px",
                    margin: "0 3px",
                    transition: "transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
                    transform: outerBeats === num ? "scale(1.1)" : "scale(1)",
                    filter: outerBeats === num ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none"
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="side-controls">
        <div className="polyrhythm-ratio">
          <div className="ratio-label">Polyrhythm</div>
          <div className="ratio-display">
            <div className="ratio-number inner-number">{innerBeats}</div>
            <div className="ratio-divider">:</div>
            <div className="ratio-number outer-number">{outerBeats}</div>
          </div>
        </div>

        <button
          onClick={handleSwitchCircles}
          className="switch-circles-button"
          disabled={isTransitioning}
          aria-label="Swap Inner and Outer Beat Patterns"
          style={{
            opacity: isTransitioning ? 0.7 : 1
          }}
        >
          <img src={swapIcon} alt="Swap" />
        </button>
      </div>

      {/* Tempo and Volume */}
      <div className="sliders-container" style={{ marginTop: "20px" }}>
        <label>
          Tempo: {tempo} BPM
          <input
            type="range"
            min={30}
            max={240}
            step={1}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            disabled={isTransitioning}
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
            disabled={isTransitioning}
          />
        </label>
      </div>
      
      {/* Tap Tempo Button - Always visible, positioned under the play/pause button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px' }}>
        <button
          onClick={handleTapTempo}
          className="tap-tempo-button"
          style={{
            background: "transparent",
            border: "none",
            cursor: isTransitioning ? "not-allowed" : "pointer",
            padding: "10px",
            outline: "none",
            opacity: isTransitioning ? 0.7 : 1
          }}
          aria-label="Tap Tempo"
          disabled={isTransitioning}
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
      </div>

    </div>
  );
};

export default withTrainingContainer(PolyrhythmMetronome);