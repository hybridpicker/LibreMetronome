// File: src/components/AdvancedMetronomeWithCircle.js
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

import AnalogMetronomeCanvas from './metronome/AnalogMetronomeCanvas';

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

  const localToggleAccent = (index) => {
    if (analogMode) return;
    if (index === 0) return;
    setLocalAccents((prev) => {
      const updated = [...prev];
      updated[index] = (updated[index] + 1) % 3;
      return updated;
    });
  };
  const effectiveToggleAccent = toggleAccent || localToggleAccent;

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

  const handlePlayPause = () => {
    if (isPaused) {
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          setIsPaused(false);
          logic.startScheduler();
        }).catch((err) => {
          // Error handler left empty after console.log removal
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

  useKeyboardShortcuts({
    onTogglePlayPause: handlePlayPause,
    onTapTempo: logic.tapTempo
  });

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
            setSubdivisions(subVal);
            if (!analogMode && subdivisions % 2 === 0 && subdivisions >= 2) {
              setSwing(0);
            }
          }}
          style={{ cursor: 'pointer', width: '36px', height: '36px', margin: '0 3px' }}
        />
      );
    });
  })();

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
      setContainerSize(getContainerSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const radius = containerSize / 2;

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

  function getBeatIcon(beatIndex, isActive) {
    if (analogMode) return normalBeat;
    if (gridMode) {
      const state = beatIndex === 0 ? 3 : effectiveAccents[beatIndex];
      if (state === 3) {
        return isActive ? firstBeatActive : firstBeat;
      } else if (state === 2) {
        return isActive ? accentedBeatActive : accentedBeat;
      } else if (state === 1) {
        return isActive ? normalBeatActive : normalBeat;
      } else {
        return isActive ? normalBeatActive : normalBeat;
      }
    } else {
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
      
      // Enhanced styling to match MultiCircle mode
      return (
        <div
          key={index}
          className="line-connection"
          style={{
            width: `${dist}px`,
            height: "1px", // Make lines slightly thicker
            backgroundColor: "#00A0A0", // Use the same teal color
            left: `calc(50% + ${mx}px - ${dist / 2}px)`,
            top: `calc(50% + ${my}px)`,
            transform: `rotate(${theta}deg)`,
            position: "absolute",
            pointerEvents: "none",
            transformOrigin: "center center",
            boxShadow: "0 0 2px rgba(0, 160, 160, 0.4)", // Add subtle glow
            transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)" // Add transition for smoother updates
          }}
        />
      );
    });
  }

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            {lineConnections}
            {beatData.map((bd) => (
              <img
                key={bd.i}
                src={bd.icon}
                alt={`Beat ${bd.i}`}
                className="beat-icon"
                onClick={() => { effectiveToggleAccent(bd.i); }}
                style={{
                  left: `calc(50% + ${bd.xPos}px - 12px)`,
                  top: `calc(50% + ${bd.yPos}px - 12px)`,
                  opacity: effectiveAccents[bd.i] === 0 ? 0.3 : 1
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
    {/* Measure Actual tempo
      <div style={{ marginTop: '1.5rem' }}>
        <strong>Measured BPM:</strong> {logic.actualBpm.toFixed(2)}
      </div>
     */}
    </div>
  );
}