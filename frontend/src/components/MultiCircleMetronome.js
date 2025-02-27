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
// ActiveCircleMetronome Component
// ---------------------
function ActiveCircleMetronome({
  settings,
  isPaused,
  setIsPaused,
  tempo,
  setTempo,
  swing,
  volume,
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  analogMode,
  gridMode,
  onAccentChange,
  onLogicReady,
  onMeasureComplete
}) {
  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions: settings.subdivisions,
    setSubdivisions: () => {},
    isPaused,
    setIsPaused,
    swing,
    volume,
    accents: settings.accents,
    beatConfig: null,
    analogMode,
    gridMode,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    beatMultiplier: settings.beatMode === "quarter" ? 1 : 2
  });

  console.log("[ActiveCircleMetronome] Mounted. Settings:", settings);

  useEffect(() => {
    if (onLogicReady && logic.audioCtx) {
      console.log("[ActiveCircleMetronome] AudioContext ready");
      onLogicReady(logic.audioCtx);
    }
  }, [logic.audioCtx, onLogicReady]);

  // Ensure scheduler is started only once
  const didStartRef = useRef(false);
  useEffect(() => {
    if (isPaused) {
      console.log("[ActiveCircleMetronome] Paused. Stopping scheduler.");
      logic.stopScheduler();
      didStartRef.current = false;
    } else if (!didStartRef.current) {
      if (logic.audioCtx && logic.audioCtx.state === "suspended") {
        console.log("[ActiveCircleMetronome] Resuming audio context...");
        logic.audioCtx
          .resume()
          .then(() => {
            console.log("[ActiveCircleMetronome] AudioContext resumed. Starting scheduler.");
            logic.startScheduler();
            didStartRef.current = true;
          })
          .catch((err) => console.error("[ActiveCircleMetronome] Error resuming:", err));
      } else {
        console.log("[ActiveCircleMetronome] Starting scheduler.");
        logic.startScheduler();
        didStartRef.current = true;
      }
    }
  }, [isPaused, logic]);

  // Animation tick.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf;
    const animate = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-call onMeasureComplete when measure ends.
  const measureFiredRef = useRef(false);
  useEffect(() => {
    if (
      logic.currentSubdivision === 0 &&
      !measureFiredRef.current &&
      !isPaused &&
      onMeasureComplete
    ) {
      console.log("[ActiveCircleMetronome] Measure complete.");
      measureFiredRef.current = true;
      onMeasureComplete();
    }
    if (logic.currentSubdivision !== 0) {
      measureFiredRef.current = false;
    }
  }, [logic.currentSubdivision, isPaused, onMeasureComplete]);

  const iconSize = 24;
  const containerSize = Math.min(window.innerWidth - 40, 300);
  const radius = (containerSize - iconSize) / 2;

  const beatData = Array.from({ length: settings.subdivisions }, (_, i) => {
    const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
    const xPos = radius * Math.cos(angle);
    const yPos = radius * Math.sin(angle);
    const isActive =
      i === logic.currentSubdivision &&
      !isPaused &&
      logic.audioCtx &&
      logic.audioCtx.state === "running";
    let icon;
    if (i === 0) {
      icon = isActive ? firstBeatActive : firstBeat;
    } else {
      icon =
        settings.accents[i] === 2
          ? isActive
            ? accentedBeatActive
            : accentedBeat
          : isActive
          ? normalBeatActive
          : normalBeat;
    }
    return { i, xPos, yPos, icon };
  });

  return (
    <div style={{ position: "relative", width: containerSize, height: containerSize }}>
      {beatData.map((bd, i) => (
        <img
          key={i}
          src={bd.icon}
          alt={`Beat ${bd.i}`}
          onClick={() => {
            if (i !== 0 && onAccentChange) {
              console.log("[ActiveCircleMetronome] Updating accent for beat", bd.i);
              onAccentChange(bd.i);
            }
          }}
          style={{
            position: "absolute",
            left: `calc(50% + ${bd.xPos}px - ${iconSize / 2}px)`,
            top: `calc(50% + ${bd.yPos}px - ${iconSize / 2}px)`,
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            cursor: i === 0 ? "default" : "pointer"
          }}
        />
      ))}
    </div>
  );
}

