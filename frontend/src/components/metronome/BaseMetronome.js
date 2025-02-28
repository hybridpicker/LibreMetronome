// File: src/components/metronome/BaseMetronome.js
import React, { useState, useEffect } from 'react';
import useMetronomeLogic from '../../hooks/useMetronomeLogic';
import useWindowDimensions from '../../hooks/useWindowDimensions';

const BaseMetronome = ({
  tempo, setTempo,
  subdivisions, setSubdivisions,
  isPaused, setIsPaused,
  swing, setSwing,
  volume, setVolume,
  accents, toggleAccent,
  analogMode = false,
  gridMode = false,
  beatMultiplier = 1,
  children, // Render‐prop function for mode‑specific rendering
  ...logicOptions
}) => {
  // Determine container size based on window dimensions
  const { width } = useWindowDimensions();
  const getContainerSize = () => {
    if (width < 600) return Math.min(width - 40, 300);
    if (width < 1024) return Math.min(width - 40, 400);
    return 300;
  };
  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    setContainerSize(getContainerSize());
  }, [width]);

  // Initialize metronome scheduling logic
  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions,
    setSubdivisions,
    isPaused,
    setIsPaused,
    swing,
    setSwing,
    volume,
    setVolume,
    accents,
    analogMode,
    gridMode,
    beatMultiplier,
    ...logicOptions
  });

  const radius = containerSize / 2;
  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
    const xPos = radius * Math.cos(angle);
    const yPos = radius * Math.sin(angle);
    const isActive =
      logic.currentSubdivision === i &&
      !isPaused &&
      logic.audioCtx &&
      logic.audioCtx.state === 'running';
    return { i, xPos, yPos, isActive };
  });

  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      <div
        className="metronome-container"
        style={{ width: containerSize, height: containerSize, margin: '0 auto', position: 'relative' }}
      >
        {children({ beatData, containerSize, radius, logic })}
      </div>
    </div>
  );
};

export default BaseMetronome;
