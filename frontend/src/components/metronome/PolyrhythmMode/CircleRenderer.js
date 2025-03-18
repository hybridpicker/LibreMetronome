// src/components/metronome/PolyrhythmMode/CircleRenderer.js
import React, { useEffect, useRef } from 'react';
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
  
  // Track previous values to detect changes
  const previousInnerBeats = useRef(innerBeats);
  const previousOuterBeats = useRef(outerBeats);
  
  // Handle updating refs when beat counts change
  useEffect(() => {
    previousInnerBeats.current = innerBeats;
    previousOuterBeats.current = outerBeats;
  }, [innerBeats, outerBeats]);
  
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