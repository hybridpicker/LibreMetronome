import React from 'react';
import { isPhoneViewport } from '../../../utils/phoneLayout';
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
  radius,    // We'll use this directly now
  containerSize,
  setActiveCircle,
  circleSettings,
  macroMode,
  isSilencePhaseRef,
  isMobile,
  phoneRing = 0
}) => {
  const circleCount = circleSettings?.length || 1;
  let actualContainerSize = circleCount > 1 ? containerSize * 0.7 : containerSize;
  if (isPhoneViewport() && circleCount > 1) {
    // On phones the circles sit side by side. Each one gets an equal share of
    // the width, minus room for the beat icons that overhang the circle edge.
    const share = (window.innerWidth - 24 - (circleCount - 1) * 8) / circleCount;
    actualContainerSize = Math.max(70, Math.min(containerSize, share - (circleCount > 2 ? 28 : 32)));
  }
  if (phoneRing > 0) actualContainerSize = phoneRing;
  const actualRadius = actualContainerSize / 2;
  // On phones the dot grows with the ring (16-22px) and its touch target
  // shrinks on crowded rings so neighbouring beats stay separately tappable.
  const phoneDot = phoneRing > 0 ? Math.round(Math.min(22, Math.max(16, phoneRing * 0.2))) : 0;
  const beatCountForSpacing = settings.subdivisions || 4;
  const spacing = (2 * Math.PI * actualRadius) / Math.max(beatCountForSpacing, 1);
  const hit = phoneRing > 0 ? Math.round(Math.min(44, Math.max(28, spacing))) : 44;
  const hitHalf = hit / 2;
  const isSilent = isPlaying && macroMode !== 0 && isSilencePhaseRef?.current;

  const iconSize = phoneDot || 24;
  const beatStateLabels = ['muted', 'normal', 'accent', 'first beat'];
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
        <button
          type="button"
          key={i}
          onClick={() => { 
            if (isActiveUI) updateAccent(i); 
          }}
          className="beat-control is-muted"
          aria-label={`Circle ${idx + 1}, beat ${i + 1}: muted. Activate to change accent.`}
          disabled={!isActiveUI}
          style={{
            left: `calc(50% + ${xPos}px - ${hitHalf}px)`,
            top: `calc(50% + ${yPos}px - ${hitHalf}px)`,
            zIndex: 5,
            ...(phoneRing > 0 ? { width: hit, height: hit } : null)
          }}
        />
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
      <button
        type="button"
        key={i}
        onClick={() => { if (isActiveUI) updateAccent(i); }}
        className={`beat-control ${isActive ? 'beat-icon-active' : ''} ${isTransitioning && isPlaying ? 'transitioning' : ''}`}
        aria-label={`Circle ${idx + 1}, beat ${i + 1}: ${beatStateLabels[beatState]}. Activate to change accent.`}
        aria-pressed={beatState > 1}
        disabled={!isActiveUI}
        style={{
          left: `calc(50% + ${xPos}px - ${hitHalf}px)`,
          top: `calc(50% + ${yPos}px - ${hitHalf}px)`,
          ...(phoneRing > 0 ? { width: hit, height: hit } : null),
          filter: "none",
          transform: isActive ? "scale(1.16)" : "none",
          transition: "filter 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
          ...transitionStyle
        }}
      >
        <img src={icon} alt="" aria-hidden="true" style={{ width: iconSize, height: iconSize }} />
      </button>
    );
  });
  
  return (
    <div
      className={`multi-circle-surface${isActiveUI ? ' is-selected' : ''}${isPlaying ? ' is-playing' : ''}${isSilent ? ' is-silent' : ''}`}
      style={{
        width: actualContainerSize,
        height: actualContainerSize,
        ...(phoneRing > 0 ? { "--ring": `${actualContainerSize}px` } : null),
        margin: phoneRing > 0 ? 0 : isMobile ? "15px 0 38px" : "15px 15px 38px"
      }}
    >
      <button
        type="button"
        className="circle-select-button"
        onClick={() => setActiveCircle(idx)}
        aria-label={`Select circle ${idx + 1} for editing`}
        aria-pressed={isActiveUI}
      >
        <span className="sequence-position" aria-hidden="true">{idx + 1}</span>
      </button>
      <span className="sequence-beat-count">{settings.subdivisions} beats</span>
      {beats}
    </div>
  );
};

export default CircleRenderer;
