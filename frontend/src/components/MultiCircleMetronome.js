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

// Other icons
import tapButtonIcon from "../assets/svg/tap-button.svg";
import playIcon from "../assets/svg/play.svg";
import pauseIcon from "../assets/svg/pause.svg";

// Subdivision icons
import subdivision1 from "../assets/svg/subdivision-1.svg";
import subdivision1Active from "../assets/svg/subdivision-1Active.svg";
import subdivision2 from "../assets/svg/subdivision-2.svg";
import subdivision2Active from "../assets/svg/subdivision-2Active.svg";
import subdivision3 from "../assets/svg/subdivision-3.svg";
import subdivision3Active from "../assets/svg/subdivision-3-Active.svg";
import subdivision4 from "../assets/svg/subdivision-4.svg";
import subdivision4Active from "../assets/svg/subdivision-4Active.svg";
import subdivision5 from "../assets/svg/subdivision-5.svg";
import subdivision5Active from "../assets/svg/subdivision-5Active.svg";
import subdivision6 from "../assets/svg/subdivision-6.svg";
import subdivision6Active from "../assets/svg/subdivision-6Active.svg";
import subdivision7 from "../assets/svg/subdivision-7.svg";
import subdivision7Active from "../assets/svg/subdivision-7Active.svg";
import subdivision8 from "../assets/svg/subdivision-8.svg";
import subdivision8Active from "../assets/svg/subdivision-8Active.svg";
import subdivision9 from "../assets/svg/subdivision-9.svg";
import subdivision9Active from "../assets/svg/subdivision-9Active.svg";

// Quarter/eighth note icons
import quarterNotesActive from "../assets/svg/quarter_eight_notes/quarterNotesActive.svg";
import eighthNotesActive from "../assets/svg/quarter_eight_notes/eightNotesActive.svg";

const MAX_CIRCLES = 3;

