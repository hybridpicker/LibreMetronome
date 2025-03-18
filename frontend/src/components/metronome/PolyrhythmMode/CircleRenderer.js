// src/components/metronome/PolyrhythmMode/CircleRenderer.js
import React, { useEffect, useState, useRef } from 'react';
import BeatVisualizer from './BeatVisualizer';

const CircleRenderer = ({
  innerBeats,
  outerBeats,
  innerAccents,
  outerAccents,
  innerCurrentSubdivision,
  outerCurrentSubdivision,
  isPaused,
  containerSize,
  activeCircle,
  setActiveCircle,
  handleToggleAccent,
  macroMode,
  isSilencePhaseRef,
  isTransitioning = false
}) => {
  // Size calculations for inner and outer circles
  const outerRadius = containerSize / 2;
  const innerRadius = outerRadius * 0.6; // Inner circle is 60% the size of outer
  
  // Define pulse animations for beats
  const [innerPulseStates, setInnerPulseStates] = useState(Array(innerBeats).fill(false));
  const [outerPulseStates, setOuterPulseStates] = useState(Array(outerBeats).fill(false));
  
  // Track previous values to detect changes
  const previousInnerBeats = useRef(innerBeats);
  const previousOuterBeats = useRef(outerBeats);
  
  // Handle resetting pulse states when beat counts change
  useEffect(() => {
    if (previousInnerBeats.current !== innerBeats) {
      setInnerPulseStates(Array(innerBeats).fill(false));
      previousInnerBeats.current = innerBeats;
    }
    
    if (previousOuterBeats.current !== outerBeats) {
      setOuterPulseStates(Array(outerBeats).fill(false));
      previousOuterBeats.current = outerBeats;
    }
  }, [innerBeats, outerBeats]);
  
  // Trigger pulse animations on beat changes
  useEffect(() => {
    if (isPaused || isTransitioning) return;
    
    // Pulse animation for inner circle
    if (innerCurrentSubdivision >= 0 && innerCurrentSubdivision < innerBeats) {
      setInnerPulseStates(prev => {
        const newState = [...prev];
        newState[innerCurrentSubdivision] = true;
        return newState;
      });
      
      // Reset pulse after animation completes
      setTimeout(() => {
        setInnerPulseStates(prev => {
          if (!prev[innerCurrentSubdivision]) return prev;
          const newState = [...prev];
          newState[innerCurrentSubdivision] = false;
          return newState;
        });
      }, 200);
    }
  }, [innerCurrentSubdivision, innerBeats, isPaused, isTransitioning]);
  
  // Same for outer circle
  useEffect(() => {
    if (isPaused || isTransitioning) return;
    
    if (outerCurrentSubdivision >= 0 && outerCurrentSubdivision < outerBeats) {
      setOuterPulseStates(prev => {
        const newState = [...prev];
        newState[outerCurrentSubdivision] = true;
        return newState;
      });
      
      setTimeout(() => {
        setOuterPulseStates(prev => {
          if (!prev[outerCurrentSubdivision]) return prev;
          const newState = [...prev];
          newState[outerCurrentSubdivision] = false;
          return newState;
        });
      }, 200);
    }
  }, [outerCurrentSubdivision, outerBeats, isPaused, isTransitioning]);
  
  // Add visual indicator for silence phase
  const silenceModeActive = macroMode !== 0 && isSilencePhaseRef?.current;
  
  return (
    <div 
      className="polyrhythm-circles"
      style={{
        width: containerSize,
        height: containerSize,
        position: 'relative',
      }}
    >
      {/* Outer Circle */}
      <div
        className={`outer-circle ${activeCircle === 'outer' ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
        style={{
          width: containerSize,
          height: containerSize,
          top: 0,
          left: 0,
          boxShadow: silenceModeActive ? 
            "0 0 0 3px #ff5722, 0 0 10px rgba(255, 87, 34, 0.6)" : 
            activeCircle === 'outer' ? 
              "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)" : 
              "none",
          borderStyle: activeCircle === 'outer' ? 'solid' : 'dashed',
          opacity: isTransitioning ? 0.8 : 1,
          transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.2s ease'
        }}
        onClick={() => !isTransitioning && setActiveCircle('outer')}
      >
        <BeatVisualizer
          beats={outerBeats}
          radius={outerRadius}
          accents={outerAccents}
          currentSubdivision={outerCurrentSubdivision}
          isPaused={isPaused || isTransitioning}
          pulseStates={outerPulseStates}
          handleToggleAccent={(index) => handleToggleAccent(index, 'outer')}
          beatType="outer"
          silenceModeActive={silenceModeActive}
          isTransitioning={isTransitioning}
        />
      </div>
      
      {/* Inner Circle */}
      <div
        className={`inner-circle ${activeCircle === 'inner' ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
        style={{
          width: innerRadius * 2,
          height: innerRadius * 2,
          top: outerRadius - innerRadius,
          left: outerRadius - innerRadius,
          boxShadow: silenceModeActive ? 
            "0 0 0 3px #ff5722, 0 0 10px rgba(255, 87, 34, 0.6)" : 
            activeCircle === 'inner' ? 
              "0 0 0 3px #00A0A0, 0 0 10px rgba(0, 160, 160, 0.6)" : 
              "none",
          borderStyle: activeCircle === 'inner' ? 'solid' : 'dashed',
          opacity: isTransitioning ? 0.8 : 1,
          transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.2s ease'
        }}
        onClick={() => !isTransitioning && setActiveCircle('inner')}
      >
        <BeatVisualizer
          beats={innerBeats}
          radius={innerRadius}
          accents={innerAccents}
          currentSubdivision={innerCurrentSubdivision}
          isPaused={isPaused || isTransitioning}
          pulseStates={innerPulseStates}
          handleToggleAccent={(index) => handleToggleAccent(index, 'inner')}
          beatType="inner"
          silenceModeActive={silenceModeActive}
          isTransitioning={isTransitioning}
        />
      </div>
    </div>
  );
};

export default CircleRenderer;