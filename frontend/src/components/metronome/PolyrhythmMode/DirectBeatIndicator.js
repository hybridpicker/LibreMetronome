// src/components/metronome/PolyrhythmMode/DirectBeatIndicator.js
import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * Dedicated beat indicator component optimized for complex polyrhythms like 8:9
 * Only shows a single line that appears on the second measure to avoid any visual jumps
 */
export const DirectBeatIndicator = ({ 
  containerSize, 
  isPaused, 
  tempo, 
  innerBeats
}) => {
  // Calculate center and radius
  const centerX = containerSize / 2;
  const centerY = containerSize / 2;
  const outerRadius = containerSize / 2 - 4;
  
  // Use reference for rotation instead of state
  const rotationAngleRef = useRef(0);
  const svgGroupRef = useRef(null);
  
  // Animation references
  const requestIdRef = useRef(null);
  const startTimeRef = useRef(null);
  
  // Track measure count to only show on second measure
  const measureCountRef = useRef(0);
  const isVisibleRef = useRef(false);
  
  // Timing references 
  const beatPeriodRef = useRef((60 / tempo) * 1000); // ms per beat
  
  // Update timing when tempo changes
  useEffect(() => {
    beatPeriodRef.current = (60 / tempo) * 1000;
  }, [tempo]);
  
  // Apply rotation directly to DOM
  const applyRotation = useCallback((angle) => {
    if (svgGroupRef.current) {
      rotationAngleRef.current = angle;
      svgGroupRef.current.style.transform = `rotate(${angle}deg)`;
    }
  }, []);
  
  // Animation function
  const animate = useCallback((timestamp) => {
    if (!isVisibleRef.current) {
      // Don't animate if not visible yet
      requestIdRef.current = requestAnimationFrame(animate);
      return;
    }
    
    // Initialize timing on first animation frame
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      requestIdRef.current = requestAnimationFrame(animate);
      return;
    }
    
    // Calculate angle based on elapsed time
    const elapsed = timestamp - startTimeRef.current;
    const fullRotationTime = beatPeriodRef.current * innerBeats;
    const phase = (elapsed % fullRotationTime) / fullRotationTime;
    const newAngle = phase * 360;
    
    // Apply directly to DOM
    applyRotation(newAngle);
    
    // Continue animation loop
    requestIdRef.current = requestAnimationFrame(animate);
  }, [applyRotation, innerBeats]);
  
  // Handle play/pause
  useEffect(() => {
    const stopAnimation = () => {
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
        requestIdRef.current = null;
      }
    };
    
    if (isPaused) {
      // Stop animation but keep position
      stopAnimation();
      
      // Reset measure counter when paused
      measureCountRef.current = 0;
      isVisibleRef.current = false;
      
      // Hide the indicator on pause
      if (svgGroupRef.current) {
        svgGroupRef.current.style.opacity = "0";
      }
    } else {
      // On play, start animation but keep indicator hidden until 2nd measure
      if (!requestIdRef.current) {
        // Restart animation timing
        startTimeRef.current = null;
        
        // Start animation loop (indicator will be invisible until 2nd measure)
        requestIdRef.current = requestAnimationFrame(animate);
      }
    }
    
    return stopAnimation;
  }, [isPaused, animate]);
  
  // Listen for first beat events (every measure start)
  useEffect(() => {
    const handleFirstBeat = () => {
      if (isPaused) return;
      
      // Count measures (first beat of each measure)
      measureCountRef.current++;
      
      // Only show indicator on second measure
      if (measureCountRef.current === 2 && !isVisibleRef.current) {
        console.log("Showing beat indicator on 2nd measure");
        isVisibleRef.current = true;
        
        // Reset start time for smooth beginning
        startTimeRef.current = performance.now();
        
        // Make indicator visible
        if (svgGroupRef.current) {
          svgGroupRef.current.style.opacity = "1";
          // Start at angle 0
          applyRotation(0);
        }
      }
    };
    
    // Reset counters but don't show indicator yet
    const handlePlaybackStart = () => {
      measureCountRef.current = 0;
      isVisibleRef.current = false;
      
      // Ensure indicator is hidden on playback start
      if (svgGroupRef.current) {
        svgGroupRef.current.style.opacity = "0";
      }
    };
    
    // Listen for events
    window.addEventListener('polyrhythm-first-beat', handleFirstBeat);
    window.addEventListener('polyrhythm-playback-start', handlePlaybackStart);
    
    return () => {
      window.removeEventListener('polyrhythm-first-beat', handleFirstBeat);
      window.removeEventListener('polyrhythm-playback-start', handlePlaybackStart);
    };
  }, [isPaused, applyRotation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
  }, []);
  
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 50
    }}>
      <svg
        width={containerSize}
        height={containerSize}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <g 
          ref={svgGroupRef}
          style={{
            transformOrigin: `${centerX}px ${centerY}px`,
            willChange: 'transform',
            opacity: 0, // Start hidden
            transition: 'opacity 0.3s ease' // Smooth fade in
          }}
        >
          {/* Single line from center to outer edge - no dots */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - outerRadius}
            stroke="var(--primary-teal)"
            strokeWidth={3}
            strokeLinecap="round"
            className="beat-indicator-line"
          />
        </g>
      </svg>
    </div>
  );
};

export default DirectBeatIndicator;