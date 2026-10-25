// src/components/metronome/PolyrhythmMode/BeatVisualizer.js
import React, { useMemo, useRef, useEffect } from 'react';
import { BeatMark } from '../ScoreGlyphs';

const BeatVisualizer = ({
  beats,
  radius,
  accents = [],
  currentSubdivision,
  isPaused,
  handleToggleAccent,
  beatType = 'inner', // kept for callers; inner and outer look the same
  silenceModeActive = false,
  isTransitioning = false,
  colorSwapped = false // kept for callers; no colour to swap in the Score look
}) => {
  // Keep track of previous subdivision to detect changes
  const prevSubdivisionRef = useRef(currentSubdivision);

  // Use requestAnimationFrame for smoother animations
  useEffect(() => {
    if (prevSubdivisionRef.current !== currentSubdivision && !isPaused) {
      // Force a browser paint/composite to optimize animation
      window.requestAnimationFrame(() => {
        // This empty callback ensures the browser prioritizes the animation
      });
    }
    prevSubdivisionRef.current = currentSubdivision;
  }, [currentSubdivision, isPaused]);

  // Use memoization to calculate positions only when beats or radius changes
  const beatPositions = useMemo(() => {
    return Array.from({ length: beats }, (_, i) => {
      // Calculate position on the circle
      const angle = (2 * Math.PI * i) / beats - Math.PI / 2; // Start from top (12 o'clock)
      const x = radius + radius * Math.cos(angle);
      const y = radius + radius * Math.sin(angle);
      
      return { x, y, angle };
    });
  }, [beats, radius]);

  // A notehead is 14.4 k wide: about 20 px on a small ring, 25 px on a large one.
  const k = Math.min(1.7, Math.max(1.4, radius / 120));
  const states = ['muted', 'normal', 'accent', 'first'];

  return (
    <>
      {beatPositions.map((position, i) => {
        const { x, y } = position;

        // Determine if this beat is currently active
        const isActive = i === currentSubdivision && !isPaused && !isTransitioning;

        // Accent value: 0=muted (a rest), 1=normal, 2=accent (>), 3=first (^)
        const accentValue = i < accents.length ? accents[i] : 1;
        const size = Math.ceil(14.4 * k) + 6;

        return (
          <svg
            key={i}
            className={`beat-note${isActive ? ' is-current' : ''}${isTransitioning ? ' transitioning' : ''}`}
            width={size}
            height={size}
            aria-hidden="true"
            focusable="false"
            style={{ left: `${x}px`, top: `${y}px` }}
          >
            <BeatMark
              cx={size / 2}
              cy={size / 2}
              k={k}
              state={states[accentValue] || 'normal'}
              stem={0}
              restK={k * 0.7}
              artY={size / 2 + (Math.sin(position.angle) <= 0.01 ? -1 : 1) * (5 * k + 9)}
            />
          </svg>
        );
      })}
    </>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(BeatVisualizer);