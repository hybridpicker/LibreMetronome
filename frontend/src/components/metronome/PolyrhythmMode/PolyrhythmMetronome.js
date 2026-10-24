import React, { useState, useEffect, useCallback, useRef } from "react";
import { useVizCardSize } from '../../../utils/layoutSize';
import usePolyrhythmLogic from "./usePolyrhythmLogic";
import { initAudioContext, resumeAudioContext } from "../../../hooks/useMetronomeLogic/audioBuffers";
import EditableSliderInput from "../Controls/EditableSliderInput";
import CircleRenderer from "./CircleRenderer";
// Removed unused import
import withTrainingContainer from "../../Training/withTrainingContainer";
import AccelerateButton from "../Controls/AccelerateButton";
import { manualTempoAcceleration } from "../../../hooks/useMetronomeLogic/trainingLogic";
import TransportButton from "../Controls/TransportButton";

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

// Room between the rings and the edge of the visualisation area.
const RING_MARGIN = 28;
const MAX_RING = 520;

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

  // The rings fill the visualisation area. The outer beat marks overhang the
  // ring by about 12px, and the area keeps a 16px margin.
  const [vizRef, vizSize] = useVizCardSize();
  const vizReady = vizSize.width > 0 && vizSize.height > 0;
  const containerSize = vizReady
    ? Math.max(120, Math.floor(Math.min(MAX_RING, vizSize.width - 2 * RING_MARGIN, vizSize.height - 2 * RING_MARGIN)))
    : 0;
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
    } else {
      // Resume within the tap/keyboard gesture so mobile WebKit permits audio.
      void resumeAudioContext(initAudioContext());
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
    <div className="polyrhythm-mode-shell">
      <div className="polyrhythm-container viz-card" ref={vizRef}>
        {vizReady && <CircleRenderer
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
        />}

        {/* Direct beat indicator synchronized with the actual beat position */}
        {vizReady && <DirectBeatIndicator
          containerSize={containerSize}
          isPaused={isPaused || isTransitioning}
          tempo={tempo}
          innerBeats={innerBeats}
        />}
      </div>

      <div className="transport-row polyrhythm-transport-row">
        <TransportButton
          kind="play"
          label={isPaused ? "Start" : "Pause"}
          onClick={handlePlayPause}
          pressed={!isPaused}
          disabled={isTransitioning}
          className="play-pause-button"
        />
        <TransportButton
          kind="tap"
          label="Tap Tempo"
          feedbackVolume={volume}
          onClick={handleTapTempo}
          disabled={isTransitioning}
          className="tap-tempo-button tap-button"
        />
      </div>

      {/* Accelerate Button positioned after the play button */}
      <AccelerateButton onClick={handleAccelerate} speedMode={speedMode} />

      <div className="polyrhythm-controls">
        <div className="polyrhythm-config">
          <div className="circle-header">
            <div className="circle-badge inner-badge">Inner</div>
            <div className="circle-beat-count">{innerBeats} Beats</div>
          </div>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                type="button"
                key={`inner-${num}`}
                className={`subdivision-button-container polyrhythm-choice ${innerBeats === num ? "active" : ""}`}
                onClick={() => !isTransitioning && debouncedSetSubdivisions(num, "inner")}
                disabled={isTransitioning}
                aria-label={`Set inner rhythm to ${num} beats`}
                aria-pressed={innerBeats === num}
                style={{
                  cursor: isTransitioning ? "not-allowed" : "pointer",
                  opacity: isTransitioning ? 0.7 : 1
                }}
              >
                <span className="beat-choice-number" aria-hidden="true">{num}</span>
              </button>
            ))}
          </div>
          {/* Phones show this stepper instead of the eight chips (CSS toggles). */}
          <div className="poly-stepper" role="group" aria-label="Inner beats">
            <button
              type="button"
              className="stepper-button"
              onClick={() => !isTransitioning && debouncedSetSubdivisions(Math.max(2, innerBeats - 1), "inner")}
              disabled={isTransitioning || innerBeats <= 2}
              aria-label="Fewer inner beats"
            >
              <span aria-hidden="true">&minus;</span>
            </button>
            <span className="stepper-count" aria-live="polite">{innerBeats}</span>
            <button
              type="button"
              className="stepper-button"
              onClick={() => !isTransitioning && debouncedSetSubdivisions(Math.min(9, innerBeats + 1), "inner")}
              disabled={isTransitioning || innerBeats >= 9}
              aria-label="More inner beats"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
        <div className="polyrhythm-config">
          <div className="circle-header">
            <div className="circle-badge outer-badge">Outer</div>
            <div className="circle-beat-count">{outerBeats} Beats</div>
          </div>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                type="button"
                key={`outer-${num}`}
                className={`subdivision-button-container polyrhythm-choice ${outerBeats === num ? "active" : ""}`}
                onClick={() => !isTransitioning && debouncedSetSubdivisions(num, "outer")}
                disabled={isTransitioning}
                aria-label={`Set outer rhythm to ${num} beats`}
                aria-pressed={outerBeats === num}
                style={{
                  cursor: isTransitioning ? "not-allowed" : "pointer",
                  opacity: isTransitioning ? 0.7 : 1
                }}
              >
                <span className="beat-choice-number" aria-hidden="true">{num}</span>
              </button>
            ))}
          </div>
          {/* Phones show this stepper instead of the eight chips (CSS toggles). */}
          <div className="poly-stepper" role="group" aria-label="Outer beats">
            <button
              type="button"
              className="stepper-button"
              onClick={() => !isTransitioning && debouncedSetSubdivisions(Math.max(2, outerBeats - 1), "outer")}
              disabled={isTransitioning || outerBeats <= 2}
              aria-label="Fewer outer beats"
            >
              <span aria-hidden="true">&minus;</span>
            </button>
            <span className="stepper-count" aria-live="polite">{outerBeats}</span>
            <button
              type="button"
              className="stepper-button"
              onClick={() => !isTransitioning && debouncedSetSubdivisions(Math.min(9, outerBeats + 1), "outer")}
              disabled={isTransitioning || outerBeats >= 9}
              aria-label="More outer beats"
            >
              <span aria-hidden="true">+</span>
            </button>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M7 16 3 12l4-4M3 12h18M17 8l4 4-4 4" />
          </svg>
        </button>
      </div>

      {/* Tempo and Volume */}
      <div className="sliders-container">
        <EditableSliderInput
          label="Tempo" value={tempo} setValue={setTempo} stepButtons
          min={30} max={240} step={1} disabled={isTransitioning}
          formatter={(value) => `${value} BPM`} parser={parseFloat}
        />
        <EditableSliderInput
          label="Volume" value={volume} setValue={setVolume}
          min={0} max={1} step={0.01} disabled={isTransitioning}
          formatter={(value) => `${Math.round(value * 100)}%`}
          parser={(value) => parseFloat(value) / 100}
        />
      </div>
      
    </div>
  );
};

export default withTrainingContainer(PolyrhythmMetronome);
