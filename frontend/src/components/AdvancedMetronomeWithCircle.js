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

// Play/Pause icons for the overlay button
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

// SVG buttons for BPM adjustment
import plus5Button from '../assets/svg/plus5button.svg';
import minus5Button from '../assets/svg/minus5button.svg';

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
  togglePlay // Prop for toggling play/pause
}) {
  // First beat is always accented
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );

  // Update accents when the number of subdivisions changes
  useEffect(() => {
    setAccents((prev) => {
      const newArr = [];
      for (let i = 0; i < subdivisions; i++) {
        newArr[i] = i === 0 ? true : (prev[i] || false);
      }
      return newArr;
    });
  }, [subdivisions]);

  // Force the swing parameter to 0 when the number of subdivisions is odd
  useEffect(() => {
    if (subdivisions % 2 !== 0) {
      setSwing(0);
    }
  }, [subdivisions, setSwing]);

  // Toggle the accent for a beat (except for the first beat)
  const toggleAccent = (index) => {
    if (index === 0) return; // Do not toggle the first beat
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

  // Pass the tapTempo function to the parent component if provided
  useEffect(() => {
    if (setTapTempo) {
      setTapTempo(() => logic.tapTempo);
    }
  }, [logic.tapTempo, setTapTempo]);

  // Determine which beat icon to display based on index and active state
  function getBeatIcon(beatIndex, isActive) {
    const isFirst = beatIndex === 0;
    const isAccented = accents[beatIndex];

    if (isFirst) {
      return isActive ? firstBeatActive : firstBeat;
    } else if (isAccented) {
      return isActive ? accentedBeatActive : accentedBeat;
    } else {
      return isActive ? normalBeatActive : normalBeat;
    }
  }

  // Detect if the device is mobile based on viewport width
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set tempo minimum dynamically: 15 BPM on mobile, 30 BPM otherwise
  const tempoMin = isMobile ? 15 : 30;

  // Calculate container size dynamically based on viewport width
  const getContainerSize = () => {
    if (window.innerWidth < 600) {
      // Mobile: max 300px, with 20px padding on each side
      return Math.min(window.innerWidth - 40, 300);
    } else if (window.innerWidth < 1024) {
      // Tablet: max 400px
      return Math.min(window.innerWidth - 40, 400);
    } else {
      // Desktop: fixed 300px as before
      return 300;
    }
  };

  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    const handleResize = () => {
      setContainerSize(getContainerSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate the radius based on the container size
  const radius = containerSize / 2;

  // Create beat data for each subdivision using the dynamic radius
  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
    const xPos = radius * Math.cos(angle);
    const yPos = radius * Math.sin(angle);
    const isActive =
      logic.currentSubdivision === i &&
      !isPaused &&
      logic.audioCtx &&
      logic.audioCtx.state === 'running';

    const icon = getBeatIcon(i, isActive);
    return { i, xPos, yPos, icon };
  });

  // Render beat markers on the circle
  const beatMarkers = beatData.map((bd) => (
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
  ));

  // Draw lines connecting beats if there are 3 or more subdivisions
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

  // Arrays for normal and active subdivision icons
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
      {/* Metronome Canvas with dynamic size */}
      <div
        className="metronome-container"
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
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

      {/* Subdivision Buttons */}
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <h3>Subdivision</h3>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center'
          }}
        >
          {subdivisionButtons}
        </div>
      </div>

      {/* Slider and Tempo Controls */}
      <div className="sliders-container" style={{ marginTop: '20px' }}>
        {/* Swing slider (only if subdivisions are even and at least 2) */}
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

        {/* Volume slider */}
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

        {/* Tempo control (tempo slider) - min value is dynamic */}
        <div className="slider-item tempo-slider">
          <label>Tempo: {tempo} BPM </label>
          <input
            type="range"
            min={tempoMin}
            max={240}
            step={1}
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
          />
        </div>

        {/* Tempo control for Smartphones: ±5 BPM buttons using SVGs */}
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
