// File: src/components/AdvancedMetronome.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useMetronomeLogic from '../hooks/useMetronomeLogic';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

// Example icons for first, normal, accent
import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';

// For play/pause, tap tempo, etc.
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';
import tapButtonIcon from '../assets/svg/tap-button.svg';

// Optional analog mode
import AnalogMetronomeCanvas from './metronome/AnalogMode/AnalogMetronomeCanvas';
import withTrainingContainer from './Training/withTrainingContainer';
import AccelerateButton from './metronome/Controls/AccelerateButton';
import { manualTempoAcceleration } from '../hooks/useMetronomeLogic/trainingLogic';

// Import some CSS that includes @keyframes
import './AdvancedMetronome.css';

/**
 * A reusable circle-based metronome that triggers a pulse animation on EVERY beat,
 * by listening to "onAnySubTrigger" from the logic.
 */
export function AdvancedMetronomeWithCircle({
  // Metronome props
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

  // Accents:
  accents,
  toggleAccent,

  // Possibly from training mode
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  beatMultiplier = 1,

  // If you want to register a toggle function
  registerTogglePlay
}) {
  // --------------------------
  //  Local Accents (fallback)
  // --------------------------
  const [localAccents, setLocalAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );
  const effectiveAccents = accents || localAccents;

  useEffect(() => {
    if (!accents) {
      // Keep localAccents in sync if user changes "subdivisions"
      setLocalAccents((prev) => {
        if (prev.length === subdivisions) return prev;
        return Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      });
    }
  }, [subdivisions, accents]);

  const localToggleAccent = useCallback(
    (index) => {
      // Skip toggles for analog mode only
      if (analogMode) return;
      setLocalAccents((prev) => {
        const newArr = [...prev];
        newArr[index] = (newArr[index] + 1) % 4; // cycle 0→1→2→3→0
        return newArr;
      });
    },
    [analogMode]
  );
  const effectiveToggleAccent = toggleAccent || localToggleAccent;

  // --------------------------
  //  PULSE ANIMATION STATES
  // --------------------------
  /**
   * We'll track a boolean for each beat, set it to true for ~200ms
   * whenever the logic schedules that beat (subIndex).
   */
  const [pulseStates, setPulseStates] = useState(
    () => new Array(subdivisions).fill(false)
  );

  // Whenever a beat is scheduled, we do a short "true" -> revert "false"
  const handleSubTriggered = useCallback(
    (subIndex) => {
      setPulseStates((prev) => {
        const arr = [...prev];
        arr[subIndex] = true;
        return arr;
      });
      setTimeout(() => {
        setPulseStates((prev) => {
          const arr = [...prev];
          arr[subIndex] = false;
          return arr;
        });
      }, 200); // Adjust for the length of your CSS animation
    },
    [subdivisions]
  );

  // --------------------------
  //  Metronome Logic
  // --------------------------
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

    // The new callback to fire for each subIndex scheduled:
    onAnySubTrigger: handleSubTriggered 
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: () => handlePlayPause(),
    onTapTempo: logic.tapTempo
  });

  // If parent wants to store a handle to the toggle function
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay]);

  // --------------------------
  //  Play/Pause
  // --------------------------
  const handlePlayPause = useCallback(() => {
    if (isPaused) {
      // Resume
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
      // Pause
      setIsPaused(true);
      logic.stopScheduler();
    }
  }, [isPaused, logic, setIsPaused]);

  const handleAccelerate = useCallback(() => {
    if (!isPaused) {
      manualTempoAcceleration({
        tempoIncreasePercent,
        tempoRef: { current: tempo },
        setTempo
      });
    }
  }, [isPaused, tempo, tempoIncreasePercent, setTempo]);

  // --------------------------
  //  Layout & circle geometry
  // --------------------------
  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    const handleResize = () => setContainerSize(getContainerSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const radius = containerSize / 2;

  // Generate an array of (i, xPos, yPos)
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

  // Optionally connect lines for multi-sub
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
            boxShadow: '0 0 3px rgba(0,160,160,0.6)',
            transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
          }}
        />
      );
    });
  }

  // For mobile, show tap tempo
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --------------------------
  //  Render
  // --------------------------
  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
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
            tempo={tempo}
            audioCtxCurrentTime={() => logic.audioCtx?.currentTime || 0}
            currentSubIndex={logic.currentSubdivision}
          />
        ) : (
          <>
            {lineConnections}

            {beatData.map((bd) => {
              // Get the current state from effectiveAccents (applies to all beats)
              const state = effectiveAccents[bd.i];
              
              // "isActive" for real-time highlight if it's the current sub
              const isActive = (bd.i === logic.currentSubdivision && !isPaused);

              // "isPulsing" if the logic triggered it in the last 200ms
              const isPulsing = pulseStates[bd.i];

              // For muted beats (state 0), render a placeholder that can be clicked
              if (state === 0) {
                return (
                  <div
                    key={bd.i}
                    onClick={() => effectiveToggleAccent(bd.i)}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${bd.xPos}px - 12px)`,
                      top: `calc(50% + ${bd.yPos}px - 12px)`,
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '2px dashed #ccc',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: '#ccc',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
                    }}
                  >
                    +
                  </div>
                );
              }

              // Choose icon based on state
              let icon;
              switch (state) {
                case 1:
                  icon = isActive ? normalBeatActive : normalBeat;
                  break;
                case 2:
                  icon = isActive ? accentedBeatActive : accentedBeat;
                  break;
                case 3:
                  icon = isActive ? firstBeatActive : firstBeat;
                  break;
                default:
                  icon = isActive ? normalBeatActive : normalBeat;
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
                    filter: isActive
                      ? 'drop-shadow(0 0 5px rgba(248, 211, 141, 0.8))'
                      : 'none',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    animation: isPulsing ? 'pulse-beat 0.2s ease-out' : 'none'
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
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '10px'
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

      {/* Accelerate button for Training Mode */}
      <AccelerateButton 
        onClick={handleAccelerate} 
        speedMode={speedMode}
      />

      {/* Tap tempo if mobile */}
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

      {/* Legend - explain what the beat states mean */}
      {!analogMode && (
        <div style={{ 
          marginTop: '15px', 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px',
          flexWrap: 'wrap',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: '#e8e8e8', 
              borderRadius: '50%',
              marginRight: '5px',
              border: '1px solid #ddd'
            }}></div>
            Mute
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: '#fce9c6', 
              borderRadius: '50%',
              marginRight: '5px',
              border: '1px solid #ddd'
            }}></div>
            Normal Beat
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: '#f6cc7c', 
              borderRadius: '50%',
              marginRight: '5px',
              border: '1px solid #ddd'
            }}></div>
            Accent
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: '#00a0a0', 
              borderRadius: '50%',
              marginRight: '5px',
              border: '1px solid #ddd'
            }}></div>
            First Beat
          </div>
        </div>
      )}
    </div>
  );
}

/** 
 * Helper for sizing the container based on the viewport.
 */
function getContainerSize() {
  const w = window.innerWidth;
  if (w < 600) return Math.min(w - 40, 300);
  if (w < 1024) return Math.min(w - 40, 400);
  return 300;
}

export default withTrainingContainer(AdvancedMetronomeWithCircle);
