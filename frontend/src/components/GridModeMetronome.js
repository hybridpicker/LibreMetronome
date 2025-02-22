// File: src/components/GridModeMetronome.js
import React, { useState, useEffect, useCallback } from 'react';
import useMetronomeLogic from '../hooks/useMetronomeLogic';

import squareInactive from '../assets/svg/grid/square_inactive.svg';
import squareActive from '../assets/svg/grid/square_active.svg';
import tapButtonIcon from '../assets/svg/tap-button.svg';
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

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
  analogMode = false,
  gridMode = true,
  accents = null,
  updateAccents,
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  registerTapTempo,
  beatMultiplier = 1
}) {
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );

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
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    beatMultiplier
  });

  useEffect(() => {
    if (registerTapTempo && logic.tapTempo) {
      registerTapTempo(logic.tapTempo);
    }
  }, [registerTapTempo, logic.tapTempo]);

  const arraysEqual = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  useEffect(() => {
    if (accents && accents.length === subdivisions) {
      setGridConfig(accents);
    } else {
      setGridConfig(
        Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
      );
    }
  }, [subdivisions, accents]);

  const handleColumnClickIndex = useCallback((index) => {
    if (index === 0) return;
    setGridConfig((prev) => {
      const newConfig = [...prev];
      newConfig[index] = (newConfig[index] + 1) % 4;
      if (updateAccents) {
        updateAccents(newConfig);
      }
      return newConfig;
    });
  }, [updateAccents]);

  // Subdivision chooser UI
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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay, handlePlayPause]);

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

  useEffect(() => {
    if (subdivisions % 2 !== 0 && swing !== 0) {
      setSwing(0);
    }
  }, [subdivisions]);

  const gridSquares = Array.from({ length: subdivisions }, (_, colIndex) => (
    <g key={colIndex}>
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
              cursor: 'pointer',
              pointerEvents: 'auto',
              transition: 'opacity 0.2s ease-in-out',
              opacity: isCurrent ? 1 : 0.6
            }}
            onClick={() => handleColumnClickIndex(colIndex)}
            alt={`Grid cell col=${colIndex}, row=${rowIndex}`}
          />
        );
      })}
    </g>
  ));

  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        width={subdivisions * 50}
        height={150}
        style={{ margin: '0 auto', display: 'block' }}
      >
        {gridSquares}
      </svg>
      {/* Subdivision chooser UI */}
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
