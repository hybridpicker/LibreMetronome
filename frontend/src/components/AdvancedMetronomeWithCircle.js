// src/components/AdvancedMetronomeWithCircle.js

import React, { useState, useEffect } from 'react';
import MetronomeCanvas from './MetronomeCanvas';
import useMetronomeLogic from './useMetronomeLogic';

export default function AdvancedMetronomeWithCircle({
  tempo,
  setTempo,
  subdivisions,
  setSubdivisions,
  isPaused,
  setIsPaused,
  swing,
  setSwing,
  volume,
  setVolume
}) {
  // Local accents array
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, () => false)
  );

  // Ensure accent array matches the current subdivisions length
  useEffect(() => {
    setAccents((prev) => {
      const newArr = [...prev];
      while (newArr.length < subdivisions) {
        newArr.push(false);
      }
      return newArr.slice(0, subdivisions);
    });
  }, [subdivisions]);

  // Toggle accent when clicking a circle
  const toggleAccent = (index) => {
    // If you don't want to toggle the first beat, skip index=0
    setAccents((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Use our hook for audio scheduling
  const {
    currentSubdivision,
    currentSubStartRef,
    currentSubIntervalRef,
    audioCtx
  } = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions,
    isPaused,
    setIsPaused,
    swing,
    volume,
    accents,
    setSubdivisions
  });

  return (
    <div className="metronome-container">
      {/* Main canvas for the circle and pointer */}
      <MetronomeCanvas
        currentSubdivision={currentSubdivision}
        currentSubStartRef={currentSubStartRef}
        currentSubIntervalRef={currentSubIntervalRef}
        subdivisions={subdivisions}
        accents={accents}
        onToggleAccent={toggleAccent}
        audioCtx={audioCtx}
      />

      {/* Swing slider (vertical, left) with a wrapper so the label is above */}
      <div
        className="vertical-slider-wrapper"
        style={{
          top: '50%',
          left: '40px', // place center ~ 40px from the left
          transform: 'translateY(-50%)'
        }}
      >
        <span className="vertical-slider-label">Swing</span>
        <div className="rotated-slider">
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={swing}
            onChange={(e) => setSwing(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Volume slider (vertical, right) */}
      <div
        className="vertical-slider-wrapper"
        style={{
          top: '50%',
          right: '40px',
          transform: 'translateY(-50%)'
        }}
      >
        <span className="vertical-slider-label">Volume</span>
        <div className="rotated-slider">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Tempo slider (horizontal, bottom) */}
      <div className="tempo-slider-container">
        <span className="tempo-label">Tempo: {tempo} BPM</span>
        <input
          type="range"
          min={30}
          max={240}
          value={tempo}
          onChange={(e) => setTempo(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}
