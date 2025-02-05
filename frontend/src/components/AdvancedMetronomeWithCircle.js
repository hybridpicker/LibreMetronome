// src/components/AdvancedMetronomeWithCircle.js
import React, { useState, useEffect } from 'react';
import useMetronomeLogic from './useMetronomeLogic';

import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';

import circleSVG from '../assets/svg/circle.svg';

// Subdivision icons
import subdivision1 from '../assets/svg/subdivision-1.svg';
import subdivision2 from '../assets/svg/subdivision-2.svg';
import subdivision3 from '../assets/svg/subdivision-3.svg';
import subdivision4 from '../assets/svg/subdivision-4.svg';
import subdivision5 from '../assets/svg/subdivision-5.svg';
import subdivision6 from '../assets/svg/subdivision-6.svg';
import subdivision7 from '../assets/svg/subdivision-7.svg';
import subdivision8 from '../assets/svg/subdivision-8.svg';
import subdivision9 from '../assets/svg/subdivision-9.svg';

/*
 * This component arranges beat icons around a circle with radius ~140 px,
 * so the icons (24×24) appear on the circle boundary, 
 * and lines are drawn only if subdivisions >= 3.
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
  // First beat always accented
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );

  // If subdivisions changes, recast the array
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
    if (index === 0) return; // never toggle the first beat
    setAccents((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Metronome logic for audio scheduling
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

  // Pass tapTempo up to parent if needed
  useEffect(() => {
    if (setTapTempo) {
      setTapTempo(() => logic.tapTempo);
    }
  }, [logic.tapTempo, setTapTempo]);

  // Decide which icon to display
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

  /*
   * radiusPx ~ 150 so the 24×24 icons rest on the circle boundary
   * Tweak as needed if the lines appear slightly inside/outside.
   */
  const radiusPx = 150;

  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
    const xPos = radiusPx * Math.cos(angle);
    const yPos = radiusPx * Math.sin(angle);

    // isActive if currentSubdivision = i and not paused
    const isActive =
      logic.currentSubdivision === i &&
      !isPaused &&
      logic.audioCtx &&
      logic.audioCtx.state === 'running';

    const icon = getBeatIcon(i, isActive);
    return { i, xPos, yPos, icon };
  });

  // Beat icons
  const beatMarkers = beatData.map((bd) => {
    return (
      <img
        key={bd.i}
        src={bd.icon}
        alt={`Beat ${bd.i}`}
        className="beat-icon"
        style={{
          left: `calc(50% + ${bd.xPos}px - 12px)`,
          top:  `calc(50% + ${bd.yPos}px - 12px)`
        }}
        onClick={() => toggleAccent(bd.i)}
      />
    );
  });

  // Draw lines only if subdivisions >= 3
  let lineConnections = null;
  if (subdivisions >= 3) {
    lineConnections = beatData.map((bd, index) => {
      const nextIndex = (index + 1) % subdivisions;
      const bd2 = beatData[nextIndex];

      const dx = bd2.xPos - bd.xPos;
      const dy = bd2.yPos - bd.yPos;
      const dist = Math.sqrt(dx*dx + dy*dy);

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
            top:  `calc(50% + ${my}px - 1px)`,
            transform: `rotate(${theta}deg)`
          }}
        />
      );
    });
  }

  // Subdivision icons (1..9)
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
  const subdivisionButtons = subIcons.map((icon, idx) => {
    const subVal = idx + 1;
    const isActive = (subVal === subdivisions);
    return (
      <img
        key={subVal}
        src={icon}
        alt={`Subdivision ${subVal}`}
        className={`subdivision-button ${isActive ? 'active' : ''}`}
        onClick={() => setSubdivisions(subVal)}
      />
    );
  });

  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      <div style={{
        position: 'relative',
        width: '300px',
        height: '300px',
        margin: '0 auto'
      }}>
        <img
          src={circleSVG}
          alt="Main Circle"
          className="metronome-circle"
        />
        {lineConnections}
        {beatMarkers}
      </div>

      {/* Sliders */}
      <div className="sliders-container" style={{ marginTop: '20px' }}>
        {subdivisions >= 2 && (
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

      {/* Subdivision Buttons */}
      <div style={{ marginTop: '15px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {subdivisionButtons}
      </div>
    </div>
  );
}
