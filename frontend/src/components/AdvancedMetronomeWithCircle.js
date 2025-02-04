// src/components/AdvancedMetronomeWithCircle.js
import React, { useState, useEffect } from 'react';
import MetronomeCanvas from './MetronomeCanvas';
import useMetronomeLogic from './useMetronomeLogic';

/*
 * Comments in English as requested
 * This component manages the logic (sliders, accent toggles, etc.) and passes isPaused down to MetronomeCanvas
 * so the pointer can disappear when paused.
 */

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
  setTapTempo
}) {
  // Accents with first beat always accented
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );

  // Update accents if subdivisions changes
  useEffect(() => {
    setAccents((prev) => {
      const newArr = [];
      for (let i = 0; i < subdivisions; i++) {
        newArr[i] = i === 0 ? true : prev[i] || false;
      }
      return newArr;
    });
  }, [subdivisions]);

  const toggleAccent = (index) => {
    if (index === 0) return;
    setAccents((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Use the custom hook
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

  // Pass tapTempo to parent
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
        /* pass isPaused so we know whether to draw pointer or not */
        isPaused={isPaused}
      />

      <div className="sliders-container">
        {/* Only show swing slider if subdivisions is even */}
        {subdivisions % 2 === 0 && (
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
        )}

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
            min={30}
            max={240}
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
