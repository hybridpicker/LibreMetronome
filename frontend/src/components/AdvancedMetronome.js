// src/components/AdvancedMetronome.js

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

// Import sound set functions and audio buffer loader:
import { getActiveSoundSet } from '../services/soundSetService';
import { loadClickBuffers } from '../hooks/useMetronomeLogic/audioBuffers';

import './AdvancedMetronome.css';

/**
 * AdvancedMetronomeWithCircle:
 * A circle-based metronome component that reloads its audio buffers
 * when the active sound set changes.
 *
 * A new prop "soundSetReloadTrigger" should be passed from the parent.
 * Incrementing it will force this component to fetch the active sound set and reload its buffers.
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

  // Training mode props
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  beatMultiplier = 1,

  // Register toggle function
  registerTogglePlay,

  // New prop: trigger to reload sound set
  soundSetReloadTrigger
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
      setLocalAccents((prev) => {
        if (prev.length === subdivisions) return prev;
        return Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      });
    }
  }, [subdivisions, accents]);

  const localToggleAccent = useCallback(
    (index) => {
      if (analogMode) return;
      setLocalAccents((prev) => {
        const newArr = [...prev];
        newArr[index] = (newArr[index] + 1) % 4; // Cycle: 0→1→2→3→0
        return newArr;
      });
    },
    [analogMode]
  );
  const effectiveToggleAccent = toggleAccent || localToggleAccent;

  // --------------------------
  //  Pulse Animation States
  // --------------------------
  const [pulseStates, setPulseStates] = useState(() =>
    new Array(subdivisions).fill(false)
  );

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
      }, 200);
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
    onAnySubTrigger: handleSubTriggered
  });

  // --------------------------
  //  Keyboard Shortcuts
  // --------------------------
  useKeyboardShortcuts({
    onTogglePlayPause: () => handlePlayPause(),
    onTapTempo: logic.tapTempo
  });

  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay]);

  // --------------------------
  //  Play/Pause Handling
  // --------------------------
  const handlePlayPause = useCallback(() => {
    if (isPaused) {
      // Initialize audio context if needed
      if (!logic.audioCtx) {
        console.log('Advanced Metronome: No AudioContext, initializing...');
        // The startScheduler method will handle initialization
        setIsPaused(false);
        logic.startScheduler();
        return;
      }
      
      // If we have audio but it's suspended, resume it
      if (logic.audioCtx.state === 'suspended') {
        console.log('Advanced Metronome: Resuming suspended AudioContext...');
        logic.audioCtx.resume().then(() => {
          console.log('Advanced Metronome: AudioContext resumed successfully');
          setIsPaused(false);
          logic.startScheduler();
        }).catch(err => {
          console.error('Advanced Metronome: Failed to resume AudioContext:', err);
        });
      } else {
        console.log('Advanced Metronome: Starting playback with active AudioContext');
        setIsPaused(false);
        logic.startScheduler();
      }
    } else {
      console.log('Advanced Metronome: Stopping playback');
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
  //  Layout & Geometry
  // --------------------------
  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    const handleResize = () => setContainerSize(getContainerSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const radius = containerSize / 2;

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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Store audio buffers in global debug helper
  useEffect(() => {
    if (logic && logic.audioCtx && logic.audioBuffers) {
      console.log('!!!!! [Metronome] STORING AUDIO BUFFERS AND CONTEXT IN GLOBAL DEBUG HELPER !!!!!');
      if (window.metronomeDebug) {
        window.metronomeDebug.audioBuffers = logic.audioBuffers;
        window.metronomeDebug.audioContext = logic.audioCtx;
        console.log('!!!!! [Metronome] GLOBAL DEBUG HELPER IS READY FOR TESTING !!!!!');
      } else {
        console.warn('!!!!! [Metronome] GLOBAL DEBUG HELPER NOT FOUND !!!!!');
      }
    }
  }, [logic.audioBuffers, logic.audioCtx]);
  // This effect will run every time soundSetReloadTrigger changes.
  useEffect(() => {
    // This effect will run every time soundSetReloadTrigger changes.
    if (logic && logic.audioCtx && soundSetReloadTrigger > 0) {
      console.log("Reload trigger changed:", soundSetReloadTrigger);

      // Use the reloadSounds function from logic instead of accessing buffer refs directly
      if (logic.reloadSounds) {
        logic.reloadSounds()
          .then(success => {
            if (success) {
              console.log("Audio buffers reloaded successfully with active sound set");
            } else {
              console.warn("Failed to reload audio buffers");
            }
          })
          .catch(err => {
            console.error("Error during sound reload:", err);
          });
      } else {
        console.warn("reloadSounds function not available in logic object");
      }
    }
  }, [soundSetReloadTrigger, logic]); // Only depend on the trigger and logic

  // --------------------------
  //  Sound Preview Event Handlers
  // --------------------------
  useEffect(() => {
    // Make sure we're listening to events
    console.log('!!!!! [Metronome] SETTING UP SOUND PREVIEW EVENT LISTENERS !!!!!');
    
    // Handle preview sound events from Settings
    const handlePreviewSound = (event) => {
      const { type, volume } = event.detail;
      
      console.log(`!!!!! [Metronome] RECEIVED PREVIEW SOUND EVENT: ${type} (volume: ${volume}) !!!!!`);
      
      // Only proceed if we have valid audioContext and buffers
      if (!logic.audioCtx) {
        console.warn('!!!!! [Metronome] NO AUDIO CONTEXT AVAILABLE !!!!!');
        return;
      }
      
      if (!logic.audioBuffers) {
        console.warn('!!!!! [Metronome] NO AUDIO BUFFERS AVAILABLE !!!!!');
        console.log('!!!!! [Metronome] Logic object:', logic);
        return;
      }
      
      // Map the type to the correct buffer
      let bufferKey;
      switch (type) {
        case 'first':
          bufferKey = 'first';
          break;
        case 'accent':
          bufferKey = 'accent';
          break;
        case 'normal':
          bufferKey = 'normal';
          break;
        default:
          console.warn(`!!!!! [Metronome] INVALID SOUND TYPE: ${type} !!!!!`);
          return; // Exit if invalid type
      }
      
      // Play the requested sound type using existing audio system
      if (logic.audioBuffers[bufferKey]) {
        // Resume context if suspended
        if (logic.audioCtx.state === 'suspended') {
          console.log('!!!!! [Metronome] RESUMING SUSPENDED AUDIO CONTEXT !!!!!');
          logic.audioCtx.resume();
        }
        
        console.log(`!!!!! [Metronome] CREATING AUDIO SOURCE FOR ${bufferKey} !!!!!`);
        const source = logic.audioCtx.createBufferSource();
        source.buffer = logic.audioBuffers[bufferKey];
        
        const gainNode = logic.audioCtx.createGain();
        gainNode.gain.value = volume || 1.0;
        
        source.connect(gainNode);
        gainNode.connect(logic.audioCtx.destination);
        
        console.log(`!!!!! [Metronome] PLAYING ${type} SOUND WITH BUFFER:`, logic.audioBuffers[bufferKey]);
        source.start(0);
      } else {
        console.warn(`!!!!! [Metronome] BUFFER NOT FOUND FOR SOUND TYPE: ${bufferKey} !!!!!`);
        console.log('!!!!! [Metronome] Available buffers:', logic.audioBuffers);
      }
    };
    
    // Handle preview pattern events
    const handlePreviewPattern = (event) => {
      const { volume } = event.detail;
      
      console.log(`!!!!! [Metronome] RECEIVED PATTERN PREVIEW EVENT (volume: ${volume}) !!!!!`);
      
      // Only proceed if we have valid audioContext and buffers
      if (!logic.audioCtx) {
        console.warn('!!!!! [Metronome] NO AUDIO CONTEXT AVAILABLE !!!!!');
        return;
      }
      
      if (!logic.audioBuffers) {
        console.warn('!!!!! [Metronome] NO AUDIO BUFFERS AVAILABLE !!!!!');
        console.log('!!!!! [Metronome] Logic object:', logic);
        return;
      }
      
      // Check if we have all required buffers
      if (!logic.audioBuffers.first || !logic.audioBuffers.normal || !logic.audioBuffers.accent) {
        console.warn('!!!!! [Metronome] MISSING BUFFERS FOR PATTERN PREVIEW !!!!!');
        console.log('!!!!! [Metronome] Available buffers:', logic.audioBuffers);
        return;
      }
      
      // Resume context if suspended
      if (logic.audioCtx.state === 'suspended') {
        console.log('!!!!! [Metronome] RESUMING SUSPENDED AUDIO CONTEXT !!!!!');
        logic.audioCtx.resume();
      }
      
      console.log("!!!!! [Metronome] STARTING PATTERN PREVIEW SEQUENCE !!!!!!");
      
      const beatDuration = 60 / 120; // Fixed 120 BPM for preview
      const types = ['first', 'normal', 'normal', 'accent'];
      
      types.forEach((type, index) => {
        setTimeout(() => {
          console.log(`!!!!! [Metronome] PLAYING ${type} SOUND (pattern beat ${index+1}) !!!!!`);
          const source = logic.audioCtx.createBufferSource();
          source.buffer = logic.audioBuffers[type];
          
          const gainNode = logic.audioCtx.createGain();
          gainNode.gain.value = volume || 1.0;
          
          source.connect(gainNode);
          gainNode.connect(logic.audioCtx.destination);
          
          source.start(0);
        }, index * beatDuration * 1000);
      });
    };
    
    // Add event listeners
    window.addEventListener('metronome-preview-sound', handlePreviewSound);
    window.addEventListener('metronome-preview-pattern', handlePreviewPattern);
    
    // Clean up
    return () => {
      console.log('!!!!! [Metronome] REMOVING SOUND PREVIEW EVENT LISTENERS !!!!!');
      window.removeEventListener('metronome-preview-sound', handlePreviewSound);
      window.removeEventListener('metronome-preview-pattern', handlePreviewPattern);
    };
  }, [logic]);

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
              const state = effectiveAccents[bd.i];
              const isActive = (bd.i === logic.currentSubdivision && !isPaused);
              const isPulsing = pulseStates[bd.i];

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

      {/* Play/Pause Button */}
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

      {/* Accelerate Button for Training Mode */}
      <AccelerateButton 
        onClick={handleAccelerate} 
        speedMode={speedMode}
      />

      {/* Tap Tempo for Mobile */}
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

      {/* Legend */}
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
 * Helper for calculating container size based on viewport width.
 */
function getContainerSize() {
  const w = window.innerWidth;
  if (w < 600) return Math.min(w - 40, 300);
  if (w < 1024) return Math.min(w - 40, 400);
  return 300;
}

export default withTrainingContainer(AdvancedMetronomeWithCircle);