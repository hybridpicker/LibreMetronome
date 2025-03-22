// src/components/metronome/PolyrhythmMode/BeatSyncLine.js
import React, { useEffect, useRef } from 'react';

/**
 * BeatSyncLine component - A simplified beat sync line that rotates smoothly
 * without any jumps or glitches, regardless of synchronization events.
 */
const BeatSyncLine = ({ 
  innerBeats,
  containerSize, 
  isPaused,
  tempo
}) => {
  // Debug flag - set to true to make line more obvious for debugging
  const debugMode = true;
  // Reference to SVG group element for direct manipulation
  const lineGroupRef = useRef(null);
  
  // Animation tracking
  const requestRef = useRef(null);
  const startTimeRef = useRef(null);
  const rotationRef = useRef(0);
  
  // Simple animation that never jumps or resets
  useEffect(() => {
    // Immediately set initial rotation to ensure the line is visible
    if (lineGroupRef.current) {
      lineGroupRef.current.setAttribute('transform', 
        `rotate(0, ${containerSize/2}, ${containerSize/2})`);
    }
    
    // If paused, don't animate and reset to 12 o'clock
    if (isPaused) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      
      // Reset to 12 o'clock (0 degrees) when paused
      if (lineGroupRef.current) {
        lineGroupRef.current.setAttribute('transform', 
          `rotate(0, ${containerSize/2}, ${containerSize/2})`);
      }
      return;
    }
    
    // Duration for one full rotation (ms)
    const msPerMeasure = (60000 / tempo) * innerBeats;
    const rotationSpeed = 360 / msPerMeasure; // degrees per ms
    
    // Reset the start time whenever we start playing or params change
    // This ensures we always begin rotation from 12 o'clock
    startTimeRef.current = performance.now();
    rotationRef.current = 0;
    
    // Make sure the line is at 12 o'clock initially
    if (lineGroupRef.current) {
      lineGroupRef.current.setAttribute('transform', 
        `rotate(0, ${containerSize/2}, ${containerSize/2})`);
    }
    
    // Animation loop
    const animate = (timestamp) => {
      // Skip if the ref isn't available
      if (!lineGroupRef.current) return;
      
      // Calculate time delta since start
      const delta = timestamp - startTimeRef.current;
      
      // Calculate rotation based on elapsed time and tempo
      // This ensures we always maintain proper positioning relative to the actual beats
      const msPerMeasure = (60000 / tempo) * innerBeats;
      const rotation = (delta % msPerMeasure) / msPerMeasure * 360;
      
      // Apply rotation directly - will always reset to 0 at the start of each measure
      lineGroupRef.current.setAttribute('transform', 
        `rotate(${rotation}, ${containerSize/2}, ${containerSize/2})`);
      
      // Continue animation
      requestRef.current = requestAnimationFrame(animate);
      
      // Force the SVG to repaint by triggering layout
      // This helps ensure the line is always visible
      lineGroupRef.current.getBoundingClientRect();
    };
    
    // Start animation
    requestRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPaused, tempo, innerBeats, containerSize]);
  
  // Calculate center coordinates
  const centerX = containerSize / 2;
  const centerY = containerSize / 2;
  const lineLength = containerSize / 2 - 10;
  
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
      zIndex: 30
    }}>
      <svg
        width={containerSize}
        height={containerSize}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 30
        }}
        viewBox={`0 0 ${containerSize} ${containerSize}`}
      >
        <g ref={lineGroupRef}>
          {/* Main visible line with extremely high contrast */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - lineLength}
            stroke={debugMode ? "#ff0000" : "#00c2c2"} // RED in debug mode for clear visibility
            strokeWidth={debugMode ? 6 : 4} // Extra thick in debug mode
            strokeLinecap="round"
            opacity={1} // Always fully visible
            style={{
              filter: "drop-shadow(0 0 5px rgba(255, 0, 0, 0.8))"  // Red shadow in debug mode
            }}
            className="beat-sync-line"
          />
          
          {/* Highly visible endpoint circle */}
          <circle
            cx={centerX}
            cy={centerY - lineLength}
            r={debugMode ? 8 : 6}
            fill={debugMode ? "#ff0000" : "#00c2c2"} // RED in debug mode for clear visibility
            opacity={1} // Always fully visible
            className="beat-sync-endpoint"
          />
          
          {/* Backup line - wider and more obvious in a different angle for testing */}
          {debugMode && (
            <>
              <line
                x1={centerX - 10}
                y1={centerY}
                x2={centerX - 10}
                y2={centerY - lineLength}
                stroke="#ffff00"
                strokeWidth={8}
                strokeLinecap="round"
                opacity={1}
              />
              <circle
                cx={centerX - 10}
                cy={centerY - lineLength}
                r={10}
                fill="#ffff00"
                opacity={1}
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
};

export default React.memo(BeatSyncLine);
