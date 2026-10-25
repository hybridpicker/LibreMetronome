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
  isTransitioning = false,
  circleColorSwapped = false  // New prop to handle color swapping
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
  
  // Get silence phase directly but without affecting styles
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
      {/* Outer ring: a select key under the beats, each beat a key of its own */}
      <div
        className={`outer-circle ${activeCircle === 'outer' ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
        style={{ width: containerSize, height: containerSize, top: 0, left: 0 }}
      >
        <button
          type="button"
          className="circle-select-button"
          onClick={() => !isTransitioning && setActiveCircle('outer')}
          disabled={isTransitioning}
          aria-label={`Select outer rhythm, ${outerBeats} beats`}
          aria-pressed={activeCircle === 'outer'}
        />
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
          disabled={isTransitioning}
          colorSwapped={circleColorSwapped}
        />
      </div>

      {/* Inner ring */}
      <div
        className={`inner-circle ${activeCircle === 'inner' ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
        style={{
          width: innerRadius * 2,
          height: innerRadius * 2,
          top: outerRadius - innerRadius,
          left: outerRadius - innerRadius
        }}
      >
        <button
          type="button"
          className="circle-select-button"
          onClick={() => !isTransitioning && setActiveCircle('inner')}
          disabled={isTransitioning}
          aria-label={`Select inner rhythm, ${innerBeats} beats`}
          aria-pressed={activeCircle === 'inner'}
        />
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
          disabled={isTransitioning}
          colorSwapped={circleColorSwapped}
        />
      </div>
    </div>
  );
};

export default CircleRenderer;
