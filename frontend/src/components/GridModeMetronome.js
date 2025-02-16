// File: src/components/GridModeMetronome.js
import React, { useState, useEffect, useCallback } from 'react';
import useMetronomeLogic from './useMetronomeLogic';

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
  togglePlay,
  registerTogglePlay, // New prop to register the play/pause handler
  // For Grid Mode always: analogMode=false, gridMode=true
  analogMode = false,
  gridMode = true,
  // Ignore external accents – use internal default
  accents = null,
  updateAccents
}) {
  // Initialize the internal grid state: first column always 3, else 1.
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );
  useEffect(() => {
    setGridConfig(
      Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
    );
  }, [subdivisions]);

  // Synchronize accent status with parent if updateAccents is provided.
  useEffect(() => {
    if (updateAccents) {
      const newAccents = gridConfig.map((state, i) => (i === 0 ? true : state === 2));
      updateAccents(newAccents);
    }
  }, [gridConfig, updateAccents]);

  // On column click: cycle state 1 → 2 → 3 → 1.
  const handleColumnClickIndex = useCallback((index) => {
    setGridConfig(prev => {
      const newConfig = [...prev];
      newConfig[index] = (newConfig[index] % 3) + 1;
      console.log(`[GridModeMetronome] Column ${index} set to state ${newConfig[index]}`);
      return newConfig;
    });
  }, []);

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
          onClick={() => {
            console.log(`[GridModeMetronome] Setting subdivisions to ${subVal}`);
            setSubdivisions(subVal);
          }}
          style={{ cursor: 'pointer', width: '36px', height: '36px', margin: '0 3px' }}
        />
      );
    });
  })();

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
    analogMode,
    gridMode,
    accents,
    // Unused training parameters
    macroMode: 0,
    speedMode: 0,
    measuresUntilMute: 2,
    muteDurationMeasures: 1,
    muteProbability: 0.3,
    tempoIncreasePercent: 5,
    measuresUntilSpeedUp: 2
  });

  // Removed setTapTempo useEffect as setTapTempo is not defined

  // Define grid dimensions.
  const squareSize = 50;
  const gridWidth = subdivisions * squareSize;
  const gridHeight = squareSize * 3;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Play/Pause handler: calls logic.startScheduler() or logic.stopScheduler().
  const handlePlayPause = () => {
    console.log("[GridModeMetronome] Play/Pause button pressed.");
    if (isPaused) {
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          console.log("[GridModeMetronome] AudioContext resumed.");
          setIsPaused(false);
          logic.startScheduler();
        }).catch((err) => {
          console.error("[GridModeMetronome] Error resuming AudioContext:", err);
        });
      } else {
        setIsPaused(false);
        logic.startScheduler();
        console.log("[GridModeMetronome] Scheduler started.");
      }
    } else {
      setIsPaused(true);
      logic.stopScheduler();
      console.log("[GridModeMetronome] Scheduler stopped.");
    }
  };

  // Register the play/pause handler for keyboard shortcuts
  useEffect(() => {
    if (registerTogglePlay) {
      // Register the play/pause toggle function so that the keyboard shortcut can invoke it.
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay, handlePlayPause]);

  const gridSquares = Array.from({ length: subdivisions }, (_, colIndex) => (
    <g key={colIndex} onClick={() => handleColumnClickIndex(colIndex)} style={{ cursor: 'pointer' }}>
      {Array.from({ length: 3 }, (_, rowIndex) => {
        const isActive = rowIndex >= (3 - gridConfig[colIndex]);
        const isCurrent = colIndex === logic.currentSubdivision && !isPaused;
        return (
          <image
            key={rowIndex}
            href={isActive ? squareActive : squareInactive}
            x={colIndex * squareSize}
            y={rowIndex * squareSize}
            width={squareSize}
            height={squareSize}
            className="grid-square"
            style={{
              transition: 'opacity 0.2s ease-in-out',
              opacity: isCurrent ? 1 : 0.6
            }}
            alt={`Grid-Zelle ${colIndex}, Zeile ${rowIndex}`}
          />
        );
      })}
    </g>
  ));

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={gridWidth} height={gridHeight} style={{ margin: '0 auto', display: 'block' }}>
        {gridSquares}
      </svg>
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <h3>Subdivision</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {subdivisionButtons}
        </div>
      </div>
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
      {/* Slider container for Swing, Volume, and Tempo */}
      <div className="sliders-container" style={{ marginTop: '20px', width: '100%' }}>
        <div className="slider-item" style={{ marginBottom: '10px', maxWidth: '300px', margin: '0 auto' }}>
          <label>Swing: {Math.round(swing * 200)}% </label>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={swing}
            onChange={(e) => {
              console.log("[GridModeMetronome] Swing changed to:", e.target.value);
              setSwing(parseFloat(e.target.value));
            }}
            style={{ width: '100%' }}
          />
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
              console.log("[GridModeMetronome] Volume changed to:", e.target.value);
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
              console.log("[GridModeMetronome] Tempo changed to:", e.target.value);
              setTempo(parseFloat(e.target.value));
            }}
            style={{ width: '100%' }}
          />
        </div>
      </div>
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
