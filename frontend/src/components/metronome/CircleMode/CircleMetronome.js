// File: src/components/AdvancedMetronome.js

import React, { useState, useEffect, useRef } from 'react';
import useMetronomeLogic from '../hooks/useMetronomeLogic';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';

import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';
import tapButtonIcon from '../assets/svg/tap-button.svg';
import lineConnectionSvg from '../assets/svg/lineConnection.svg'; // if you are using a separate line-graphic

import AnalogMetronomeCanvas from './metronome/AnalogMode/AnalogMetronomeCanvas';
import withTrainingContainer from './Training/withTrainingContainer';

import './AdvancedMetronome.css';  // We'll put the @keyframes here (see bottom)

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
  // Additional props
  analogMode = false,
  gridMode = false,
  accents,
  toggleAccent,
  registerTogglePlay,
  beatMultiplier = 1,
  // Training / macro fields
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
}) {
  // Track local accents if none are passed
  const [localAccents, setLocalAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );
  const effectiveAccents = accents || localAccents;

  useEffect(() => {
    if (!accents) {
      // Re-init local accents if subdivisions change
      setLocalAccents((prev) => {
        if (prev.length === subdivisions) return prev;
        return Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      });
    }
  }, [subdivisions, accents]);

  const localToggleAccent = (index) => {
    if (analogMode) return;  // no toggling in analog mode
    setLocalAccents((prev) => {
      const copy = [...prev];
      copy[index] = (copy[index] + 1) % 4; // cycle 0→1→2→3→0
      return copy;
    });
  };
  const effectiveToggleAccent = toggleAccent || localToggleAccent;

  // =====================
  //  Metronome Logic
  // =====================
  const logic = useMetronomeLogic({
    tempo, setTempo,
    subdivisions, setSubdivisions,
    isPaused, setIsPaused,
    swing, volume,
    accents: effectiveAccents,
    analogMode, gridMode,
    macroMode, speedMode,
    measuresUntilMute, muteDurationMeasures,
    muteProbability, tempoIncreasePercent, measuresUntilSpeedUp,
    beatMultiplier
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: () => handlePlayPause(),
    onTapTempo: logic.tapTempo,
  });

  // Register togglePlay if provided
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay]);

  // Play/Pause
  const handlePlayPause = () => {
    if (isPaused) {
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          setIsPaused(false);
          logic.startScheduler();
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

  // =====================
  //  Single-subdivision “Inactive→Active→Inactive”
  // =====================

  const [singleActive, setSingleActive] = useState(false);
  const prevSubRef = useRef(null);

  useEffect(() => {
    const newSub = logic.currentSubdivision;
    const oldSub = prevSubRef.current;
    prevSubRef.current = newSub;

    // If we have just 1 subdivision and are not paused:
    if (subdivisions === 1 && !isPaused) {
      // If the beat changed from oldSub to newSub, that means a new measure is triggered.
      if (oldSub !== newSub) {
        // Make the single beat "active" for a short time
        setSingleActive(true);

        // Then revert to inactive after 250 ms
        const timer = setTimeout(() => {
          setSingleActive(false);
        }, 250);

        return () => clearTimeout(timer);
      }
    }
  }, [logic.currentSubdivision, isPaused, subdivisions]);

  // =====================
  //  Circle Layout
  // =====================
  const [containerSize, setContainerSize] = useState(calcContainerSize());
  useEffect(() => {
    const onResize = () => setContainerSize(calcContainerSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const radius = containerSize / 2;

  // Generate positions for each beat
  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    if (subdivisions === 1) {
      // single beat in center
      return { i, xPos: 0, yPos: 0 };
    } else {
      const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
      return {
        i,
        xPos: radius * Math.cos(angle),
        yPos: radius * Math.sin(angle),
      };
    }
  });

  // For mobile tap button
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // If not analog, optionally render line connections for multi-sub
  let lineConnections = null;
  if (!analogMode && subdivisions > 1) {
    lineConnections = beatData.map((bd, index) => {
      const nextIndex = (index + 1) % subdivisions;
      const bd2 = beatData[nextIndex];
      const dx = bd2.xPos - bd.xPos;
      const dy = bd2.yPos - bd.yPos;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mx = (bd.xPos + bd2.xPos) / 2;
      const my = (bd.yPos + bd2.yPos) / 2;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      return (
        <div
          key={`line-${index}`}
          className="line-connection"
          style={{
            width: dist,
            height: 1,
            backgroundColor: '#00A0A0',
            position: 'absolute',
            pointerEvents: 'none',
            left: `calc(50% + ${mx}px - ${dist / 2}px)`,
            top: `calc(50% + ${my}px)`,
            transform: `rotate(${angleDeg}deg)`,
            transformOrigin: 'center center',
            boxShadow: '0 0 3px rgba(0, 160, 160, 0.6)',
            transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        />
      );
    });
  }

  // Render function
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <div
        className="metronome-container"
        style={{
          position: 'relative',
          width: containerSize,
          height: containerSize,
          margin: '0 auto',
        }}
      >
        {analogMode ? (
          <AnalogMetronomeCanvas
            width={containerSize}
            height={containerSize}
            isPaused={isPaused}
            audioCtxCurrentTime={() => logic.audioCtx?.currentTime || 0}
            currentSubStartTime={() => logic.currentSubStartRef.current}
            currentSubInterval={() => logic.currentSubIntervalRef.current}
            currentSubIndex={logic.currentSubdivision}
          />
        ) : (
          <>
            {lineConnections}

            {beatData.map((bd) => {
              // Normal multi-sub approach:
              const isActive = (logic.currentSubdivision === bd.i && !isPaused);

              // For single-sub, we override isActive with singleActive state
              const useActive = (subdivisions === 1) ? singleActive : isActive;

              // Decide which icon to use (first / accent / normal)
              let icon;
              const beatState = effectiveAccents[bd.i];
              
              // Skip rendering this beat if it's muted (state 0)
              if (beatState === 0) {
                return null;
              }
              
              if (beatState === 3) {
                icon = useActive ? firstBeatActive : firstBeat;
              } else if (beatState === 2) {
                icon = useActive ? accentedBeatActive : accentedBeat;
              } else {
                icon = useActive ? normalBeatActive : normalBeat;
              }

              return (
                <img
                  key={bd.i}
                  src={icon}
                  alt={`Beat ${bd.i}`}
                  className="beat-icon"
                  onClick={() => effectiveToggleAccent(bd.i)}
                  style={{
                    left: `calc(50% + ${bd.xPos}px - 12px)`,
                    top: `calc(50% + ${bd.yPos}px - 12px)`,
                    transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    // short highlight
                    filter: useActive
                      ? 'drop-shadow(0 0 5px rgba(248, 211, 141, 0.8))'
                      : 'none',
                    transform: useActive ? 'scale(1.05)' : 'scale(1)',

                    // If it's going active, do a small keyframe "pulse"
                    animation: useActive
                      ? 'pulse-beat 0.3s ease-out'
                      : 'none',
                  }}
                />
              );
            })}
          </>
        )}
      </div>

      {/* Play / Pause button */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={handlePlayPause}
          className="play-pause-button"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '10px',
            outline: 'none',
          }}
          aria-label="Toggle play/pause"
        >
          <img
            src={isPaused ? playIcon : pauseIcon}
            alt={isPaused ? 'Play' : 'Pause'}
            className="play-pause-icon"
            style={{ width: 40, height: 40 }}
          />
        </button>
      </div>

      {/* Tap Tempo on Mobile */}
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          aria-label="Tap Tempo"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginTop: '20px',
          }}
        >
          <img
            src={tapButtonIcon}
            alt="Tap Tempo"
            style={{ height: 35, objectFit: 'contain' }}
          />
        </button>
      )}

      {/* Legend - explain what the beat states mean */}
      <div style={{ 
        marginTop: '15px', 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '15px',
        flexWrap: 'wrap',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: 'var(--beat-muted)', 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid var(--neutral-border)'
          }}></div>
          Mute
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: 'var(--beat-normal)', 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid var(--neutral-border)'
          }}></div>
          Normal Beat
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: 'var(--beat-accent)', 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid var(--neutral-border)'
          }}></div>
          Accent
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: 'var(--beat-first)', 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid var(--neutral-border)'
          }}></div>
          First Beat
        </div>
      </div>
    </div>
  );
}

/** Helper to compute container size based on screen width */
function calcContainerSize() {
  const w = window.innerWidth;
  if (w < 600) return Math.min(w - 40, 300);
  if (w < 1024) return Math.min(w - 40, 400);
  return 300;
}

// Wrap with training container if you want training modes:
export default withTrainingContainer(AdvancedMetronomeWithCircle);
