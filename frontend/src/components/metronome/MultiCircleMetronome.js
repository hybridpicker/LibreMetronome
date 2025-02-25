// File: src/components/metronome/MultiCircleMetronome.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import useMetronomeLogic from "../../hooks/useMetronomeLogic";
import useKeyboardShortcuts from "../../hooks/useKeyboardShortcuts";
import firstBeat from "../../assets/svg/firstBeat.svg";
import firstBeatActive from "../../assets/svg/firstBeatActive.svg";
import normalBeat from "../../assets/svg/normalBeat.svg";
import normalBeatActive from "../../assets/svg/normalBeatActive.svg";
import accentedBeat from "../../assets/svg/accentedBeat.svg";
import accentedBeatActive from "../../assets/svg/accentedBeatActive.svg";
import playIcon from "../../assets/svg/play.svg";
import pauseIcon from "../../assets/svg/pause.svg";
import tapButtonIcon from "../../assets/svg/tap-button.svg";
import SubdivisionSelector from "./SubdivisionSelector";

const MultiCircleMetronome = (props) => {
  const [circleSettings, setCircleSettings] = useState([
    {
      subdivisions: props.subdivisions || 4,
      accents: Array.from({ length: props.subdivisions || 4 }, (_, i) => (i === 0 ? 3 : 1)),
      beatMode: "quarter"
    }
  ]);
  const [activeCircle, setActiveCircle] = useState(0);
  const currentSettings =
    circleSettings[activeCircle] ||
    { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" };

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

  const updateAccent = (beatIndex) => {
    setCircleSettings((prev) => {
      const updated = [...prev];
      const acc = [...updated[activeCircle].accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 3;
      updated[activeCircle] = { ...updated[activeCircle], accents: acc };
      return updated;
    });
  };

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

  const renderActiveCircle = () => {
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
      const icon =
        i === 0
          ? isActive ? firstBeatActive : firstBeat
          : currentSettings.accents[i] === 2
          ? isActive ? accentedBeatActive : accentedBeat
          : isActive ? normalBeatActive : normalBeat;
      return { i, xPos, yPos, icon };
    });
    return beatData.map((bd) => (
      <img
        key={bd.i}
        src={bd.icon}
        alt={`Beat ${bd.i}`}
        onClick={() => { if (bd.i !== 0) updateAccent(bd.i); }}
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

  const renderCirclePreview = (settings) => {
    const iconSize = 24;
    const beatData = Array.from({ length: settings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      const icon = i === 0 ? firstBeat : (settings.accents[i] === 2 ? accentedBeat : normalBeat);
      return { i, xPos, yPos, icon };
    });
    return beatData.map((bd) => (
      <img
        key={bd.i}
        src={bd.icon}
        alt={`Beat ${bd.i}`}
        style={{
          position: "absolute",
          left: `calc(50% + ${bd.xPos}px - 12px)`,
          top: `calc(50% + ${bd.yPos}px - 12px)`,
          width: "24px",
          height: "24px"
        }}
      />
    ));
  };

  const renderAllCircles = () => {
    return circleSettings.map((settings, idx) => (
      <div
        key={idx}
        onClick={() => setActiveCircle(idx)}
        style={{
          position: "relative",
          width: containerSize,
          height: containerSize,
          border: idx === activeCircle ? "3px solid #00A0A0" : "3px solid transparent",
          borderRadius: "50%",
          cursor: "pointer"
        }}
      >
        {idx === activeCircle ? renderActiveCircle() : renderCirclePreview(settings)}
      </div>
    ));
  };

  const handlePlayPause = useCallback(() => {
    props.setIsPaused((prev) => {
      if (prev) {
        if (logic.audioCtx && logic.audioCtx.state === "suspended") {
          logic.audioCtx.resume().then(() => {
            logic.startScheduler();
          });
        } else {
          logic.startScheduler();
        }
        return false;
      } else {
        logic.stopScheduler();
        if (logic.audioCtx && logic.audioCtx.state === "running") {
          logic.audioCtx.suspend();
        }
        return true;
      }
    });
  }, [logic]);

  useKeyboardShortcuts({
    onTogglePlayPause: handlePlayPause,
    onTapTempo: logic.tapTempo
  });

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "20px" }}>
        {renderAllCircles()}
      </div>
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "20px" }}>
        <button onClick={handlePlayPause} style={{ background: "transparent", border: "none", cursor: "pointer" }} aria-label="Toggle Play/Pause">
          <img src={props.isPaused ? playIcon : pauseIcon} alt={props.isPaused ? "Play" : "Pause"} style={{ width: "36px", height: "36px" }} />
        </button>
        <button
          onClick={() => {
            setCircleSettings(prev => [
              ...prev,
              {
                subdivisions: props.subdivisions || 4,
                accents: Array.from({ length: props.subdivisions || 4 }, (_, i) => (i === 0 ? 3 : 1)),
                beatMode: "quarter"
              }
            ]);
          }}
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
      <SubdivisionSelector subdivisions={currentSettings.subdivisions} onSelect={(num) => {
        setCircleSettings(prev => {
          const updated = [...prev];
          updated[activeCircle] = { ...updated[activeCircle], subdivisions: num, accents: Array.from({ length: num }, (_, i) => (i === 0 ? 3 : 1)) };
          return updated;
        });
      }} />
      {/* (Additional note selectors and global sliders can be added here.) */}
      {window.innerWidth < 768 && (
        <button onClick={logic.tapTempo} style={{ background: "transparent", border: "none", cursor: "pointer", marginTop: "20px" }} aria-label="Tap Tempo">
          <img src={tapButtonIcon} alt="Tap Tempo" style={{ height: "35px", objectFit: "contain" }} />
        </button>
      )}
    </div>
  );
};

export default MultiCircleMetronome;
