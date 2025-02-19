import React, { useState, useEffect, useCallback } from 'react';
import useMetronomeLogic from '../hooks/useMetronomeLogic'; // Custom hook for audio scheduling

// Grid Icons
import squareInactive from '../assets/svg/grid/square_inactive.svg';
import squareActive from '../assets/svg/grid/square_active.svg';

// Tap Tempo Icon
import tapButtonIcon from '../assets/svg/tap-button.svg';

// Play/Pause Icons
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

// Subdivision Icons (inactive)
import subdivision1 from '../assets/svg/subdivision-1.svg';
import subdivision2 from '../assets/svg/subdivision-2.svg';
import subdivision3 from '../assets/svg/subdivision-3.svg';
import subdivision4 from '../assets/svg/subdivision-4.svg';
import subdivision5 from '../assets/svg/subdivision-5.svg';
import subdivision6 from '../assets/svg/subdivision-6.svg';
import subdivision7 from '../assets/svg/subdivision-7.svg';
import subdivision8 from '../assets/svg/subdivision-8.svg';
import subdivision9 from '../assets/svg/subdivision-9.svg';

// Subdivision Icons (active)
import subdivision1Active from '../assets/svg/subdivision-1Active.svg';
import subdivision2Active from '../assets/svg/subdivision-2Active.svg';
import subdivision3Active from '../assets/svg/subdivision-3-Active.svg';
import subdivision4Active from '../assets/svg/subdivision-4Active.svg';
import subdivision5Active from '../assets/svg/subdivision-5Active.svg';
import subdivision6Active from '../assets/svg/subdivision-6Active.svg';
import subdivision7Active from '../assets/svg/subdivision-7Active.svg';
import subdivision8Active from '../assets/svg/subdivision-8Active.svg';
import subdivision9Active from '../assets/svg/subdivision-9Active.svg';

