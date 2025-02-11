// src/components/GridModeMetronome.js
import React, { useState, useEffect, useCallback } from 'react';
import useMetronomeLogic from './useMetronomeLogic';

// SVGs for the grid squares from the /assets/svg/grid folder
import squareInactive from '../assets/svg/grid/square_inactive.svg';
import squareActive from '../assets/svg/grid/square_active.svg';

// Import subdivision icons (as used in AdvancedCircleMetronome)
import subdivision1 from '../assets/svg/subdivision-1.svg';
import subdivision2 from '../assets/svg/subdivision-2.svg';
import subdivision3 from '../assets/svg/subdivision-3.svg';
import subdivision4 from '../assets/svg/subdivision-4.svg';
import subdivision5 from '../assets/svg/subdivision-5.svg';
import subdivision6 from '../assets/svg/subdivision-6.svg';
import subdivision7 from '../assets/svg/subdivision-7.svg';
import subdivision8 from '../assets/svg/subdivision-8.svg';
import subdivision9 from '../assets/svg/subdivision-9.svg';

import subdivision1Active from '../assets/svg/subdivision-1Active.svg';
import subdivision2Active from '../assets/svg/subdivision-2Active.svg';
import subdivision3Active from '../assets/svg/subdivision-3-Active.svg';
import subdivision4Active from '../assets/svg/subdivision-4Active.svg';
import subdivision5Active from '../assets/svg/subdivision-5Active.svg';
import subdivision6Active from '../assets/svg/subdivision-6Active.svg';
import subdivision7Active from '../assets/svg/subdivision-7Active.svg';
import subdivision8Active from '../assets/svg/subdivision-8Active.svg';
import subdivision9Active from '../assets/svg/subdivision-9Active.svg';

// Play/Pause and BPM icons
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';
import plus5Button from '../assets/svg/plus5button.svg';
import minus5Button from '../assets/svg/minus5button.svg';

