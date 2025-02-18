// File: src/components/AdvancedMetronomeWithCircle.js
import React, { useState, useEffect } from 'react';
import useMetronomeLogic from '../hooks/useMetronomeLogic';
import useKeyboardShortcuts from '../hooks/KeyboardShortcuts';

// Import icons and assets
import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';
import tapButtonIcon from '../assets/svg/tap-button.svg';
import circleSVG from '../assets/svg/circle.svg';

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

// Play/Pause Icons
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

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
  togglePlay,
  registerTogglePlay, // Used to register the play/pause handler for keyboard shortcuts
  analogMode = false,
  gridMode = false,
  accents,
  toggleAccent,
  // Training mode parameters:
  trainingMode = false,
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp
}) {
  // Local state for accents if the parent does not provide an accents array.
  const [localAccents, setLocalAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );
  const effectiveAccents = accents || localAccents;

  // Sync localAccents whenever subdivisions change (and no external accents are provided).
  useEffect(() => {
    if (!accents) {
      setLocalAccents((prev) => {
        if (prev.length === subdivisions) return prev;
        const newArr = [];
        for (let i = 0; i < subdivisions; i++) {
          newArr[i] = i === 0 ? true : (prev[i] !== undefined ? prev[i] : false);
        }
        console.log("[AdvancedMetronome] Updated local accents:", newArr);
        return newArr;
      });
    }
  }, [subdivisions, accents]);

  // Local function to toggle accent if no external toggleAccent is provided
  const localToggleAccent = (index) => {
    if (analogMode) return; // For analog mode, do nothing
    if (index === 0) return; // First beat remains an accent by definition
    setLocalAccents((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      console.log(`[AdvancedMetronome] Toggled accent for beat ${index}:`, updated[index]);
      return updated;
    });
  };
  const effectiveToggleAccent = toggleAccent || localToggleAccent;

  // Instantiate the metronome logic hook
  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions,
    setSubdivisions,
    isPaused,
    setIsPaused,
    swing,
    volume,
    accents: effectiveAccents,
    beatConfig: null, // Not needed for circle mode by default
    analogMode,
    gridMode,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp
  });

  // Handler for manually toggling play/pause (e.g. button click).
  const handlePlayPause = () => {
    console.log("[AdvancedMetronome] Play/Pause button pressed.");
    if (isPaused) {
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          console.log("[AdvancedMetronome] AudioContext resumed.");
          setIsPaused(false);
          logic.startScheduler();
        }).catch((err) => {
          console.error("[AdvancedMetronome] Error resuming AudioContext:", err);
        });
      } else {
        setIsPaused(false);
        logic.startScheduler();
      }
    } else {
      setIsPaused(true);
      logic.stopScheduler();
      console.log("[AdvancedMetronome] Scheduler stopped via handlePlayPause.");
    }
  };

  // Register the local handlePlayPause function for keyboard shortcuts
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay, handlePlayPause]);

  // Register keyboard shortcuts, ensuring onTapTempo is set to logic.tapTempo
  useKeyboardShortcuts({
    onTogglePlayPause: handlePlayPause,
    onTapTempo: logic.tapTempo,
    // Additional callbacks if needed
  });

  // This block generates the UI elements for selecting subdivisions
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
            console.log(`[AdvancedMetronome] Setting subdivisions to ${subVal}`);
            setSubdivisions(subVal);
            if (!analogMode && subdivisions % 2 === 0 && subdivisions >= 2 || gridMode) {
                setSwing(0);
            }
          }}
          style={{ cursor: 'pointer', width: '36px', height: '36px', margin: '0 3px' }}
        />
      );
    });
  })();

  // Calculate container size to make the circle responsive
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
    const handleResize = () => {
      const newSize = getContainerSize();
      console.log("[AdvancedMetronome] Resizing container to:", newSize);
      setContainerSize(newSize);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const radius = containerSize / 2;

  // Precompute beat positions for the circle mode
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

  // Decides which icon is shown for each beat
  function getBeatIcon(beatIndex, isActive) {
    const isFirst = beatIndex === 0;
    if (analogMode) return normalBeat;
    if (gridMode) {
      // If in grid mode, we rely on accent arrays or states differently
      const state = beatIndex === 0 ? 3 : (effectiveAccents[beatIndex] ? 2 : 1);
      if (state === 3) {
        return isActive ? firstBeatActive : firstBeat;
      } else if (state === 2) {
        return isActive ? accentedBeatActive : accentedBeat;
      } else {
        return isActive ? normalBeatActive : normalBeat;
      }
    } else {
      // In circle mode we directly use effectiveAccents
      const isAccented = effectiveAccents[beatIndex];
      if (isFirst) {
        return isActive ? firstBeatActive : firstBeat;
      } else if (isAccented) {
        return isActive ? accentedBeatActive : accentedBeat;
      } else {
        return isActive ? normalBeatActive : normalBeat;
      }
    }
  }

  // Draw lines between each pair of adjacent beats in circle mode
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

  // Check if we're on a mobile device
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      console.log("[AdvancedMetronome] Mobile view:", mobile);
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- NEW EFFECT: Start or stop the scheduler depending on isPaused ---
  useEffect(() => {
    if (!isPaused) {
      // If not paused, start or resume the scheduler
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          logic.startScheduler();
        });
      } else {
        logic.startScheduler();
      }
    } else {
      // If paused, stop the scheduler
      logic.stopScheduler();
    }
  }, [isPaused, logic]);

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
                cursor: 'pointer',
                zIndex: 10
              }}
              aria-label="Toggle play/pause"
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
                onClick={() => {
                  console.log(`[AdvancedMetronome] Toggle accent on beat ${bd.i}`);
                  effectiveToggleAccent(bd.i);
                }}
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
                cursor: 'pointer',
                zIndex: 10
              }}
              aria-label="Toggle play/pause"
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

      {/* Subdivision buttons (hidden in analogMode) */}
      {!analogMode && (
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <h3>Subdivision</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            {subdivisionButtons}
          </div>
        </div>
      )}

      {/* Sliders for Volume, Swing, and Tempo */}
      <div className="sliders-container" style={{ marginTop: '20px', width: '100%' }}>
        <div
          className="slider-item"
          style={{ marginBottom: '10px', maxWidth: '300px', margin: '0 auto' }}
        >
          {(!analogMode && subdivisions % 2 === 0 && subdivisions >= 2) && (
            <>
              <label>Swing: {Math.round(swing * 200)}% </label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={swing}
                onChange={(e) => {
                  console.log("[AdvancedMetronome] Swing changed to:", e.target.value);
                  setSwing(parseFloat(e.target.value));
                }}
                style={{ width: '100%' }}
              />
            </>
          )}
        </div>
        <div
          className="slider-item"
          style={{ marginBottom: '10px', maxWidth: '300px', margin: '0 auto' }}
        >
          <label>Volume: {Math.round(volume * 100)}% </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              console.log("[AdvancedMetronome] Volume changed to:", e.target.value);
              setVolume(parseFloat(e.target.value));
            }}
            style={{ width: '100%' }}
          />
        </div>
        <div
          className="slider-item tempo-slider"
          style={{ maxWidth: '300px', margin: '0 auto' }}
        >
          <label>Tempo: {tempo} BPM </label>
          <input
            type="range"
            min={15}
            max={240}
            step={1}
            value={tempo}
            onChange={(e) => {
              console.log("[AdvancedMetronome] Tempo changed to:", e.target.value);
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
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginTop: '20px'
          }}
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
