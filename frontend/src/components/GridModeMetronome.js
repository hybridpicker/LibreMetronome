import React, { useState, useEffect, useCallback } from 'react';
import useMetronomeLogic from './useMetronomeLogic';

// Grid Icons
import squareInactive from '../assets/svg/grid/square_inactive.svg';
import squareActive from '../assets/svg/grid/square_active.svg';

// Play/Pause Icons
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

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
  analogMode = false
}) {
  // Grid configuration: Each column's value (1, 2, or 3) determines the sound type.
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: subdivisions }, () => 1)
  );

  // Update grid configuration when the number of subdivisions changes.
  useEffect(() => {
    setGridConfig((prev) => {
      const newConfig = Array.from({ length: subdivisions }, (_, i) =>
        prev[i] !== undefined ? prev[i] : 1
      );
      return newConfig;
    });
  }, [subdivisions]);

  // Toggle the state of a grid column on click.
  const handleColumnClickIndex = useCallback((index) => {
    setGridConfig((prev) => {
      const newConfig = [...prev];
      newConfig[index] = (newConfig[index] % 3) + 1;
      return newConfig;
    });
  }, []);

  // Initialize metronome logic; pass the grid configuration as beatConfig.
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

  useEffect(() => {
    if (setTapTempo) {
      setTapTempo(() => logic.tapTempo);
    }
  }, [logic.tapTempo, setTapTempo]);

  const squareSize = 50;
  const gridWidth = subdivisions * squareSize;
  const gridHeight = squareSize * 3;

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Grid Display */}
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
              // Highlight the column if it matches the current subdivision from the scheduler.
              const isCurrent =
                colIndex === logic.currentSubdivision && !isPaused;
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

      {/* Play/Pause Button */}
      <div style={{ marginTop: '10px' }}>
        <button
          onClick={togglePlay}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
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
      </div>
    </div>
  );
}