export default function MultiCircleMetronome(props) {
  // ----------------------------------------------------------------
  // 1) Multiple circles: each has subdivisions, accents, beatMode
  // ----------------------------------------------------------------
  const [circleSettings, setCircleSettings] = useState([
    {
      subdivisions: props.subdivisions || 4,
      accents: Array.from({ length: props.subdivisions || 4 }, (_, i) => (i === 0 ? 3 : 1)),
      beatMode: "quarter", // or "eighth"
    },
  ]);
  const [activeCircle, setActiveCircle] = useState(0);    // which circle’s UI is active
  const [playingCircle, setPlayingCircle] = useState(0);  // which circle is actually playing

  const currentSettings = circleSettings[activeCircle] || {
    subdivisions: 4,
    accents: [3, 1, 1, 1],
    beatMode: "quarter",
  };

  // If a circle is "playing," we store that circle’s settings in a ref
  const playingSettingsRef = useRef(circleSettings[playingCircle]);
  useEffect(() => {
    playingSettingsRef.current = circleSettings[playingCircle];
  }, [playingCircle, circleSettings]);

  const isTransitioningRef = useRef(false);
  const lastCircleSwitchCheckTimeRef = useRef(0);
  const measureCountRef = useRef(0);
  const isProcessingPlayPauseRef = useRef(false);

  // ----------------------------------------------------------------
  // 2) Metronome Logic Hook
  //    => "beatMultiplier" is 1 if quarter, 2 if eighth (double tempo)
  // ----------------------------------------------------------------
  const logic = useMetronomeLogic({
    tempo: props.tempo,
    setTempo: props.setTempo,
    subdivisions: playingSettingsRef.current.subdivisions,
    setSubdivisions: () => {}, // not used here
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

    // If beatMode="quarter", multiplier=1; if "eighth", multiplier=2 => double tempo
    beatMultiplier: playingSettingsRef.current.beatMode === "quarter" ? 1 : 2,
    multiCircleMode: true,
  });

  // ----------------------------------------------------------------
  // 3) Re-schedule the metronome if playing circle’s beatMode changes
  //    => gives immediate tempo switch
  // ----------------------------------------------------------------
  const prevBeatModeRef = useRef(circleSettings[playingCircle].beatMode);

  useEffect(() => {
    const newBeatMode = circleSettings[playingCircle].beatMode;
    if (newBeatMode !== prevBeatModeRef.current) {
      console.log(
        `%c[MultiCircleMetronome] BeatMode changed from "${prevBeatModeRef.current}" to "${newBeatMode}" on playing circle ${playingCircle}. Re-scheduling...`,
        "color: orange; font-weight: bold;"
      );
      prevBeatModeRef.current = newBeatMode;

      // If the metronome is currently running, stop & restart so it picks up the new multiplier
      if (!props.isPaused) {
        logic.stopScheduler();
        logic.startScheduler();
      }
    }
  }, [circleSettings, playingCircle, props.isPaused, logic]);

  // ----------------------------------------------------------------
  // 4) Sizing for circles
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // 5) Subdivision by keyboard (just changes the active circle)
  // ----------------------------------------------------------------
  const handleSetSubdivisions = useCallback(
    (val) => {
      if (val < 1 || val > 9) return;
      setCircleSettings((prev) => {
        const updated = [...prev];
        updated[activeCircle] = {
          ...updated[activeCircle],
          subdivisions: val,
          accents: Array.from({ length: val }, (_, i) => (i === 0 ? 3 : 1)),
        };
        return updated;
      });
    },
    [activeCircle]
  );

  // ----------------------------------------------------------------
  // 6) Add / Remove circles
  // ----------------------------------------------------------------
  const addCircle = () => {
    setCircleSettings((prev) => {
      if (prev.length >= MAX_CIRCLES) return prev;
      return [
        ...prev,
        {
          subdivisions: props.subdivisions || 4,
          accents: Array.from({ length: props.subdivisions || 4 }, (_, i) => (i === 0 ? 3 : 1)),
          beatMode: "quarter",
        },
      ];
    });
  };

  const removeCircle = (idx) => {
    if (circleSettings.length <= 1) return;
    setCircleSettings((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated;
    });
    if (activeCircle === idx) {
      setActiveCircle(0);
    } else if (activeCircle > idx) {
      setActiveCircle(activeCircle - 1);
    }
    if (playingCircle === idx) {
      setPlayingCircle(0);
    } else if (playingCircle > idx) {
      setPlayingCircle(playingCircle - 1);
    }
  };

  // ----------------------------------------------------------------
  // 7) Accents
  // ----------------------------------------------------------------
  const updateAccent = (beatIndex) => {
    setCircleSettings((prev) => {
      const updated = [...prev];
      const acc = [...updated[activeCircle].accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...updated[activeCircle], accents: acc };
      return updated;
    });
  };

  // ----------------------------------------------------------------
  // 8) Multi-circle measure switching
  // ----------------------------------------------------------------
  const prevSubdivisionRef = useRef(null);
  const handleSubdivisionChange = useCallback(
    (newSub) => {
      if (props.isPaused || circleSettings.length <= 1) return;

      // Whenever we hit sub=0 => new measure
      if (
        prevSubdivisionRef.current != null &&
        prevSubdivisionRef.current !== newSub &&
        newSub === 0 &&
        !isTransitioningRef.current
      ) {
        measureCountRef.current += 1;
        const now = Date.now();
        if (now - lastCircleSwitchCheckTimeRef.current < 500) return;
        lastCircleSwitchCheckTimeRef.current = now;

        isTransitioningRef.current = true;
        const nextCircleIndex = (playingCircle + 1) % circleSettings.length;
        playingSettingsRef.current = circleSettings[nextCircleIndex];
        setPlayingCircle(nextCircleIndex);

        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 100);
      }
      prevSubdivisionRef.current = newSub;
    },
    [props.isPaused, circleSettings, playingCircle]
  );

  useEffect(() => {
    if (!props.isPaused && logic.currentSubdivision !== undefined) {
      handleSubdivisionChange(logic.currentSubdivision);
    }
  }, [logic.currentSubdivision, handleSubdivisionChange, props.isPaused, logic]);

  // ----------------------------------------------------------------
  // 9) Rendering each circle
  // ----------------------------------------------------------------
  const renderCircle = (settings, idx, isActiveUI, isPlaying) => {
    const iconSize = 24;
    const beats = Array.from({ length: settings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);

      const isActiveBeat =
        i === logic.currentSubdivision &&
        isPlaying &&
        !props.isPaused &&
        logic.audioCtx &&
        logic.audioCtx.state === "running" &&
        !isTransitioningRef.current;

      let icon;
      if (i === 0) {
        icon = isActiveBeat ? firstBeatActive : firstBeat;
      } else {
        const accent = settings.accents[i] || 1;
        icon =
          accent === 2
            ? isActiveBeat
              ? accentedBeatActive
              : accentedBeat
            : isActiveBeat
            ? normalBeatActive
            : normalBeat;
      }

      return (
        <img
          key={i}
          src={icon}
          alt={`Beat ${i}`}
          onClick={() => {
            // Change accent only if this circle is "active"
            if (isActiveUI && i !== 0) {
              updateAccent(i);
            }
          }}
          style={{
            position: "absolute",
            left: `calc(50% + ${xPos}px - ${iconSize / 2}px)`,
            top: `calc(50% + ${yPos}px - ${iconSize / 2}px)`,
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            cursor: isActiveUI && i !== 0 ? "pointer" : "default",
            filter: isActiveBeat ? "drop-shadow(0 0 5px rgba(255,255,255,0.7))" : "none",
            transition: "filter 0.15s",
          }}
        />
      );
    });

    // A "remove circle" button if we have more than 1 circle
    const removeButton =
      circleSettings.length > 1 ? (
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
            color: "#fff",
            fontSize: "20px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 5px rgba(0,0,0,0.3)",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          -
        </div>
      ) : null;

    return [removeButton, ...beats];
  };

  // ----------------------------------------------------------------
  // 10) Render quarter/eighth notes
  // ----------------------------------------------------------------
  const renderNotesSelector = () => {
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
        {/* Quarter icon */}
        <img
          src={quarterNotesActive}
          alt="Quarter Notes"
          onClick={() => {
            console.log(`[MultiCircleMetronome] Setting circle ${activeCircle} to QUARTER notes`);
            setCircleSettings((prev) => {
              const updated = [...prev];
              updated[activeCircle] = { ...updated[activeCircle], beatMode: "quarter" };
              return updated;
            });
          }}
          style={{
            cursor: "pointer",
            width: "45px",
            height: "45px",
            opacity: currentSettings.beatMode === "quarter" ? 1 : 0.5,
            filter:
              currentSettings.beatMode === "quarter"
                ? "drop-shadow(0 0 5px rgba(0,160,160,0.5))"
                : "none",
            transition: "transform 0.15s",
            transform: currentSettings.beatMode === "quarter" ? "scale(1.1)" : "scale(1)",
          }}
        />

        {/* Eighth icon */}
        <img
          src={eighthNotesActive}
          alt="Eighth Notes"
          onClick={() => {
            console.log(`[MultiCircleMetronome] Setting circle ${activeCircle} to EIGHTH notes`);
            setCircleSettings((prev) => {
              const updated = [...prev];
              updated[activeCircle] = { ...updated[activeCircle], beatMode: "eighth" };
              return updated;
            });
          }}
          style={{
            cursor: "pointer",
            width: "45px",
            height: "45px",
            opacity: currentSettings.beatMode === "eighth" ? 1 : 0.5,
            filter:
              currentSettings.beatMode === "eighth"
                ? "drop-shadow(0 0 5px rgba(0,160,160,0.5))"
                : "none",
            transition: "transform 0.15s",
            transform: currentSettings.beatMode === "eighth" ? "scale(1.1)" : "scale(1)",
          }}
        />
      </div>
    );
  };

  // ----------------------------------------------------------------
  // 11) Render subdivision icons
  // ----------------------------------------------------------------
  const renderSubdivisionSelector = () => {
    const subIcons = [subdivision1, subdivision2, subdivision3, subdivision4, subdivision5, subdivision6, subdivision7, subdivision8, subdivision9];
    const subIconsActive = [
      subdivision1Active,
      subdivision2Active,
      subdivision3Active,
      subdivision4Active,
      subdivision5Active,
      subdivision6Active,
      subdivision7Active,
      subdivision8Active,
      subdivision9Active,
    ];
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
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
                console.log(`[MultiCircleMetronome] Setting circle ${activeCircle} to ${subVal} subdivisions`);
                setCircleSettings((prev) => {
                  const updated = [...prev];
                  updated[activeCircle] = {
                    ...updated[activeCircle],
                    subdivisions: subVal,
                    accents: Array.from({ length: subVal }, (_, i) => (i === 0 ? 3 : 1)),
                  };
                  return updated;
                });
              }}
              style={{
                cursor: "pointer",
                width: "36px",
                height: "36px",
                transition: "transform 0.15s",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                filter: isActive ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none",
              }}
            />
          );
        })}
      </div>
    );
  };

  // ----------------------------------------------------------------
  // 12) Render all circles
  // ----------------------------------------------------------------
  const renderAllCircles = () => {
    return circleSettings.map((settings, idx) => {
      const isActiveUI = idx === activeCircle;
      const isPlayingNow = idx === playingCircle && !props.isPaused;
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
              ? "0 0 0 3px #00A0A0, 0 0 10px rgba(0,160,160,0.6)"
              : isPlayingNow
              ? "0 0 0 3px #FFD700, 0 0 10px rgba(255,215,0,0.6)"
              : "none",
            margin: isMobile ? "15px 0" : "15px",
            transition: "box-shadow 0.3s",
            cursor: "pointer",
            overflow: "visible",
          }}
        >
          {renderCircle(settings, idx, isActiveUI, isPlayingNow)}
        </div>
      );
    });
  };

  // ----------------------------------------------------------------
  // 13) Play / Pause
  // ----------------------------------------------------------------
  const handlePlayPause = useCallback(() => {
    if (isProcessingPlayPauseRef.current) return;
    isProcessingPlayPauseRef.current = true;
    const safetyTimeout = setTimeout(() => {
      isProcessingPlayPauseRef.current = false;
    }, 2000);

    props.setIsPaused((prev) => {
      if (prev) {
        // If AudioContext is suspended, attempt to resume it
        if (logic.audioCtx && logic.audioCtx.state === "suspended") {
          logic.audioCtx
            .resume()
            .then(() => {
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout);
            })
            .catch(() => {
              isProcessingPlayPauseRef.current = false;
              clearTimeout(safetyTimeout);
            });
        } else {
          isProcessingPlayPauseRef.current = false;
          clearTimeout(safetyTimeout);
        }
        console.log("[MultiCircleMetronome] Play pressed");
        return false; // => not paused
      } else {
        isProcessingPlayPauseRef.current = false;
        clearTimeout(safetyTimeout);
        console.log("[MultiCircleMetronome] Pause pressed");
        return true;  // => paused
      }
    });
  }, [logic.audioCtx, props]);

  // Optional: register external handlers
  useEffect(() => {
    if (props.registerTogglePlay) {
      props.registerTogglePlay(handlePlayPause);
    }
    if (props.registerTapTempo && logic.tapTempo) {
      props.registerTapTempo(logic.tapTempo);
    }
  }, [handlePlayPause, logic.tapTempo, props.registerTogglePlay, props.registerTapTempo]);

  // ----------------------------------------------------------------
  // 14) Keyboard shortcuts
  // ----------------------------------------------------------------
  useKeyboardShortcuts({
    onTogglePlayPause: () => {
      if (!isProcessingPlayPauseRef.current) {
        handlePlayPause();
      }
    },
    onTapTempo: logic.tapTempo,
    onSetSubdivisions: handleSetSubdivisions,
  });

  // ----------------------------------------------------------------
  // 15) FINAL RENDER
  //     "Notes" row, then "Subdivisions", then Sliders
  // ----------------------------------------------------------------
  return (
    <div style={{ textAlign: "center" }}>
      {/* -- Circles layout -- */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "20px",
          width: "100%",
          flexWrap: "wrap",
        }}
      >
        {renderAllCircles()}

        {/* Add Circle */}
        {circleSettings.length < MAX_CIRCLES && (
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
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "#00A0A0",
                color: "#fff",
                fontSize: "36px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 8px rgba(0,160,160,0.5)",
              }}
            >
              +
            </div>
          </div>
        )}
      </div>

      {/* -- Play/Pause Button -- */}
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "20px" }}>
        <button
          type="button"
          onClick={handlePlayPause}
          aria-label="Toggle Play/Pause"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <img
            src={props.isPaused ? playIcon : pauseIcon}
            alt={props.isPaused ? "Play" : "Pause"}
            style={{ width: "36px", height: "36px" }}
          />
        </button>
      </div>

      {/* -- Notes (Quarter/Eighth) -- */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <h3>Notes (Circle {activeCircle + 1})</h3>
        {renderNotesSelector()}
      </div>

      {/* -- Subdivisions -- */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <h3>Subdivisions (Circle {activeCircle + 1})</h3>
        {renderSubdivisionSelector()}
      </div>

      {/* -- Sliders: Swing, Volume, Tempo -- */}
      <div className="sliders-container" style={{ marginTop: "20px", width: "100%", maxWidth: "300px", margin: "0 auto" }}>
        {/* Swing (only if even subdivisions) */}
        <div style={{ marginBottom: "10px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
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

        {/* Volume */}
        <div style={{ marginBottom: "10px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
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

        {/* Tempo */}
        <div style={{ maxWidth: "300px", margin: "0 auto", width: "100%" }}>
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

      {/* -- Tap Tempo on mobile -- */}
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          style={{ background: "transparent", border: "none", cursor: "pointer", marginTop: "20px" }}
          aria-label="Tap Tempo"
        >
          <img src={tapButtonIcon} alt="Tap Tempo" style={{ height: "35px" }} />
        </button>
      )}
    </div>
  );
}
