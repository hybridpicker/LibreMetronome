// src/components/metronome/PolyrhythmMode/DirectBeatIndicator.js
import React, { useState, useEffect, useRef } from "react";

// Beat indicator that ensures tempo is properly set up before starting
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
  
  // Animation states
  const [animationKey, setAnimationKey] = useState('initial');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Store previous values to detect changes
  const tempoRef = useRef(tempo);
  const beatsRef = useRef(innerBeats);
  const beatCountRef = useRef(0);
  
  // Immediately stop animation when paused
  useEffect(() => {
    if (isPaused) {
      setIsAnimating(false);
      beatCountRef.current = 0;
    }
  }, [isPaused]);
  
  // Detect and handle tempo/beats changes
  useEffect(() => {
    // Don't update animation if not currently animating
    if (!isAnimating || isPaused) return;
    
    // Only update when tempo or beats actually change
    if (tempoRef.current !== tempo || beatsRef.current !== innerBeats) {
      // Update with new timing parameters
      setAnimationKey(`tempo-${tempo}-beats-${innerBeats}-${Date.now()}`);
      
      // Update stored values
      tempoRef.current = tempo;
      beatsRef.current = innerBeats;
    }
  }, [tempo, innerBeats, isPaused, isAnimating]);
  
  // First beat handler with careful synchronization
  useEffect(() => {
    const handleFirstBeat = () => {
      // Only process when playing
      if (isPaused) return;
      
      // Count beats for periodic resyncs
      beatCountRef.current++;
      
      // If not currently animating, start animation with a small delay
      // to ensure audio is fully set up
      if (!isAnimating) {
        // Small delay before starting animation to ensure
        // audio is fully initialized
        setTimeout(() => {
          tempoRef.current = tempo;
          beatsRef.current = innerBeats;
          setAnimationKey(`start-${Date.now()}`);
          setIsAnimating(true);
        }, 50);
      }
      // Periodically resync for complex polyrhythms (every 4 measures)
      else if (beatCountRef.current % 4 === 0) {
        setAnimationKey(`sync-${Date.now()}`);
      }
    };
    
    window.addEventListener('polyrhythm-first-beat', handleFirstBeat);
    
    return () => {
      window.removeEventListener('polyrhythm-first-beat', handleFirstBeat);
    };
  }, [isPaused, tempo, innerBeats, isAnimating]);
  
  // Calculate animation duration
  const duration = (60 / tempo) * innerBeats;
  
  // Animation style - only apply animation if actually animating
  const animationStyle = {
    animation: !isAnimating || isPaused 
      ? 'none' 
      : `rotate ${duration}s linear infinite`,
    transform: !isAnimating || isPaused ? 'rotate(0deg)' : undefined,
    transformOrigin: `${centerX}px ${centerY}px`
  };
  
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
        key={animationKey}
        width={containerSize}
        height={containerSize}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <g style={animationStyle}>
          {/* Line from center to outer edge - styled to match your design system */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - outerRadius}
            stroke="var(--primary-teal)"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{
              filter: "drop-shadow(0 0 2px rgba(0, 160, 160, 0.4))"
            }}
          />
          
          {/* Center dot */}
          <circle
            cx={centerX}
            cy={centerY}
            r={1.5}
            fill="var(--primary-teal)"
            opacity={0.6}
          />
        </g>
      </svg>
    </div>
  );
};

export default DirectBeatIndicator;
