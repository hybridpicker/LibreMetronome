// File: src/components/AdvancedMetronome.js

import React, { useState, useEffect } from 'react';
import useMetronomeLogic from '../hooks/useMetronomeLogic';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

// Import icons and assets
import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';
import tapButtonIcon from '../assets/svg/tap-button.svg';

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

import AnalogMetronomeCanvas from './metronome/AnalogMode/AnalogMetronomeCanvas';
import withTrainingContainer from './Training/withTrainingContainer';

// CSS
import './metronome/Controls/slider-styles.css'

/**
 * A reusable advanced metronome component with circle UI and optional training container.
 */
export function AdvancedMetronomeWithCircle({
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
  registerTogglePlay,
  analogMode = false,
  gridMode = false,
  accents,
  toggleAccent,
  trainingMode = false,
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  beatMultiplier = 1
}) {
  const [localAccents, setLocalAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );
  const effectiveAccents = accents || localAccents;

  // Keep local accents array in sync if no external accents were passed:
  useEffect(() => {
    if (!accents) {
      setLocalAccents((prev) => {
        if (prev.length === subdivisions) return prev;
        const newArr = [];
        for (let i = 0; i < subdivisions; i++) {
          newArr[i] = i === 0 ? 3 : (prev[i] !== undefined ? prev[i] : 0);
        }
        return newArr;
      });
    }
  }, [subdivisions, accents]);

  // Local toggle accent if no external toggle function is passed
  const localToggleAccent = (index) => {
    if (analogMode) return;     // no toggles in analog mode
    if (index === 0) return;    // skip the "first beat" accent
    setLocalAccents((prev) => {
      const updated = [...prev];
      updated[index] = (updated[index] + 1) % 3;
      return updated;
    });
  };

  const effectiveToggleAccent = toggleAccent || localToggleAccent;

  // Hook for scheduling
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
    beatConfig: null,
    analogMode,
    gridMode,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    beatMultiplier
  });

  // Play/pause logic
  const handlePlayPause = () => {
    if (isPaused) {
      // resuming
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume()
          .then(() => {
            setIsPaused(false);
            logic.startScheduler();
          })
          .catch(() => {
            // Optional: handle error on resume
          });
      } else {
        setIsPaused(false);
        logic.startScheduler();
      }
    } else {
      // pausing
      setIsPaused(true);
      logic.stopScheduler();
    }
  };

  // Optionally register the togglePlay callback:
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay, handlePlayPause]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: handlePlayPause,
    onTapTempo: logic.tapTempo
  });

  // Create subdivision icons array once
  const [subdivisionButtonsArray] = useState(() => {
    const subIcons = [
      subdivision1, subdivision2, subdivision3,
      subdivision4, subdivision5, subdivision6,
      subdivision7, subdivision8, subdivision9
    ];
    const subIconsActive = [
      subdivision1Active, subdivision2Active, subdivision3Active,
      subdivision4Active, subdivision5Active, subdivision6Active,
      subdivision7Active, subdivision8Active, subdivision9Active
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
            setSubdivisions(subVal);
            // If circle mode had a swing, but user selects an even subdivision, reset swing
            if (!analogMode && subdivisions % 2 === 0 && subdivisions >= 2) {
              setSwing(0);
            }
          }}
          style={{
            cursor: 'pointer', width: '36px',
            height: '36px', margin: '0 3px'
          }}
        />
      );
    });
  });

  // Compute container size for the circle
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

  // Generate positions for each beat icon around the circle
  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    let xPos, yPos;
    if (subdivisions === 1) {
      // single beat in center
      xPos = 0;
      yPos = 0;
    } else {
      const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
      xPos = radius * Math.cos(angle);
      yPos = radius * Math.sin(angle);
    }

    // "isActive" if the currentSub matches and the audio is playing
    const isActive =
      logic.currentSubdivision === i &&
      !isPaused &&
      logic.audioCtx &&
      logic.audioCtx.state === 'running';

    return {
      i, xPos, yPos,
      icon: getBeatIcon(i, isActive)
    };
  });

  // Return an icon for the i-th beat
  function getBeatIcon(beatIndex, isActive) {
    if (analogMode) {
      // all the same sound
      return normalBeat;
    }

    if (gridMode) {
      // grid mode uses a 3=first,2=accent,1=normal,0=off approach
      const state = beatIndex === 0 ? 3 : effectiveAccents[beatIndex];
      if (state === 3) {
        return isActive ? firstBeatActive : firstBeat;
      } else if (state === 2) {
        return isActive ? accentedBeatActive : accentedBeat;
      } else {
        return isActive ? normalBeatActive : normalBeat;
      }
    } else {
      // normal circle mode
      if (beatIndex === 0) {
        return isActive ? firstBeatActive : firstBeat;
      } else {
        const state = effectiveAccents[beatIndex];
        if (state === 2) {
          return isActive ? accentedBeatActive : accentedBeat;
        } else if (state === 1) {
          return isActive ? normalBeatActive : normalBeat;
        } else {
          return isActive ? normalBeatActive : normalBeat;
        }
      }
    }
  }

  // Optionally draw connecting lines in circle mode for 2+ subdivisions
  let lineConnections = null;
  if (!analogMode && subdivisions >= 2) {
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
            height: '1px',
            backgroundColor: '#00A0A0',
            left: `calc(50% + ${mx}px - ${dist / 2}px)`,
            top: `calc(50% + ${my}px)`,
            transform: `rotate(${theta}deg)`,
            position: 'absolute',
            pointerEvents: 'none',
            transformOrigin: 'center center',
            boxShadow: '0 0 3px rgba(0, 160, 160, 0.6)',
            transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
          }}
        />
      );
    });
  }

  // Monitor mobile layout
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start or stop the metronome scheduler if paused state changes
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

  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      {/* The main circle container */}
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
          <AnalogMetronomeCanvas
            width={containerSize}
            height={containerSize}
            isPaused={isPaused}
            audioCtxCurrentTime={() => (logic.audioCtx ? logic.audioCtx.currentTime : 0)}
            currentSubStartTime={() => logic.currentSubStartRef.current}
            currentSubInterval={() => logic.currentSubIntervalRef.current}
            currentSubIndex={logic.currentSubdivision}
          />
        ) : (
          <>
            {lineConnections}
            {beatData.map((bd) => (
              <img
                key={bd.i}
                src={bd.icon}
                alt={`Beat ${bd.i}`}
                className="beat-icon"
                onClick={() => {
                  effectiveToggleAccent(bd.i);
                }}
                style={{
                  left: `calc(50% + ${bd.xPos}px - 12px)`,
                  top: `calc(50% + ${bd.yPos}px - 12px)`,
                  opacity: effectiveAccents[bd.i] === 0 ? 0.3 : 1,
                  transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
                  filter: logic.currentSubdivision === bd.i && !isPaused
                    ? 'drop-shadow(0 0 5px rgba(248, 211, 141, 0.8))'
                    : 'none',
                  transform: logic.currentSubdivision === bd.i && !isPaused
                    ? 'scale(1.05)'
                    : 'scale(1)'
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Play/Pause button below the circle */}
      <div style={{ marginTop: '20px' }}>
        <button
          className="play-pause-button"
          onClick={handlePlayPause}
          aria-label="Toggle play/pause"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '10px',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
        >
          <img
            src={isPaused ? playIcon : pauseIcon}
            alt={isPaused ? 'Play' : 'Pause'}
            className="play-pause-icon"
            style={{
              width: '40px',
              height: '40px',
              transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)'
            }}
          />
        </button>
      </div>

      {/* Tap tempo button visible on mobile */}
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginTop: '20px',
            outline: 'none'
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

export default withTrainingContainer(AdvancedMetronomeWithCircle);