export default function GridModeMetronome({
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
  setTapTempo,
  togglePlay,
  analogMode = false // In Grid Mode we use analogMode = false
}) {
  // gridConfig: array of length equal to subdivisions.
  // Possible values:
  //   1 -> Only the bottom square active (normal beat)
  //   2 -> Bottom and middle squares active (accent beat)
  //   3 -> All three squares active (first beat)
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: subdivisions }, () => 1)
  );

  // Update gridConfig when subdivisions change while preserving existing states.
  useEffect(() => {
    setGridConfig((prev) => {
      const newConfig = Array.from({ length: subdivisions }, (_, i) =>
        prev[i] !== undefined ? prev[i] : 1
      );
      return newConfig;
    });
  }, [subdivisions]);

  // When a column is clicked, cycle its state: 1 → 2 → 3 → 1
  const handleColumnClick = useCallback(
    (index) => {
      setGridConfig((prev) => {
        const newConfig = [...prev];
        newConfig[index] = (newConfig[index] % 3) + 1;
        return newConfig;
      });
    },
    [setGridConfig]
  );

  // Initialize metronome logic and pass gridConfig as beatConfig
  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions,
    isPaused,
    setIsPaused,
    swing,
    volume,
    beatConfig: gridConfig,
    setSubdivisions,
    analogMode
  });

  // Pass tapTempo to parent if needed.
  useEffect(() => {
    if (setTapTempo) {
      setTapTempo(() => logic.tapTempo);
    }
  }, [logic.tapTempo, setTapTempo]);

  // Use fixed size for grid squares.
  const squareSize = 50; // Fixed square size in pixels
  const gridWidth = subdivisions * squareSize;
  const gridHeight = squareSize * 3; // Always 3 rows

  // Determine the currently active column for synchronization.
  const currentBeat = logic.currentSubdivision;

  // Create subdivision buttons using the SVG icons from AdvancedCircleMetronome.
  const subIcons = [
    subdivision1,
    subdivision2,
    subdivision3,
    subdivision4,
    subdivision5,
    subdivision6,
    subdivision7,
    subdivision8,
    subdivision9
  ];
  const subIconsActive = [
    subdivision1Active,
    subdivision2Active,
    subdivision3Active,
    subdivision4Active,
    subdivision5Active,
    subdivision6Active,
    subdivision7Active,
    subdivision8Active,
    subdivision9Active
  ];
  const subdivisionButtons = subIcons.map((icon, idx) => {
    const subVal = idx + 1;
    const isActive = subVal === subdivisions;
    const iconToUse = isActive ? subIconsActive[idx] : icon;
    return (
      <img
        key={subVal}
        src={iconToUse}
        alt={`Subdivision ${subVal}`}
        className={`subdivision-button ${isActive ? 'active' : ''}`}
        onClick={() => setSubdivisions(subVal)}
        style={{ cursor: 'pointer', width: '36px', height: '36px' }}
      />
    );
  });

  // Play/Pause handler: uses togglePlay if provided, otherwise toggles isPaused.
  const handlePlayPause = () => {
    if (typeof togglePlay === 'function') {
      togglePlay();
    } else {
      setIsPaused((prev) => !prev);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Grid system */}
      <svg
        width={gridWidth}
        height={gridHeight}
        style={{ margin: '0 auto', display: 'block' }}
      >
        {gridConfig.map((state, colIndex) => (
          <g
            key={colIndex}
            onClick={() => handleColumnClick(colIndex)}
            style={{ cursor: 'pointer' }}
          >
            {Array.from({ length: 3 }, (_, rowIndex) => {
              // In SVG, y=0 is at the top. Rows: 0 (top), 1 (middle), 2 (bottom).
              // A row is active if rowIndex >= (3 - state)
              const isActive = rowIndex >= (3 - state);
              const isCurrent =
                colIndex === currentBeat &&
                !isPaused &&
                logic.audioCtx &&
                logic.audioCtx.state === 'running';
              return (
                <image
                  key={rowIndex}
                  href={isActive ? squareActive : squareInactive}
                  x={colIndex * squareSize}
                  y={rowIndex * squareSize}
                  width={squareSize}
                  height={squareSize}
                  className={isCurrent ? 'active-beat' : ''}
                />
              );
            })}
          </g>
        ))}
      </svg>

      {/* Play/Pause button placed directly below the grid */}
      <div style={{ marginTop: '10px' }}>
        <button
          onClick={handlePlayPause}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <img
            src={isPaused ? playIcon : pauseIcon}
            alt={isPaused ? 'Play' : 'Pause'}
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
        </button>
      </div>

      {/* Subdivision buttons */}
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <h3>Subdivision</h3>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {subdivisionButtons}
        </div>
      </div>

      {/* Sliders for Swing, Volume, and Tempo */}
      <div className="sliders-container" style={{ marginTop: '20px' }}>
        {subdivisions % 2 === 0 && subdivisions >= 2 && (
          <div className="slider-item" style={{ marginBottom: '10px' }}>
            <label>Swing: {Math.round(swing * 200)}% </label>
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
        <div className="slider-item" style={{ marginBottom: '10px' }}>
          <label>Volume: {Math.round(volume * 100)}% </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-item tempo-slider">
          <label>Tempo: {tempo} BPM </label>
          <input
            type="range"
            min={15}
            max={240}
            step={1}
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-item tempo-buttons">
          <button
            onClick={() => setTempo(tempo - 5)}
            style={{ background: 'transparent', border: 'none', padding: 0 }}
          >
            <img
              src={minus5Button}
              alt="-5 BPM"
              style={{ width: '60px', height: '60px' }}
            />
          </button>
          <span>{tempo} BPM</span>
          <button
            onClick={() => setTempo(tempo + 5)}
            style={{ background: 'transparent', border: 'none', padding: 0 }}
          >
            <img
              src={plus5Button}
              alt="+5 BPM"
              style={{ width: '60px', height: '60px' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
