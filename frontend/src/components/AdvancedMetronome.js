// File: src/components/AdvancedMetronome.js

import React, { useState, useEffect, useCallback } from 'react';
import useMetronomeLogic from '../hooks/useMetronomeLogic';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

// Beat icons
import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';

// Buttons/icons
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';
import tapButtonIcon from '../assets/svg/tap-button.svg';

// If you need them:
import AnalogMetronomeCanvas from './metronome/AnalogMode/AnalogMetronomeCanvas';
import withTrainingContainer from './Training/withTrainingContainer';

// Optional line-connection CSS or SVG references
import './AdvancedMetronome.css'; // put your @keyframes pulse-beat here

/**
 * AdvancedMetronomeWithCircle – a circle-based metronome with:
 * - Single-subdivision pulse fix using onSingleSubTrigger
 * - Multi-subdivision line connections
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
  analogMode = false,
  gridMode = false,
  accents,
  toggleAccent,
  registerTogglePlay,
  beatMultiplier = 1,

  // Training / macro stuff if needed
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
}) {
  // -----------------------------------------
  //  Local Accents (if none passed in)
  // -----------------------------------------
  const [localAccents, setLocalAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );
  const effectiveAccents = accents || localAccents;

  useEffect(() => {
    if (!accents) {
      // If 'accents' is not provided, we keep our local array in sync
      setLocalAccents((prev) => {
        if (prev.length === subdivisions) return prev;
        return Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      });
    }
  }, [subdivisions, accents]);

  const localToggleAccent = useCallback(
    (index) => {
      if (analogMode || index === 0) return; // skip toggling first beat or in analog mode
      setLocalAccents((prev) => {
        const copy = [...prev];
        copy[index] = (copy[index] + 1) % 3; // 0 → 1 → 2 → 0
        return copy;
      });
    },
    [analogMode]
  );
  const effectiveToggleAccent = toggleAccent || localToggleAccent;

  // -----------------------------------------
  //  Single-Subdivision Pulse with callback
  // -----------------------------------------
  const [singleActive, setSingleActive] = useState(false);

  // Trigger function for each single-sub beat:
  const handleSingleSubTrigger = useCallback(() => {
    // Flip to active for ~200 ms
    setSingleActive(true);
    setTimeout(() => setSingleActive(false), 200);
  }, []);

  // -----------------------------------------
  //  Metronome Logic
  // -----------------------------------------
  const logic = useMetronomeLogic({
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
    accents: effectiveAccents,
    analogMode,
    gridMode,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    beatMultiplier,

    // The key: pass our single-beat callback so logic can call it 
    // every time subIndex=0 is scheduled if subdivisions===1
    onSingleSubTrigger: handleSingleSubTrigger
  });

  // -----------------------------------------
  //  Keyboard shortcuts
  // -----------------------------------------
  useKeyboardShortcuts({
    onTogglePlayPause: () => handlePlayPause(),
    onTapTempo: logic.tapTempo
  });

  // Register togglePlay if provided
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay]);

  // -----------------------------------------
  //  Play/Pause
  // -----------------------------------------
  const handlePlayPause = useCallback(() => {
    if (isPaused) {
      // unpause
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
      // pause
      setIsPaused(true);
      logic.stopScheduler();
    }
  }, [isPaused, logic, setIsPaused]);

  // -----------------------------------------
  //  Circle Layout and line connections
  // -----------------------------------------
  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    const handleResize = () => setContainerSize(getContainerSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const radius = containerSize / 2;

  // Create array with x/y positions
  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    if (subdivisions === 1) {
      return { i, xPos: 0, yPos: 0 };
    } else {
      const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
      return {
        i,
        xPos: radius * Math.cos(angle),
        yPos: radius * Math.sin(angle)
      };
    }
  });

  // Line connections for multi-sub:
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
            transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
          }}
        />
      );
    });
  }

  // -----------------------------------------
  //  Mobile detection for Tap Tempo
  // -----------------------------------------
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // -----------------------------------------
  //  Render
  // -----------------------------------------
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      {/* The container for the circle or analog */}
      <div
        className="metronome-container"
        style={{
          position: 'relative',
          width: containerSize,
          height: containerSize,
          margin: '0 auto'
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
              // For multi-sub: isActive => currentSubdivision === bd.i
              const multiActive = (logic.currentSubdivision === bd.i && !isPaused);
              // For single-sub: rely on our singleActive state
              const isSingle = (subdivisions === 1);
              const finalActive = isSingle ? singleActive : multiActive;

              // Decide which icon to use
              let icon;
              if (bd.i === 0) {
                icon = finalActive ? firstBeatActive : firstBeat;
              } else {
                const acc = effectiveAccents[bd.i];
                if (acc === 2) {
                  icon = finalActive ? accentedBeatActive : accentedBeat;
                } else {
                  icon = finalActive ? normalBeatActive : normalBeat;
                }
              }

              const isDim = (effectiveAccents[bd.i] === 0);

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
                    opacity: isDim ? 0.3 : 1,
                    transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    filter: finalActive
                      ? 'drop-shadow(0 0 5px rgba(248, 211, 141, 0.8))'
                      : 'none',
                    transform: finalActive ? 'scale(1.05)' : 'scale(1)',
                    // Keyframe pulse for ~300ms if finalActive is true
                    animation: finalActive ? 'pulse-beat 0.3s ease-out' : 'none'
                  }}
                />
              );
            })}
          </>
        )}
      </div>

      {/* Play/Pause button */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={handlePlayPause}
          className="play-pause-button"
          aria-label="Toggle play/pause"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '10px',
            outline: 'none'
          }}
        >
          <img
            src={isPaused ? playIcon : pauseIcon}
            alt={isPaused ? 'Play' : 'Pause'}
            className="play-pause-icon"
            style={{ width: 40, height: 40 }}
          />
        </button>
      </div>

      {/* Tap Tempo for mobile */}
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          aria-label="Tap Tempo"
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
            style={{ height: 35, objectFit: 'contain' }}
          />
        </button>
      )}
    </div>
  );
}

// Helper to compute a container size based on window width
function getContainerSize() {
  const w = window.innerWidth;
  if (w < 600) return Math.min(w - 40, 300);
  if (w < 1024) return Math.min(w - 40, 400);
  return 300;
}

// Wrap in training container if you need training mode logic:
export default withTrainingContainer(AdvancedMetronomeWithCircle);
