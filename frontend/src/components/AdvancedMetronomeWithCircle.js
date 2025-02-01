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
  // Initialize accent state, ensuring first beat (index 0) is always accented
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (v, i) => i === 0 ? true : false)
  );

  // Update the accents array when subdivisions change, ensuring first beat remains true
  useEffect(() => {
    setAccents(prev => {
      const newArray = [];
      for (let i = 0; i < subdivisions; i++) {
        newArray[i] = (i === 0) ? true : (prev[i] || false);
      }
      return newArray;
    });
  }, [subdivisions]);

  // Toggle accent for a specific subdivision index, but do not toggle first beat
  const toggleAccent = (index) => {
    if (index === 0) return; // First beat always accented
    setAccents(prev => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Custom hook for scheduling audio and metronome logic
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
      {/* Main canvas for the metronome display */}
      <MetronomeCanvas
        currentSubdivision={currentSubdivision}
        currentSubStartRef={currentSubStartRef}
        currentSubIntervalRef={currentSubIntervalRef}
        subdivisions={subdivisions}
        accents={accents}
        onToggleAccent={toggleAccent}
        audioCtx={audioCtx}
      />

      {/* Sliders arranged horizontally */}
      <div className="sliders-container">
        <div className="slider-item">
          {/* Display swing as a percentage (0-100%) */}
          <label>Swing: {Math.round(swing * 200)}%</label>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={swing}
            onChange={(e) => setSwing(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-item">
          {/* Display volume as a percentage (0-100%) */}
          <label>Volume: {Math.round(volume * 100)}%</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-item">
          <label>Tempo: {tempo} BPM</label>
          {/* BPM slider now allows values down to 5 BPM */}
          <input
            type="range"
            min={5}
            max={240}
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
