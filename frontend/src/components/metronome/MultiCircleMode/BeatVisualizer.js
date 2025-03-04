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
    
    let icon;
    if (i === 0) {
      icon = isActive ? firstBeatActive : firstBeat;
    } else {
      const accent = settings.accents[i] || 1;
      icon = accent === 2
        ? isActive ? accentedBeatActive : accentedBeat
        : isActive ? normalBeatActive : normalBeat;
    }
    
    return (
      <img
        key={i}
        src={icon}
        alt={`Beat ${i}`}
        onClick={() => { if (isActiveUI && i !== 0) updateAccent(i); }}
        className={`beat-icon ${isActive ? 'beat-icon-active' : ''}`}
        style={{
          left: `calc(50% + ${xPos}px - ${iconSize / 2}px)`,
          top: `calc(50% + ${yPos}px - ${iconSize / 2}px)`,
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          cursor: isActiveUI && i !== 0 ? "pointer" : "default",
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