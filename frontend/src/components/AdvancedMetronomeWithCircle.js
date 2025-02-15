// AdvancedMetronomeWithCircle.js
import React, { useState, useEffect } from 'react';
import useMetronomeLogic from './useMetronomeLogic';

import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';
import tapButtonIcon from '../assets/svg/tap-button.svg';

import circleSVG from '../assets/svg/circle.svg';

// Normal subdivision icons
import subdivision1 from '../assets/svg/subdivision-1.svg';
import subdivision2 from '../assets/svg/subdivision-2.svg';
import subdivision3 from '../assets/svg/subdivision-3.svg';
import subdivision4 from '../assets/svg/subdivision-4.svg';
import subdivision5 from '../assets/svg/subdivision-5.svg';
import subdivision6 from '../assets/svg/subdivision-6.svg';
import subdivision7 from '../assets/svg/subdivision-7.svg';
import subdivision8 from '../assets/svg/subdivision-8.svg';
import subdivision9 from '../assets/svg/subdivision-9.svg';

// Active subdivision icons
import subdivision1Active from '../assets/svg/subdivision-1Active.svg';
import subdivision2Active from '../assets/svg/subdivision-2Active.svg';
import subdivision3Active from '../assets/svg/subdivision-3-Active.svg';
import subdivision4Active from '../assets/svg/subdivision-4Active.svg';
import subdivision5Active from '../assets/svg/subdivision-5Active.svg';
import subdivision6Active from '../assets/svg/subdivision-6Active.svg';
import subdivision7Active from '../assets/svg/subdivision-7Active.svg';
import subdivision8Active from '../assets/svg/subdivision-8Active.svg';
import subdivision9Active from '../assets/svg/subdivision-9Active.svg';

// Play/Pause icons
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

// BPM adjustment buttons
import plus5Button from '../assets/svg/plus5button.svg';
import minus5Button from '../assets/svg/minus5button.svg';