// ---------------------
// MultiCircleMetronome Component
// ---------------------
export default function MultiCircleMetronome(props) {
  console.log("[MultiCircleMetronome] Mounted with props:", props);
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
  const currentSettings =
    circleSettings[activeCircle] ||
    { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" };

  // Ref to prevent duplicate scheduler starts.
  const schedulerStartedRef = useRef(false);

  // Add a new circle.
  const addCircle = () => {
    console.log("[MultiCircleMetronome] Adding new circle");
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

  // Switch active circle on preview click.
  const onCircleClick = (index) => {
    console.log("[MultiCircleMetronome] Switching active circle to index", index);
    setActiveCircle(index);
  };

  // Create metronome logic for the active circle.
  const logic = useMetronomeLogic({
    tempo: props.tempo,
    setTempo: props.setTempo,
    subdivisions: currentSettings.subdivisions,
    setSubdivisions: (newSub) => {
      setCircleSettings((prev) => {
        const updated = [...prev];
        updated[activeCircle] = {
          ...updated[activeCircle],
          subdivisions: newSub,
          accents: Array.from({ length: newSub }, (_, i) => (i === 0 ? 3 : 1))
        };
        return updated;
      });
    },
    isPaused: props.isPaused,
    setIsPaused: props.setIsPaused,
    swing: props.swing,
    volume: props.volume,
    accents: currentSettings.accents,
    analogMode: props.analogMode,
    gridMode: props.gridMode,
    macroMode: props.macroMode,
    speedMode: props.speedMode,
    measuresUntilMute: props.measuresUntilMute,
    muteDurationMeasures: props.muteDurationMeasures,
    muteProbability: props.muteProbability,
    tempoIncreasePercent: props.tempoIncreasePercent,
    measuresUntilSpeedUp: props.measuresUntilSpeedUp,
    beatMultiplier: currentSettings.beatMode === "quarter" ? 1 : 2
  });

  // Update accent on beat click.
  const updateAccent = (beatIndex) => {
    console.log("[MultiCircleMetronome] Updating accent for beat", beatIndex);
    setCircleSettings((prev) => {
      const updated = [...prev];
      const acc = [...updated[activeCircle].accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...updated[activeCircle], accents: acc };
      return updated;
    });
  };

  // Auto-cycle active circle at measure end.
  const prevSubdivisionRef = useRef(logic.currentSubdivision);
  useEffect(() => {
    if (
      prevSubdivisionRef.current !== null &&
      prevSubdivisionRef.current !== logic.currentSubdivision &&
      logic.currentSubdivision === 0
    ) {
      console.log("[MultiCircleMetronome] Measure ended. Auto-switching active circle.");
      setActiveCircle((prev) => (prev + 1) % circleSettings.length);
      schedulerStartedRef.current = false;
    }
    prevSubdivisionRef.current = logic.currentSubdivision;
  }, [logic.currentSubdivision, circleSettings.length]);

  // Container size.
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

  // Helper: renderActiveCircle – returns dynamic beat icons for the active circle.
  const renderActiveCircleHelper = () => {
    const iconSize = 24;
    const beatData = Array.from({ length: currentSettings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / currentSettings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      const isActive =
        i === logic.currentSubdivision &&
        !props.isPaused &&
        logic.audioCtx &&
        logic.audioCtx.state === "running";
      let icon;
      if (i === 0) {
        icon = isActive ? firstBeatActive : firstBeat;
      } else {
        icon =
          currentSettings.accents[i] === 2
            ? isActive ? accentedBeatActive : accentedBeat
            : isActive ? normalBeatActive : normalBeat;
      }
      return { i, xPos, yPos, icon };
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
          cursor: bd.i === 0 ? "default" : "pointer"
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

  // Helper: renderStaticCircle – returns static beat icons for an inactive circle.
  const renderStaticCircle = (settings, radius) => {
    const iconSize = 24;
    return Array.from({ length: settings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      const st = settings.accents[i] || 1;
      const icon = i === 0 ? firstBeat : st === 2 ? accentedBeat : normalBeat;
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
            height: `${iconSize}px`
          }}
        />
      );
    });
  };

  // Helper: renderAllCircles – returns an array of circle previews.
  const renderAllCircles = () => {
    return circleSettings.map((settings, idx) => {
      const isActive = idx === activeCircle;
      return (
        <div
          key={idx}
          onClick={() => onCircleClick(idx)}
          style={{
            position: "relative",
            width: containerSize,
            height: containerSize,
            border: isActive ? "3px solid #00A0A0" : "3px solid transparent",
            borderRadius: "50%",
            cursor: "pointer"
          }}
        >
          {isActive
            ? renderActiveCircleHelper()
            : renderStaticCircle(settings, radius)}
        </div>
      );
    });
  };

  // Handle play/pause with proper suspend/resume.
  const handlePlayPause = useCallback(() => {
    console.log("[MultiCircleMetronome] handlePlayPause invoked. Current isPaused:", props.isPaused);
    props.setIsPaused((prev) => {
      if (prev) {
        console.log("[MultiCircleMetronome] Resuming play.");
        if (logic.audioCtx && logic.audioCtx.state === "suspended") {
          logic.audioCtx
            .resume()
            .then(() => {
              console.log("[MultiCircleMetronome] AudioContext resumed. Starting scheduler.");
              logic.startScheduler();
            })
            .catch((err) =>
              console.error("[MultiCircleMetronome] Error resuming audio:", err)
            );
        } else {
          console.log("[MultiCircleMetronome] Starting scheduler.");
          logic.startScheduler();
        }
        return false;
      } else {
        console.log("[MultiCircleMetronome] Pausing play. Stopping scheduler and suspending audio.");
        logic.stopScheduler();
        if (logic.audioCtx && logic.audioCtx.state === "running") {
          logic.audioCtx
            .suspend()
            .then(() => console.log("[MultiCircleMetronome] AudioContext suspended."))
            .catch((err) =>
              console.error("[MultiCircleMetronome] Error suspending audio:", err)
            );
        }
        return true;
      }
    });
  }, [logic]);

  useKeyboardShortcuts({
    onTogglePlayPause: handlePlayPause,
    onTapTempo: logic.tapTempo
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const previewContainerStyle = {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "20px"
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
        >
          <img
            src={props.isPaused ? playIcon : pauseIcon}
            alt={props.isPaused ? "Play" : "Pause"}
            style={{ width: "36px", height: "36px", objectFit: "contain" }}
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
            lineHeight: "50px"
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