// Create an icons object for easier reference
const subdivisionIcons = {
  subdivision1, subdivision2, subdivision3, subdivision4, subdivision5,
  subdivision6, subdivision7, subdivision8, subdivision9,
  subdivision1Active, subdivision2Active, subdivision3Active, subdivision4Active,
  subdivision5Active, subdivision6Active, subdivision7Active, subdivision8Active,
  subdivision9Active
};

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
  registerTogglePlay,
  // For Grid Mode:
  analogMode = false,
  gridMode = true,
  accents = null,      // External accent state (array of booleans)
  updateAccents,       // Function to update parent accent state

  // Training Mode Props
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,

  // Tap Tempo Registration
  registerTapTempo
}) {
  // Local grid configuration state:
  // For grid mode: 0 = mute, 1 = normal, 2 = accent; first beat is fixed as 3.
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 0))
  );

  // Initialize the metronome logic hook, passing in gridConfig as the beat configuration.
  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions,
    isPaused,
    setIsPaused,
    swing,
    volume,
    beatConfig: gridConfig,  // Use local gridConfig to determine sound (normal/accent/first)
    setSubdivisions,
    analogMode,
    gridMode,
    accents,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp
  });

  // Tap Tempo Registration
  useEffect(() => {
    if (registerTapTempo && logic.tapTempo) {
      registerTapTempo(logic.tapTempo);
    }
  }, [registerTapTempo, logic.tapTempo]);

  // Helper function to compare two arrays (shallow comparison)
  const arraysEqual = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  useEffect(() => {
    // If external accents are provided, sync gridConfig accordingly.
    // Mapping: first beat always 3; for others, if accent true then state 2, else mute (0).
    if (accents && accents.length === subdivisions) {
      const newGridConfig = accents.map((accent, i) =>
        i === 0 ? 3 : (accent ? 2 : 0)
      );
      setGridConfig(newGridConfig);
    } else {
      // Otherwise, initialize with default values (first beat fixed, others mute)
      setGridConfig(
        Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 0))
      );
    }
  }, [subdivisions, accents]);

  // Handle clicks on a grid column: cycle through states for non-first beats:
  // mute (0) → normal (1) → accent (2) → mute (0)
  const handleColumnClickIndex = useCallback((index) => {
    if (index === 0) return; // Do not change the first beat cyclically
    setGridConfig((prev) => {
      const newConfig = [...prev];
      newConfig[index] = (newConfig[index] + 1) % 3;
      
      // Update external accent state if updateAccents is provided
      if (updateAccents) {
        const newAccents = newConfig.map((state, i) =>
          i === 0 ? true : state === 2
        );
        updateAccents(newAccents);
      }
      
      return newConfig;
    });
  }, [updateAccents]);

  // Create subdivision buttons for changing the number of subdivisions.
  const subdivisionButtons = Array.from({ length: 9 }, (_, idx) => {
    const subVal = idx + 1;
    const isActive = subVal === subdivisions;
    const iconKey = isActive ? `subdivision${subVal}Active` : `subdivision${subVal}`;
    return (
      <img
        key={subVal}
        src={subdivisionIcons[iconKey]}
        alt={`Subdivision ${subVal}`}
        className={`subdivision-button ${isActive ? 'active' : ''}`}
        onClick={() => setSubdivisions(subVal)}
        style={{ cursor: 'pointer', width: '36px', height: '36px', margin: '0 3px' }}
      />
    );
  });

  // Handle mobile detection to adjust UI elements if needed.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manual play/pause handler.
  const handlePlayPause = () => {
    if (isPaused) {
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          setIsPaused(false);
          logic.startScheduler();
        }).catch((err) => {
          console.error("[GridModeMetronome] Error resuming AudioContext:", err);
        });
      } else {
        setIsPaused(false);
        logic.startScheduler();
      }
    } else {
      setIsPaused(true);
      logic.stopScheduler();
    }
  };

  // Register the play/pause handler for global keyboard shortcuts.
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay, handlePlayPause]);

  // Automatically start or stop the scheduler when the pause state changes.
  useEffect(() => {
    if (!isPaused) {
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          logic.startScheduler();
        });
      } else {
        logic.startScheduler();
      }
    } else {
      logic.stopScheduler();
    }
  }, [isPaused, logic]);

  // Additional effect: set swing to 0 when subdivisions is odd.
  useEffect(() => {
    if (subdivisions % 2 !== 0 && swing !== 0) {
      setSwing(0);
    }
  }, [subdivisions]);

  // Build the SVG grid: each column contains 3 squares.
  const gridSquares = Array.from({ length: subdivisions }, (_, colIndex) => (
    <g
      key={colIndex}
      onClick={() => handleColumnClickIndex(colIndex)}
      style={{ cursor: 'pointer' }}
    >
      {Array.from({ length: 3 }, (_, rowIndex) => {
        const isActive = rowIndex >= (3 - gridConfig[colIndex]);
        const isCurrent = (colIndex === logic.currentSubdivision && !isPaused);
        return (
          <image
            key={rowIndex}
            href={isActive ? squareActive : squareInactive}
            x={colIndex * 50}
            y={rowIndex * 50}
            width={50}
            height={50}
            style={{
              transition: 'opacity 0.2s ease-in-out',
              opacity: isCurrent ? 1 : 0.6
            }}
            alt={`Grid cell col=${colIndex}, row=${rowIndex}`}
          />
        );
      })}
    </g>
  ));

  return (
    <div style={{ textAlign: 'center' }}>
      {/* SVG grid container */}
      <svg
        width={subdivisions * 50}
        height={150}
        style={{ margin: '0 auto', display: 'block' }}
      >
        {gridSquares}
      </svg>

      {/* Subdivision chooser */}
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <h3>Subdivision</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {subdivisionButtons}
        </div>
      </div>

      {/* Play/Pause button */}
      <div style={{ marginTop: '10px' }}>
        <button
          onClick={handlePlayPause}
          style={{ padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}
          aria-label="Toggle play/pause"
        >
          <img
            src={isPaused ? playIcon : pauseIcon}
            alt={isPaused ? 'Play' : 'Pause'}
            style={{ width: '36px', height: '36px' }}
          />
        </button>
      </div>

      {/* Sliders for Swing, Volume, and Tempo */}
      <div className="sliders-container" style={{ marginTop: '20px', width: '100%' }}>
        <div className="slider-item" style={{ marginBottom: '10px', maxWidth: '300px', margin: '0 auto' }}>
          {subdivisions % 2 === 0 && (
            <>
              <label>Swing: {Math.round(swing * 200)}% </label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={swing}
                onChange={(e) => {
                  setSwing(parseFloat(e.target.value));
                }}
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
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
            }}
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
            onChange={(e) => {
              setTempo(parseFloat(e.target.value));
            }}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Tap Tempo button for mobile devices */}
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '20px' }}
          aria-label="Tap Tempo"
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