import AnalogMetronomeCanvas from './AnalogMetronomeCanvas';

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
  setTapTempo,
  togglePlay,
  analogMode = false,
  accents,
  toggleAccent
}) {
  // Use parent's accents if provided; otherwise, initialize local accent state.
  const [localAccents, setLocalAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );
  const effectiveAccents = accents || localAccents;

  // Update local accent state when subdivisions change if parent's accents are not provided.
  useEffect(() => {
    if (!accents) {
      setLocalAccents((prev) => {
        if (prev.length === subdivisions) return prev;
        const newArr = [];
        for (let i = 0; i < subdivisions; i++) {
          newArr[i] = i === 0 ? true : (prev[i] !== undefined ? prev[i] : false);
        }
        return newArr;
      });
    }
  }, [subdivisions, accents]);

  // Use parent's toggleAccent if provided; otherwise, define a local version.
  const localToggleAccent = (index) => {
    if (analogMode) return;
    if (index === 0) return; // First beat remains accented
    setLocalAccents((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };
  const effectiveToggleAccent = toggleAccent || localToggleAccent;

  // Define handlePlayPause to toggle play/pause state.
  const handlePlayPause = () => {
    if (typeof togglePlay === 'function') {
      togglePlay();
    } else {
      setIsPaused((prev) => !prev);
    }
  };

  // Subdivision buttons (using icons, similar to GridMode)
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

  // Initialize metronome logic using the current accent configuration.
  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions,
    isPaused,
    setIsPaused,
    swing,
    volume,
    accents: effectiveAccents, // Use effective accents
    setSubdivisions,
    analogMode
  });

  useEffect(() => {
    if (setTapTempo) {
      setTapTempo(() => logic.tapTempo);
    }
  }, [logic.tapTempo, setTapTempo]);

  // Calculate container size (responsive).
  const getContainerSize = () => {
    if (window.innerWidth < 600) {
      return Math.min(window.innerWidth - 40, 300);
    } else if (window.innerWidth < 1024) {
      return Math.min(window.innerWidth - 40, 400);
    } else {
      return 300;
    }
  };
  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    const handleResize = () => setContainerSize(getContainerSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const radius = containerSize / 2;

  // Build beat data for circle mode.
  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
    const xPos = radius * Math.cos(angle);
    const yPos = radius * Math.sin(angle);
    const isActive =
      logic.currentSubdivision === i &&
      !isPaused &&
      logic.audioCtx &&
      logic.audioCtx.state === 'running';
    return {
      i,
      xPos,
      yPos,
      icon: getBeatIcon(i, isActive)
    };
  });

  // Determine which beat icon to display.
  function getBeatIcon(beatIndex, isActive) {
    const isFirst = beatIndex === 0;
    const isAccented = effectiveAccents[beatIndex];
    if (analogMode) return normalBeat;
    if (isFirst) {
      return isActive ? firstBeatActive : firstBeat;
    } else if (isAccented) {
      return isActive ? accentedBeatActive : accentedBeat;
    } else {
      return isActive ? normalBeatActive : normalBeat;
    }
  }

  // Build connecting lines if subdivisions >= 3.
  let lineConnections = null;
  if (!analogMode && subdivisions >= 3) {
    lineConnections = beatData.map((bd, index) => {
      const nextIndex = (index + 1) % subdivisions;
      const bd2 = beatData[nextIndex];
      const dx = bd2.xPos - bd.xPos;
      const dy = bd2.yPos - bd.yPos;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mx = (bd.xPos + bd2.xPos) / 2;
      const my = (bd.yPos + bd2.yPos) / 2;
      const theta = (Math.atan2(dy, dx) * 180) / Math.PI;
      return (
        <div
          key={index}
          className="line-connection"
          style={{
            width: `${dist}px`,
            left: `calc(50% + ${mx}px - ${dist / 2}px)`,
            top: `calc(50% + ${my}px - 1px)`,
            transform: `rotate(${theta}deg)`
          }}
        />
      );
    });
  }

  // Mobile detection: check if the device width is less than 768px.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      {/* Metronome display container */}
      <div
        className="metronome-container"
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          margin: '0 auto',
          position: 'relative'
        }}
      >
        {analogMode ? (
          <>
            <AnalogMetronomeCanvas
              width={containerSize}
              height={containerSize}
              isPaused={isPaused}
              audioCtxCurrentTime={() => (logic.audioCtx ? logic.audioCtx.currentTime : 0)}
              currentSubStartTime={() => logic.currentSubStartRef.current}
              currentSubInterval={() => logic.currentSubIntervalRef.current}
              currentSubIndex={logic.currentSubdivision}
            />
            <button
              className="play-pause-button-overlay"
              onClick={handlePlayPause}
              style={{
                position: 'absolute',
                left: '50%',
                top: '85%',
                transform: 'translate(-50%, -50%)',
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
          </>
        ) : (
          <>
            <img src={circleSVG} alt="Main Circle" className="metronome-circle" />
            {lineConnections}
            {beatData.map((bd) => (
              <img
                key={bd.i}
                src={bd.icon}
                alt={`Beat ${bd.i}`}
                className="beat-icon"
                style={{
                  left: `calc(50% + ${bd.xPos}px - 12px)`,
                  top: `calc(50% + ${bd.yPos}px - 12px)`
                }}
                onClick={() => effectiveToggleAccent(bd.i)}
              />
            ))}
            <button
              className="play-pause-button-overlay"
              onClick={handlePlayPause}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
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
          </>
        )}
      </div>

      {/* Subdivision buttons container */}
      {!analogMode && (
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <h3>Subdivision</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            {subdivisionButtons}
          </div>
        </div>
      )}

      {/* Slider container */}
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
          onClick={logic.tapTempo}
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
            style={{ height: '30px', objectFit: 'contain' }}
          />
        </button>
      )}
    </div>
  );
}
