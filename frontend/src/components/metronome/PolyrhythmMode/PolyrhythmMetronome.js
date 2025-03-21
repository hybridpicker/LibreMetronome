import React, { useState, useEffect, useCallback, useRef } from "react";
import usePolyrhythmLogic from "./usePolyrhythmLogic";
import playIcon from "../../../assets/svg/play.svg";
import pauseIcon from "../../../assets/svg/pause.svg";
import swapIcon from "../../../assets/svg/swap-icon.svg";
import tapButtonIcon from "../../../assets/svg/tap-button.svg";
import CircleRenderer from "./CircleRenderer";
import "./PolyrhythmMetronome.css";
import withTrainingContainer from "../../Training/withTrainingContainer";
import AccelerateButton from "../Controls/AccelerateButton";
import { manualTempoAcceleration } from "../../../hooks/useMetronomeLogic/trainingLogic";

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Responsive behavior for mobile devices and tablets - visibility of tap button
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth <= 1024);

  const handleInnerBeatTriggered = useCallback((beatIndex) => {
    // Additional actions when inner beat is triggered (if needed)
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
    innerCurrentSubdivision,
    outerCurrentSubdivision,
    isSilencePhaseRef,
    measureCountRef,
    muteMeasureCountRef,
    tapTempo,
    reloadSounds,
    startScheduler,
    stopScheduler
  } = polyrhythmLogic;

  useEffect(() => {
    if (containerMeasureCountRef)
      containerMeasureCountRef.current = measureCountRef.current;
    if (containerMuteMeasureCountRef)
      containerMuteMeasureCountRef.current = muteMeasureCountRef.current;
    if (containerSilencePhaseRef)
      containerSilencePhaseRef.current = isSilencePhaseRef.current;

    const syncInterval = setInterval(() => {
      if (containerMeasureCountRef)
        containerMeasureCountRef.current = measureCountRef.current;
      if (containerMuteMeasureCountRef)
        containerMuteMeasureCountRef.current = muteMeasureCountRef.current;
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
    measureCountRef,
    muteMeasureCountRef,
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
          measureCountRef.current = 0;
          muteMeasureCountRef.current = 0;
          isSilencePhaseRef.current = false;
          window.dispatchEvent(
            new CustomEvent("training-measure-update")
          );
        }

        if (type === "speedMode" && newValue !== speedMode) {
          console.log(`[Polyrhythm] Received speedMode update: ${newValue}`);
          measureCountRef.current = 0;
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
  }, [macroMode, speedMode, measureCountRef, muteMeasureCountRef, isSilencePhaseRef]);

  useEffect(() => {
    const handleResize = () => {
      setContainerSize(getContainerSize());
      setIsMobile(window.innerWidth < 768);
      setIsMobileOrTablet(window.innerWidth <= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (soundSetReloadTrigger > 0 && reloadSounds) {
      reloadSounds().catch(console.error);
    }
  }, [soundSetReloadTrigger, reloadSounds]);

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

  const handleTapTempo = useCallback(() => {
    console.log("[POLYRHYTHM] Tap tempo button clicked or 'T' key pressed");

    if (isTransitioning) {
      console.log("[POLYRHYTHM] Ignoring tap - transition in progress");
      return;
    }

    if (tapTempo && typeof tapTempo === "function") {
      console.log("[POLYRHYTHM] Using hook's tapTempo implementation");
      tapTempo();
    } else {
      console.warn("[POLYRHYTHM] No tapTempo implementation found in hook");
      const now = performance.now();
      window.dispatchEvent(
        new CustomEvent("metronome-tap-tempo", {
          detail: { timestamp: now }
        })
      );
    }
  }, [tapTempo, isTransitioning]);

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
          startScheduler();
        }
      }, 200);
    },
    [isPaused, isTransitioning, startScheduler, stopScheduler]
  );

  const debouncedSetSubdivisions = useCallback(
    debounce((value, circle) => handleSetSubdivisions(value, circle), 150),
    [handleSetSubdivisions]
  );

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
    if (!isPaused && !isTransitioning && speedMode === 2) {
      console.log(
        `[Polyrhythm] Manual tempo acceleration (${tempoIncreasePercent}%)`
      );

      manualTempoAcceleration({
        tempoIncreasePercent,
        tempoRef: { current: tempo },
        setTempo
      });

      if (measureCountRef) {
        measureCountRef.current = 0;
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
    measureCountRef
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
      </div>

      {/* Accelerate Button positioned directly after the metronome canvas */}
      <AccelerateButton onClick={handleAccelerate} speedMode={speedMode} />

      <div className="polyrhythm-legend">
        <div className="legend-item">
          <div className="legend-color inner-beat"></div>
          <span>Inner Beat</span>
        </div>
        <div className="legend-item">
          <div className="legend-color outer-beat"></div>
          <span>Outer Beat</span>
        </div>
        <div className="legend-item">
          <div className="legend-color first-beat"></div>
          <span>First Beat</span>
        </div>
      </div>

      <div className="polyrhythm-controls">
        <div className="polyrhythm-config">
          <label className="polyrhythm-label">
            Inner Circle: {innerBeats} beats
          </label>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={`inner-${num}`}
                className={`polyrhythm-button ${
                  innerBeats === num ? "active" : ""
                }`}
                onClick={() => debouncedSetSubdivisions(num, "inner")}
                disabled={isTransitioning}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
        <div className="polyrhythm-config">
          <label className="polyrhythm-label">
            Outer Circle: {outerBeats} beats
          </label>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={`outer-${num}`}
                className={`polyrhythm-button ${
                  outerBeats === num ? "active" : ""
                }`}
                onClick={() => debouncedSetSubdivisions(num, "outer")}
                disabled={isTransitioning}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="side-controls">
        <div className="polyrhythm-ratio">
          <h3>
            Polyrhythm:{" "}
            <span className="ratio-value">
              {innerBeats}:{outerBeats}
            </span>
          </h3>
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
      
      {/* Only show tap tempo button on mobile and tablet devices */}
      {isMobileOrTablet && (
        <button
          onClick={handleTapTempo}
          style={{
            background: "transparent",
            border: "none",
            cursor: isTransitioning ? "not-allowed" : "pointer",
            marginTop: "20px",
            padding: "10px",
            outline: "none",
            display: "block",
            margin: "10px auto",
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
              transition:
                "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
            }}
          />
        </button>
      )}

    </div>
  );
};

export default withTrainingContainer(PolyrhythmMetronome);