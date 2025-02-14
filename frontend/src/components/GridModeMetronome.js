// src/components/GridModeMetronome.js

import React, { useState, useEffect, useCallback } from 'react';
import useMetronomeLogic from './useMetronomeLogic';

// Grid Icons
import squareInactive from '../assets/svg/grid/square_inactive.svg';
import squareActive from '../assets/svg/grid/square_active.svg';

// Tap Tempo Icons
import tapButtonIcon from '../assets/svg/tap-button.svg';

// Play/Pause Icons
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

// Subdivision icons (inactive)
import subdivision1 from '../assets/svg/subdivision-1.svg';
import subdivision2 from '../assets/svg/subdivision-2.svg';
import subdivision3 from '../assets/svg/subdivision-3.svg';
import subdivision4 from '../assets/svg/subdivision-4.svg';
import subdivision5 from '../assets/svg/subdivision-5.svg';
import subdivision6 from '../assets/svg/subdivision-6.svg';
import subdivision7 from '../assets/svg/subdivision-7.svg';
import subdivision8 from '../assets/svg/subdivision-8.svg';
import subdivision9 from '../assets/svg/subdivision-9.svg';

// Subdivision icons (active)
import subdivision1Active from '../assets/svg/subdivision-1Active.svg';
import subdivision2Active from '../assets/svg/subdivision-2Active.svg';
import subdivision3Active from '../assets/svg/subdivision-3-Active.svg';
import subdivision4Active from '../assets/svg/subdivision-4Active.svg';
import subdivision5Active from '../assets/svg/subdivision-5Active.svg';
import subdivision6Active from '../assets/svg/subdivision-6Active.svg';
import subdivision7Active from '../assets/svg/subdivision-7Active.svg';
import subdivision8Active from '../assets/svg/subdivision-8Active.svg';
import subdivision9Active from '../assets/svg/subdivision-9Active.svg';

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
  analogMode = false,
  gridMode = true, // Indicates that Grid Mode is active
  accents = null    // <-- New prop: accent configuration from advanced circle mode
}) {
  // Grid configuration: each column is initially set to 1.
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: subdivisions }, () => 1)
  );

  // Update grid configuration when subdivisions or accents change.
  useEffect(() => {
    setGridConfig((prev) => {
      const newConfig = Array.from({ length: subdivisions }, (_, i) =>
        i === 0 ? 3 : (accents && accents[i] ? 2 : (prev[i] !== undefined ? prev[i] : 1))
      );
      return newConfig;
    });
  }, [subdivisions, accents]); // <-- Added accents as a dependency

  // Toggle a grid column's state on click.
  const handleColumnClickIndex = useCallback((index) => {
    setGridConfig((prev) => {
      const newConfig = [...prev];
      newConfig[index] = (newConfig[index] % 3) + 1;
      return newConfig;
    });
  }, []);

  // Create subdivision buttons with icons.
  const subdivisionButtons = (() => {
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
    return subIcons.map((icon, idx) => {
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
          style={{ cursor: 'pointer', width: '36px', height: '36px', margin: '0 3px' }}
        />
      );
    });
  })();

  // Initialize metronome logic; pass gridConfig as beatConfig.
  const { currentSubdivision, tapTempo } = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions,
    isPaused,
    setIsPaused,
    swing,
    volume,
    beatConfig: gridConfig,
    setSubdivisions,
    analogMode,
    gridMode
  });

  // Pass the tapTempo function to a parent component if needed.
  useEffect(() => {
    if (setTapTempo) {
      setTapTempo(() => tapTempo);
    }
  }, [tapTempo, setTapTempo]);

  // Define square dimensions and grid dimensions.
  const squareSize = 50;
  const gridWidth = subdivisions * squareSize;
  const gridHeight = squareSize * 3;

  // Mobile detection: check if the device width is less than 768px.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      {/* SVG Grid Display */}
      <svg
        width={gridWidth}
        height={gridHeight}
        style={{ margin: '0 auto', display: 'block' }}
      >
        {gridConfig.map((state, colIndex) => (
          <g
            key={colIndex}
            onClick={() => handleColumnClickIndex(colIndex)}
            style={{ cursor: 'pointer' }}
          >
            {Array.from({ length: 3 }, (_, rowIndex) => {
              const isActive = rowIndex >= (3 - state);
              // Highlight the column if it matches the current subdivision and the metronome is running.
              const isCurrent = colIndex === currentSubdivision && !isPaused;
              return (
                <image
                  key={rowIndex}
                  href={isActive ? squareActive : squareInactive}
                  x={colIndex * squareSize}
                  y={rowIndex * squareSize}
                  width={squareSize}
                  height={squareSize}
                  className={`grid-square ${isCurrent ? 'active-beat' : ''}`}
                  style={{
                    transition: 'opacity 0.2s ease-in-out',
                    opacity: isCurrent ? 1 : 0.6,
                  }}
                />
              );
            })}
          </g>
        ))}
      </svg>

      {/* Subdivision Buttons */}
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <h3>Subdivision</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {subdivisionButtons}
        </div>
      </div>

      {/* Play/Pause Button */}
      <div style={{ marginTop: '10px' }}>
        <button
          onClick={togglePlay}
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
            style={{ width: '36px', height: '36px' }}
          />
        </button>
      </div>

      {/* Sliders for Volume, Swing, and Tempo */}
      <div className="sliders-container" style={{ marginTop: '20px', width: '100%' }}>
        <div className="slider-item" style={{ marginBottom: '10px', maxWidth: '300px', margin: '0 auto' }}>
          {(!analogMode && subdivisions % 2 === 0 && subdivisions >= 2) && (
            <>
              <label>Swing: {Math.round(swing * 200)}% </label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={swing}
                onChange={(e) => setSwing(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </>
          )}
        </div>
        <div className="slider-item" style={{ marginBottom: '10px', maxWidth: '300px', margin: '0 auto' }}>
          <label>Volume: {Math.round(volume * 100)}% </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div className="slider-item tempo-slider" style={{ maxWidth: '300px', margin: '0 auto' }}>
          <label>Tempo: {tempo} BPM </label>
          <input
            type="range"
            min={15}
            max={240}
            step={1}
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Conditionally render the Tap Tempo button on mobile devices */}
      {isMobile && (
        <button
          onClick={tapTempo}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          <img
            src={tapButtonIcon}
            alt="Tap Tempo"
            style={{ height: '35px', objectFit: 'contain' }}
          />
        </button>
      )}
    </div>
  );
}