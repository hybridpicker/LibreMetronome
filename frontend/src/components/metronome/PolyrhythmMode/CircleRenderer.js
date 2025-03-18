// src/components/metronome/PolyrhythmMode/CircleRenderer.js
import React, { useEffect, useState } from 'react';
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
  isSilencePhaseRef
}) => {
  // Size calculations for inner and outer circles
  const outerRadius = containerSize / 2;
  const innerRadius = outerRadius * 0.6; // Inner circle is 60% the size of outer
  
  // Define pulse animations for beats
  const [innerPulseStates, setInnerPulseStates] = useState(Array(innerBeats).fill(false));
  const [outerPulseStates, setOuterPulseStates] = useState(Array(outerBeats).fill(false));
  
  // Trigger pulse animations on beat changes
  useEffect(() => {
    if (isPaused) return;
    
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
          const newState = [...prev];
          newState[innerCurrentSubdivision] = false;
          return newState;
        });
      }, 200);
    }
  }, [innerCurrentSubdivision, innerBeats, isPaused]);
  
  // Same for outer circle
  useEffect(() => {
    if (isPaused) return;
    
    if (outerCurrentSubdivision >= 0 && outerCurrentSubdivision < outerBeats) {
      setOuterPulseStates(prev => {
        const newState = [...prev];
        newState[outerCurrentSubdivision] = true;
        return newState;
      });
      
      setTimeout(() => {
        setOuterPulseStates(prev => {
          const newState = [...prev];
          newState[outerCurrentSubdivision] = false;
          return newState;
        });
      }, 200);
    }
  }, [outerCurrentSubdivision, outerBeats, isPaused]);
  
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
        className={`outer-circle ${activeCircle === 'outer' ? 'active' : ''}`}
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
          borderStyle: activeCircle === 'outer' ? 'solid' : 'dashed'
        }}
        onClick={() => setActiveCircle('outer')}
      >
        <BeatVisualizer
          beats={outerBeats}
          radius={outerRadius}
          accents={outerAccents}
          currentSubdivision={outerCurrentSubdivision}
          isPaused={isPaused}
          pulseStates={outerPulseStates}
          handleToggleAccent={(index) => handleToggleAccent(index, 'outer')}
          beatType="outer"
          silenceModeActive={silenceModeActive}
        />
      </div>
      
      {/* Inner Circle */}
      <div
        className={`inner-circle ${activeCircle === 'inner' ? 'active' : ''}`}
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
          borderStyle: activeCircle === 'inner' ? 'solid' : 'dashed'
        }}
        onClick={() => setActiveCircle('inner')}
      >
        <BeatVisualizer
          beats={innerBeats}
          radius={innerRadius}
          accents={innerAccents}
          currentSubdivision={innerCurrentSubdivision}
          isPaused={isPaused}
          pulseStates={innerPulseStates}
          handleToggleAccent={(index) => handleToggleAccent(index, 'inner')}
          beatType="inner"
          silenceModeActive={silenceModeActive}
        />
      </div>
    </div>
  );
};

export default CircleRenderer;