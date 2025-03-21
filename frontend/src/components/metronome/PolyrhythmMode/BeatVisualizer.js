// src/components/metronome/PolyrhythmMode/BeatVisualizer.js
import React, { useMemo, useRef, useEffect } from 'react';

const BeatVisualizer = ({
  beats,
  radius,
  accents = [],
  currentSubdivision,
  isPaused,
  handleToggleAccent,
  beatType = 'inner',
  silenceModeActive = false,
  isTransitioning = false,
  colorSwapped = false // New prop to handle color swapping
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
        
        // Determine styling based on accent value and swap state
        // First beat always uses the first-beat style regardless of swapping
        if (accentValue === 3) {
          beatClasses.push('first-beat');
        } else {
          // For normal and accent beats, apply the swapped class if needed
          if (colorSwapped) {
            // Swap inner and outer beat colors
            beatClasses.push(beatType === 'inner' ? 'outer-beat' : 'inner-beat');
          } else {
            // Use default colors (not swapped)
            beatClasses.push(beatType === 'inner' ? 'inner-beat' : 'outer-beat');
          }
          
          // Add accent class if needed
          if (accentValue === 2) {
            beatClasses.push('accent-beat');
          }
        }
        
        // Less dramatic scale for subtler, quicker pulses
        const scaleValue = isActive ? 1.2 : 1;
        
        // Enhanced styles with faster animation properties
        const styles = {
          left: `${x}px`,
          top: `${y}px`,
          opacity: isTransitioning ? 0.8 : 1, // No special silence opacity
          transform: `translate(-50%, -50%) scale(${scaleValue})`,
          // Much faster animation for active beats, standard for inactive
          transition: isActive 
            ? "transform 40ms cubic-bezier(0.175, 0.885, 0.32, 1.275)" // Faster, less bouncy
            : "transform 100ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 100ms ease, left 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
          willChange: "transform", // Performance hint for browser
          WebkitBackfaceVisibility: "hidden", // Additional GPU acceleration
          backfaceVisibility: "hidden",
          cursor: 'default' // Changed from pointer to default
        };

        return (
          <div
            key={i}
            className={beatClasses.join(' ')}
            style={styles}
            // No onClick handler since beats should not be clickable
          />
        );
      })}
    </>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(BeatVisualizer);