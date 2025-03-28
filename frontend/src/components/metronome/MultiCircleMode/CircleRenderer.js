import React from 'react';
import firstBeat from "../../../assets/svg/firstBeat.svg";
import firstBeatActive from "../../../assets/svg/firstBeatActive.svg";
import normalBeat from "../../../assets/svg/normalBeat.svg";
import normalBeatActive from "../../../assets/svg/normalBeatActive.svg";
import accentedBeat from "../../../assets/svg/accentedBeat.svg";
import accentedBeatActive from "../../../assets/svg/accentedBeatActive.svg";
import { getSubdivisionIcon } from "../../../assets/svg/subdivisionIcons";

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
  radius,    // We'll use this directly now
  containerSize,
  setActiveCircle,
  circleSettings,
  macroMode,
  isSilencePhaseRef,
  isMobile
}) => {
  // Add visual indicators for different states
  let activeBoxShadow = "none"; // Default - no highlight
  
  // Calculate actual circle size - make it smaller
  // When in multi-circle mode (circleSettings?.length > 1), use a smaller circle
  const actualContainerSize = circleSettings?.length > 1 ? containerSize * 0.7 : containerSize;
  
  // Adjust the radius for beat positioning - make it smaller to match the container
  const actualRadius = circleSettings?.length > 1 ? radius * 0.7 : radius;
  
  if (isActiveUI) {
    // Circle is selected for editing - teal highlight
    activeBoxShadow = "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)";
  }
  
  if (isPlaying) {
    // Circle is currently playing - teal highlight (takes precedence)
    activeBoxShadow = isTransitioning 
      ? "0 0 0 3px #00A0A0, 0 0 15px rgba(0, 160, 160, 0.7)" // Teal with glow for transition
      : "0 0 0 4px #00A0A0, 0 0 15px rgba(0, 160, 160, 0.8)"; // Bolder teal for playing
  }
  
  // Add visual indicator for silence phase
  if (isPlaying && macroMode !== 0 && isSilencePhaseRef?.current) {
    activeBoxShadow = "0 0 0 3px #ff5722, 0 0 10px rgba(255, 87, 34, 0.6)";
  }
  
  // Determine border style - dashed for inactive, non-playing circles
  const borderStyle = (!isActiveUI && !isPlaying) ? "dashed" : "solid";

  // Add a visible guide circle to help visualize beat positions
  const circleGuide = circleSettings?.length > 1 && (
    <div 
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        border: "1px dashed rgba(0, 160, 160, 0.3)",
        left: 0,
        top: 0,
        pointerEvents: "none",
      }}
    />
  );

  const iconSize = 24;
  const beats = Array.from({ length: settings.subdivisions || 4 }, (_, i) => {
    const angle = (2 * Math.PI * i) / (settings.subdivisions || 4) - Math.PI / 2;
    
    // Use actualRadius for positioning beats
    const xPos = actualRadius * Math.cos(angle);
    const yPos = actualRadius * Math.sin(angle);
    
    // Show active beat regardless of transition state to ensure visual feedback matches audio
    const isActive = i === currentSubdivision &&
                     isPlaying &&
                     !isPaused &&
                     audioCtxRunning;
    
    // Fix: Safely access accents array with fallbacks
    const accents = settings.accents || [];
    const beatState = i < accents.length ? accents[i] : (i === 0 ? 3 : 1);
    
    // For muted beats (state 0), render a placeholder that can be clicked
    if (beatState === 0) {
      return (
        <div
          key={i}
          onClick={() => { 
            if (isActiveUI) updateAccent(i); 
          }}
          style={{
            position: "absolute",
            left: `calc(50% + ${xPos}px - 12px)`,
            top: `calc(50% + ${yPos}px - 12px)`,
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "2px dashed rgb(0, 160, 160)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "rgb(204, 204, 204)",
            fontSize: "14px",
            cursor: isActiveUI ? "pointer" : "default",
            transition: "0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
            zIndex: 5 // Ensure it's visible above other elements
          }}
        >
          +
        </div>
      );
    }
    
    let icon;
    if (beatState === 3) {
      icon = isActive ? firstBeatActive : firstBeat;
    } else if (beatState === 2) {
      icon = isActive ? accentedBeatActive : accentedBeat;
    } else {
      icon = isActive ? normalBeatActive : normalBeat;
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
        onClick={() => { if (isActiveUI) updateAccent(i); }}
        className={`beat-icon ${isActive ? 'beat-icon-active' : ''} ${isTransitioning && isPlaying ? 'transitioning' : ''}`}
        style={{
          position: "absolute",
          left: `calc(50% + ${xPos}px - ${iconSize / 2}px)`,
          top: `calc(50% + ${yPos}px - ${iconSize / 2}px)`,
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          cursor: isActiveUI ? "pointer" : "default",
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
    
    // Use subdivision icons for the beats per bar indicator
    const beatModeIndicator = (
      <div
        key="beat-mode-indicator"
        style={{
          position: "absolute",
          bottom: "-38px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "5px 10px",
          borderRadius: "12px",
          zIndex: 5,
          border: "1px solid #eee",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <img 
          src={isActiveUI || isPlaying 
            ? getSubdivisionIcon(settings.subdivisions, true) 
            : getSubdivisionIcon(settings.subdivisions, false)}
          alt={`${settings.subdivisions} beats`}
          style={{
            width: "24px",
            height: "24px",
            transition: "transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
            transform: (isActiveUI || isPlaying) ? "scale(1.1)" : "scale(1)",
            filter: (isActiveUI || isPlaying) ? "drop-shadow(0 0 3px rgba(0, 160, 160, 0.5))" : "none"
          }}
        />
      </div>
    );
    
    return (
      <div
        onClick={() => setActiveCircle(idx)}
        style={{
          position: "relative",
          width: actualContainerSize,
          height: actualContainerSize,
          borderRadius: "50%",
          border: `2px ${borderStyle} ${(!isActiveUI && !isPlaying) ? "#ccc" : "transparent"}`,
          boxShadow: activeBoxShadow,
          margin: isMobile ? "15px 0 38px 0" : "15px 15px 38px 15px",
          transition: "box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), border 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
          cursor: "pointer",
          overflow: "visible"
        }}
      >
        {circleGuide}
        {removeButton}
        {beatModeIndicator}
        {beats}
      </div>
    );
  }

  return (
    <div
      onClick={() => setActiveCircle(idx)}
      style={{
        position: "relative",
        width: containerSize, // Keep original size for single circle
        height: containerSize,
        borderRadius: "50%",
        border: `2px ${borderStyle} ${(!isActiveUI && !isPlaying) ? "#ccc" : "transparent"}`,
        boxShadow: activeBoxShadow,
        margin: isMobile ? "15px 0 38px 0" : "15px 15px 38px 15px",
        transition: "box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), border 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
        cursor: "pointer",
        overflow: "visible"
      }}
    >
      {/* Use subdivision icon for single circle too */}
      <div
        style={{
          position: "absolute",
          bottom: "-38px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "5px 10px",
          borderRadius: "12px",
          zIndex: 5,
          border: "1px solid #eee",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <img 
          src={isActiveUI || isPlaying 
            ? getSubdivisionIcon(settings.subdivisions, true) 
            : getSubdivisionIcon(settings.subdivisions, false)}
          alt={`${settings.subdivisions} beats`}
          style={{
            width: "24px",
            height: "24px",
            transition: "transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
            transform: (isActiveUI || isPlaying) ? "scale(1.1)" : "scale(1)",
            filter: (isActiveUI || isPlaying) ? "drop-shadow(0 0 3px rgba(0, 160, 160, 0.5))" : "none"
          }}
        />
      </div>
      {beats}
    </div>
  );
};

export default CircleRenderer;