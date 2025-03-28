// src/components/metronome/MultiCircleMode/BeatVisualizer.js
import React from 'react';
import firstBeat from "../../../assets/svg/firstBeat.svg";
import firstBeatActive from "../../../assets/svg/firstBeatActive.svg";
import normalBeat from "../../../assets/svg/normalBeat.svg";
import normalBeatActive from "../../../assets/svg/normalBeatActive.svg";
import accentedBeat from "../../../assets/svg/accentedBeat.svg";
import accentedBeatActive from "../../../assets/svg/accentedBeatActive.svg";

const BeatVisualizer = ({
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
  circleSettings,
}) => {
  const iconSize = 24;
  const beats = Array.from({ length: settings.subdivisions }, (_, i) => {
    const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
    const xPos = radius * Math.cos(angle);
    const yPos = radius * Math.sin(angle);
    
    const isActive = i === currentSubdivision &&
                     isPlaying &&
                     !isPaused &&
                     audioCtxRunning &&
                     !isTransitioning;
    
    const beatState = settings.accents?.[i] || 1;
    
    // For muted beats (state 0), render a placeholder that can be clicked
    if (beatState === 0) {
      return (
        <div
          key={i}
          onClick={() => { if (isActiveUI) updateAccent(i); }}
          style={{
            position: "absolute",
            left: `calc(50% + ${xPos}px - ${iconSize / 2}px)`,
            top: `calc(50% + ${yPos}px - ${iconSize / 2}px)`,
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            borderRadius: '50%',
            border: '2px dashed #ccc',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#ccc',
            fontSize: '14px',
            cursor: isActiveUI ? "pointer" : "default",
            transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
          }}
        >
          +
        </div>
      );
    }
    
    // Choose icon based on state
    let icon;
    if (beatState === 3) {
      icon = isActive ? firstBeatActive : firstBeat;
    } else if (beatState === 2) {
      icon = isActive ? accentedBeatActive : accentedBeat;
    } else {
      icon = isActive ? normalBeatActive : normalBeat;
    }
    
    return (
      <img
        key={i}
        src={icon}
        alt={`Beat ${i}`}
        onClick={() => { if (isActiveUI) updateAccent(i); }}
        className={`beat-icon ${isActive ? 'beat-icon-active' : ''}`}
        style={{
          position: "absolute",
          left: `calc(50% + ${xPos}px - ${iconSize / 2}px)`,
          top: `calc(50% + ${yPos}px - ${iconSize / 2}px)`,
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          cursor: isActiveUI ? "pointer" : "default",
          transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
        }}
      />
    );
  });
  
  // Add a remove button if there's more than one circle
  if (circleSettings.length > 1) {
    const removeButton = (
      <div
        key="remove-button"
        onClick={(e) => {
          e.stopPropagation();
          updateAccent('remove', idx);
        }}
        className="remove-circle-button"
      >
        -
      </div>
    );
    
    return [removeButton, ...beats];
  }
  
  return beats;
};

export default BeatVisualizer;