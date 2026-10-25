import React from 'react';
import { BeatMark } from '../ScoreGlyphs';

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
  ring = 0
}) => {
  // The parent computes one ring size for all circles from the free area.
  const actualContainerSize = ring;
  const actualRadius = actualContainerSize / 2;
  // The mark grows with the ring (16-22px); its touch target shrinks on crowded
  // rings so neighbouring beats stay separately tappable.
  const markSize = Math.round(Math.min(22, Math.max(16, ring * 0.2)));
  // One notehead is 14.4 k wide; k follows the mark size.
  const markK = markSize / 14.4;
  const beatCountForSpacing = settings.subdivisions || 4;
  const spacing = (2 * Math.PI * actualRadius) / Math.max(beatCountForSpacing, 1);
  const hit = Math.round(Math.min(44, Math.max(28, spacing)));
  const hitHalf = hit / 2;
  const isSilent = isPlaying && macroMode !== 0 && isSilencePhaseRef?.current;

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
    
    // The accent mark sits on the outer side of the ring (above a beat in the
    // upper half, below one in the lower half) so it never meets the centre.
    const upper = Math.sin(angle) <= 0.01;
    const artDist = 5 * markK + 9;
    const isMuted = beatState === 0;
    const markState = ['muted', 'normal', 'accent', 'first'][beatState] || 'normal';

    return (
      <button
        type="button"
        key={i}
        onClick={() => { if (isActiveUI) updateAccent(i); }}
        className={`beat-control${isMuted ? ' is-muted' : ''}${isActive ? ' is-current' : ''}${isTransitioning && isPlaying ? ' transitioning' : ''}`}
        aria-label={`Circle ${idx + 1}, beat ${i + 1}: ${beatStateLabels[beatState]}. Activate to change accent.`}
        aria-pressed={isMuted ? undefined : beatState > 1}
        disabled={!isActiveUI}
        style={{
          left: `calc(50% + ${xPos}px - ${hitHalf}px)`,
          top: `calc(50% + ${yPos}px - ${hitHalf}px)`,
          width: hit,
          height: hit
        }}
      >
        <svg width={hit} height={hit} aria-hidden="true" focusable="false">
          <BeatMark
            cx={hit / 2}
            cy={hit / 2}
            k={markK}
            state={markState}
            stem={0}
            artY={hit / 2 + (upper ? -artDist : artDist)}
          />
        </svg>
      </button>
    );
  });
  
  return (
    <div
      className={`multi-circle-surface${isActiveUI ? ' is-selected' : ''}${isPlaying ? ' is-playing' : ''}${isSilent ? ' is-silent' : ''}`}
      style={{
        width: actualContainerSize,
        height: actualContainerSize,
        "--mark": `${markSize}px`
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
