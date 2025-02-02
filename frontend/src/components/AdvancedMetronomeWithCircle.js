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
  setVolume,
  setTapTempo  // Callback to expose tapTempo function to parent
}) {
  // Initialize accent state with first beat always accented
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (v, i) => (i === 0 ? true : false))
  );

  useEffect(() => {
    setAccents(prev => {
      const newArray = [];
      for (let i = 0; i < subdivisions; i++) {
        newArray[i] = i === 0 ? true : (prev[i] || false);
      }
      return newArray;
    });
  }, [subdivisions]);

  const toggleAccent = (index) => {
    if (index === 0) return; // First beat remains accented
    setAccents(prev => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Use the custom hook for metronome logic (which now returns tapTempo)
  const logic = useMetronomeLogic({
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

  // Expose the tapTempo function to the parent via callback prop
  useEffect(() => {
    if (setTapTempo) {
      setTapTempo(() => logic.tapTempo);
    }
  }, [logic.tapTempo, setTapTempo]);

  return (
    <div className="metronome-container">
      <MetronomeCanvas
        currentSubdivision={logic.currentSubdivision}
        currentSubStartRef={logic.currentSubStartRef}
        currentSubIntervalRef={logic.currentSubIntervalRef}
        subdivisions={subdivisions}
        accents={accents}
        onToggleAccent={toggleAccent}
        audioCtx={logic.audioCtx}
      />

      <div className="sliders-container">
        <div className="slider-item">
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
