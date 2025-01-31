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
  // Local array for accenting individual subdivisions
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, () => false)
  );

  // Adjust the accents array when subdivisions changes
  useEffect(() => {
    setAccents((prev) => {
      const newArray = [...prev];
      while (newArray.length < subdivisions) {
        newArray.push(false);
      }
      return newArray.slice(0, subdivisions);
    });
  }, [subdivisions]);

  // Toggles the accent on a specific subdivision index
  const toggleAccent = (index) => {
    setAccents((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Custom hook for audio scheduling
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
      {/* Main canvas for the metronome circle */}
      <MetronomeCanvas
        currentSubdivision={currentSubdivision}
        currentSubStartRef={currentSubStartRef}
        currentSubIntervalRef={currentSubIntervalRef}
        subdivisions={subdivisions}
        accents={accents}
        onToggleAccent={toggleAccent}
        audioCtx={audioCtx}
      />

      {/* Swing slider (vertical, left side) */}
      <div className="vertical-slider-wrapper swing-wrapper">
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

      {/* Volume slider (vertical, right side) */}
      <div className="vertical-slider-wrapper volume-wrapper">
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
