// src/components/metronome/PolyrhythmMode/BeatVisualizer.js
import React, { useMemo } from 'react';

const BeatVisualizer = ({
  beats,
  radius,
  accents = [],
  currentSubdivision,
  isPaused,
  pulseStates = [], // Keeping this prop to avoid interface changes, but not using it
  handleToggleAccent,
  beatType = 'inner',
  silenceModeActive = false,
  isTransitioning = false
}) => {
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

  return (
    <>
      {beatPositions.map((position, i) => {
        const { x, y } = position;
        
        // Determine if this beat is currently active
        const isActive = i === currentSubdivision && !isPaused && !isTransitioning;
        
        // Get accent value: 0=muted, 1=normal, 2=accent, 3=first
        // Safely access accent value with fallback
        const accentValue = i < accents.length ? accents[i] : 1;
        
        // Skip rendering if muted
        if (accentValue === 0) {
          return null;
        }
        
        // Determine CSS classes based on beat type and accent value
        let beatClasses = ['beat-dot'];
        
        if (isActive) beatClasses.push('active');
        if (isTransitioning) beatClasses.push('transitioning');
        
        // Determine styling based on accent value
        if (accentValue === 3) {
          beatClasses.push('first-beat');
        } else if (accentValue === 2) {
          beatClasses.push(`${beatType}-beat accent-beat`);
        } else {
          beatClasses.push(`${beatType}-beat`);
        }
        
        // Add muted class if in silence mode
        if (silenceModeActive) {
          beatClasses.push('muted');
        }
        
        // Simple scaling for active beats - no wobble
        const scaleValue = isActive ? 1.25 : 1;
        
        return (
          <div
            key={i}
            className={beatClasses.join(' ')}
            style={{
              left: `${x}px`,
              top: `${y}px`,
              opacity: silenceModeActive ? 0.5 : isTransitioning ? 0.8 : 1,
              transform: `translate(-50%, -50%) scale(${scaleValue})`,
              transition: "all 0.15s ease-out, left 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)"
            }}
            onClick={() => !isTransitioning && handleToggleAccent(i)}
          />
        );
      })}
    </>
  );
};

export default React.memo(BeatVisualizer);