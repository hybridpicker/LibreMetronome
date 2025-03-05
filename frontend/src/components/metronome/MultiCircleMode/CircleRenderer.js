// src/components/metronome/MultiCircleMode/CircleRenderer.js
import React from 'react';
import firstBeat from "../../../assets/svg/firstBeat.svg";
import firstBeatActive from "../../../assets/svg/firstBeatActive.svg";
import normalBeat from "../../../assets/svg/normalBeat.svg";
import normalBeatActive from "../../../assets/svg/normalBeatActive.svg";
import accentedBeat from "../../../assets/svg/accentedBeat.svg";
import accentedBeatActive from "../../../assets/svg/accentedBeatActive.svg";

const CircleRenderer = ({
  settings,
  idx,
  isActiveUI,
  isPlaying,
  currentSubdivision,
  isPaused,
  audioCtxRunning,
  isTransitioning,
  updateAccent,
  radius,
  containerSize,
  setActiveCircle,
  circleSettings,
  macroMode,
  isSilencePhaseRef,
  isMobile
}) => {
  // Add visual indicators for different states
  let activeBoxShadow = isActiveUI
    ? "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)"
    : isPlaying
      ? isTransitioning 
        ? "0 0 0 3px #FFA500, 0 0 10px rgba(255, 165, 0, 0.6)" // Orange for transition
        : "0 0 0 3px #FFD700, 0 0 10px rgba(255, 215, 0, 0.6)" // Gold for normal playing
      : "none";
  
  // Add visual indicator for silence phase
  if (isPlaying && macroMode !== 0 && isSilencePhaseRef?.current) {
    activeBoxShadow = "0 0 0 3px #ff5722, 0 0 10px rgba(255, 87, 34, 0.6)";
  }
  
  const iconSize = 24;
  const beats = Array.from({ length: settings.subdivisions }, (_, i) => {
    const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
    const xPos = radius * Math.cos(angle);
    const yPos = radius * Math.sin(angle);
    
    // Show active beat regardless of transition state to ensure visual feedback matches audio
    const isActive = i === currentSubdivision &&
                     isPlaying &&
                     !isPaused &&
                     audioCtxRunning;
    
    let icon;
    if (i === 0) {
      icon = isActive ? firstBeatActive : firstBeat;
    } else {
      const accent = settings.accents?.[i] || 1;
      icon = accent === 2
        ? isActive ? accentedBeatActive : accentedBeat
        : isActive ? normalBeatActive : normalBeat;
    }
    
    // Add a subtle pulse animation during transitions
    const transitionStyle = isTransitioning && isPlaying ? {
      animation: 'pulse 1s infinite',
      '@keyframes pulse': {
        '0%': { opacity: 0.7 },
        '50%': { opacity: 1 },
        '100%': { opacity: 0.7 }
      }
    } : {};
    
    return (
      <img
        key={i}
        src={icon}
        alt={`Beat ${i}`}
        onClick={() => { if (isActiveUI && i !== 0) updateAccent(i); }}
        className={`beat-icon ${isActive ? 'beat-icon-active' : ''} ${isTransitioning && isPlaying ? 'transitioning' : ''}`}
        style={{
          position: "absolute",
          left: `calc(50% + ${xPos}px - ${iconSize / 2}px)`,
          top: `calc(50% + ${yPos}px - ${iconSize / 2}px)`,
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          cursor: isActiveUI && i !== 0 ? "pointer" : "default",
          filter: isActive ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))" : "none",
          transition: "filter 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
          ...transitionStyle
        }}
      />
    );
  });
  
  // Add a remove button if there's more than one circle
  if (circleSettings?.length > 1) {
    const removeButton = (
      <div
        key="remove-button"
        onClick={(e) => {
          e.stopPropagation();
          updateAccent('remove', idx);
        }}
        className="remove-circle-button"
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
    
    // Add a subtle indicator for the beat mode
    // eslint-disable-next-line no-unused-vars
    const beatModeIndicator = (
      <div
        key="beat-mode-indicator"
        style={{
          position: "absolute",
          bottom: "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "12px",
          fontWeight: "bold",
          color: isPlaying ? "#FFD700" : "#00A0A0",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "2px 8px",
          borderRadius: "10px",
          zIndex: 5
        }}
      >
        {settings.beatMode === "quarter" ? "♩" : "♪"}
      </div>
    );
    
    return (
      <div
        onClick={() => setActiveCircle(idx)}
        style={{
          position: "relative",
          width: containerSize,
          height: containerSize,
          borderRadius: "50%",
          border: "2px solid transparent",
          boxShadow: activeBoxShadow,
          margin: isMobile ? "15px 0" : "15px",
          transition: "box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
          cursor: "pointer",
          overflow: "visible"
        }}
      >
        {removeButton}
        {beats}
      </div>
    );
  }

  return (
    <div
      onClick={() => setActiveCircle(idx)}
      style={{
        position: "relative",
        width: containerSize,
        height: containerSize,
        borderRadius: "50%",
        border: "2px solid transparent",
        boxShadow: activeBoxShadow,
        margin: isMobile ? "15px 0" : "15px",
        transition: "box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
        cursor: "pointer",
        overflow: "visible"
      }}
    >
      {beats}
    </div>
  );
};

export default CircleRenderer;