// src/components/metronome/PolyrhythmMode/BeatVisualizer.js
import React from 'react';

const BeatVisualizer = ({
  beats,
  radius,
  accents,
  currentSubdivision,
  isPaused,
  pulseStates,
  handleToggleAccent,
  beatType = 'inner',
  silenceModeActive = false
}) => {
  return (
    <>
      {Array.from({ length: beats }, (_, i) => {
        // Calculate position on the circle
        const angle = (2 * Math.PI * i) / beats - Math.PI / 2; // Start from top (12 o'clock)
        const x = radius + radius * Math.cos(angle);
        const y = radius + radius * Math.sin(angle);
        
        // Determine if this beat is currently active
        const isActive = i === currentSubdivision && !isPaused;
        const isPulsing = pulseStates[i];
        
        // Get accent value: 0=muted, 1=normal, 2=accent, 3=first
        const accentValue = accents[i] || 1;
        
        // Skip rendering if muted
        if (accentValue === 0) {
          return null;
        }
        
        // Determine CSS classes based on beat type and accent value
        let beatClasses = ['beat-dot'];
        
        if (isActive) beatClasses.push('active');
        if (isPulsing) beatClasses.push('pulsing');
        
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
        
        return (
          <div
            key={i}
            className={beatClasses.join(' ')}
            style={{
              left: `${x}px`,
              top: `${y}px`,
              opacity: silenceModeActive ? 0.5 : 1,
              transform: isActive ? 
                'translate(-50%, -50%) scale(1.15)' : 
                'translate(-50%, -50%)'
            }}
            onClick={() => handleToggleAccent(i)}
          />
        );
      })}
    </>
  );
};

export default BeatVisualizer;