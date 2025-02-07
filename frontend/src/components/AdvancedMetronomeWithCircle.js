import React, { useState, useEffect } from 'react';
import useMetronomeLogic from './useMetronomeLogic';

import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';

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

// Import play/pause icons for overlay button
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

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
  togglePlay // New prop for toggling play/pause
}) {
  // First beat is always accented
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );

  // Update accents when subdivisions change
  useEffect(() => {
    setAccents((prev) => {
      const newArr = [];
      for (let i = 0; i < subdivisions; i++) {
        newArr[i] = i === 0 ? true : (prev[i] || false);
      }
      return newArr;
    });
  }, [subdivisions]);

  const toggleAccent = (index) => {
    if (index === 0) return; // Never toggle the first beat
    setAccents((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Initialize metronome logic
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

  // Pass tapTempo function to parent if provided
  useEffect(() => {
    if (setTapTempo) {
      setTapTempo(() => logic.tapTempo);
    }
  }, [logic.tapTempo, setTapTempo]);

  // Determine which beat icon to display
  function getBeatIcon(beatIndex, isActive) {
    const isFirst = (beatIndex === 0);
    const isAccented = accents[beatIndex];

    if (isFirst) {
      return isActive ? firstBeatActive : firstBeat;
    } else if (isAccented) {
      return isActive ? accentedBeatActive : accentedBeat;
    } else {
      return isActive ? normalBeatActive : normalBeat;
    }
  }

  // Define circle radius (used for calculation)
  const radiusPx = 150;

  // Create beat data for each subdivision
  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
    const xPos = radiusPx * Math.cos(angle);
    const yPos = radiusPx * Math.sin(angle);
    const isActive =
      logic.currentSubdivision === i &&
      !isPaused &&
      logic.audioCtx &&
      logic.audioCtx.state === 'running';

    const icon = getBeatIcon(i, isActive);
    return { i, xPos, yPos, icon };
  });

  // Render beat markers on the circle
  const beatMarkers = beatData.map((bd) => {
    return (
      <img
        key={bd.i}
        src={bd.icon}
        alt={`Beat ${bd.i}`}
        className="beat-icon"
        style={{
          left: `calc(50% + ${bd.xPos}px - 12px)`,
          top: `calc(50% + ${bd.yPos}px - 12px)`
        }}
        onClick={() => toggleAccent(bd.i)}
      />
    );
  });

  // Draw lines connecting beats if subdivisions >= 3
  let lineConnections = null;
  if (subdivisions >= 3) {
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

  // Define arrays for normal and active subdivision icons
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

  // Create subdivision buttons with active state icons
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
      />
    );
  });

  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      {/* Responsive container for metronome circle */}
      <div
        style={{
          position: 'relative',
          width: 'calc(100vw - 40px)',  // account for padding
          maxWidth: '300px',
          height: 'calc(100vw - 40px)',  // maintain square aspect ratio
          maxHeight: '300px',
          margin: '0 auto'
        }}
      >
        <img src={circleSVG} alt="Main Circle" className="metronome-circle" />
        {lineConnections}
        {beatMarkers}
        {/* Play/Pause overlay button centered within the circle */}
        <button
          className="play-pause-button-overlay"
          onClick={togglePlay}
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
      </div>

      {/* Subdivision header and buttons */}
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <h3>Subdivision</h3>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',          // Allow buttons to wrap into multiple rows
            gap: '8px',
            justifyContent: 'center'
          }}
        >
          {subdivisionButtons}
        </div>
      </div>

      {/* Sliders */}
      <div className="sliders-container" style={{ marginTop: '20px' }}>
        {/* Display swing slider only if subdivisions is even */}
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

        <div className="slider-item">
          <label>Tempo: {tempo} BPM </label>
          <input
            type="range"
            min={30}
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
