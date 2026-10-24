import React, { useState, useEffect, useCallback, useRef } from 'react';
import useMetronomeLogic from '../../../hooks/useMetronomeLogic';
import TransportButton from '../Controls/TransportButton';
import withTrainingContainer from '../../Training/withTrainingContainer';
import { useVizCardSize } from '../../../utils/layoutSize';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import AccelerateButton from '../Controls/AccelerateButton';
import { manualTempoAcceleration } from '../../../hooks/useMetronomeLogic/trainingLogic';

// Room around the grid and height of the beat-number row, in CSS pixels.
const GRID_MARGIN = 16;
const GRID_NUMBER_HEIGHT = 28;
const MAX_CELL = 64;

const GridModeMetronome = (props) => {
  // Re-render on resize/rotation so the cell size follows the window.
  useWindowDimensions();
  // Initialize grid configuration based on current subdivisions
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: props.subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );
  
  // Animation state
  const [animationFrame, setAnimationFrame] = useState(null);
  const animationRef = useRef(null);

  // Update grid configuration when subdivisions or accents change
  useEffect(() => {
    if (props.accents && props.accents.length === props.subdivisions) {
      setGridConfig(props.accents);
    } else {
      setGridConfig(Array.from({ length: props.subdivisions }, (_, i) => (i === 0 ? 3 : 1)));
    }
  }, [props.subdivisions, props.accents]);

  // Instantiate metronome logic (must be defined before its usage in effects)
  const logic = useMetronomeLogic({
    tempo: props.tempo,
    setTempo: props.setTempo,
    subdivisions: props.subdivisions,
    isPaused: props.isPaused,
    setIsPaused: props.setIsPaused,
    swing: props.swing,
    volume: props.volume,
    beatConfig: gridConfig,
    setSubdivisions: props.setSubdivisions,
    analogMode: props.analogMode,
    gridMode: true,
    accents: props.accents,
    macroMode: props.macroMode,
    speedMode: props.speedMode,
    measuresUntilMute: props.measuresUntilMute,
    muteDurationMeasures: props.muteDurationMeasures,
    muteProbability: props.muteProbability,
    tempoIncreasePercent: props.tempoIncreasePercent,
    measuresUntilSpeedUp: props.measuresUntilSpeedUp,
    beatMultiplier: props.beatMultiplier
  });

  // Extract necessary props to avoid dependency on the entire props object
  const { 
    isPaused, 
    setIsPaused 
  } = props;

  // Preload sounds when component mounts to avoid loading delay
  useEffect(() => {
    if (logic && logic.reloadSounds) {
      logic.reloadSounds().catch(err => {
        console.error("Error preloading sounds:", err);
      });
    }
  }, [logic]);

  // Function to handle play/pause functionality
  const handlePlayPause = useCallback(async () => {
    console.log("[GridMode] Play/pause toggle requested");
    if (isPaused) {
      try {
        // Ensure we have a valid audio context and sounds
        console.log("[GridMode] Initializing audio system");
        
        // First, try to reload the sound system
        if (logic && logic.reloadSounds) {
          try {
            console.log("[GridMode] Reloading sounds");
            await logic.reloadSounds();
          } catch (soundErr) {
            console.error("[GridMode] Error reloading sounds:", soundErr);
            // Continue anyway, we'll try other approaches
          }
        }
        
        // If we still don't have an audio context, something is wrong
        if (!logic.audioCtx) {
          console.error("[GridMode] No audio context after reload attempt");
          alert("Unable to start audio system. Please try clicking the play button again or refresh the page.");
          return;
        }
        
        // Try to resume the audio context if it's suspended
        if (logic.audioCtx.state === 'suspended') {
          console.log("[GridMode] Attempting to resume suspended audio context");
          try {
            await logic.audioCtx.resume();
            console.log("[GridMode] Successfully resumed audio context");
          } catch (resumeErr) {
            console.error("[GridMode] Error resuming audio context:", resumeErr);
            // Continue anyway - we might still be able to start
          }
        }
        
        // Final check before starting
        if (logic.audioCtx.state !== 'running') {
          console.warn(`[GridMode] Audio context still not running, state: ${logic.audioCtx.state}`);
          // We'll try to play anyway - auto unlock might work
        }
        
        // Update UI state and start metronome
        // We'll attempt to play even if audio isn't perfect - mobile browsers might unlock on play
        setIsPaused(false);
        
        // Try to play a silent sound to help unlock audio on iOS
        try {
          console.log("[GridMode] Playing silent sound to help unlock audio");
          const silentBuffer = logic.audioCtx.createBuffer(1, 1, 22050);
          const source = logic.audioCtx.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(logic.audioCtx.destination);
          source.start(0);
        } catch (unlockErr) {
          console.warn("[GridMode] Failed to play silent sound:", unlockErr);
        }
        
        // Start playing
        console.log("[GridMode] Starting metronome with audio context state:", logic.audioCtx.state);
        logic.startScheduler();
        
        // Wait a moment and check if audio is working
        setTimeout(() => {
          if (logic.audioCtx && logic.audioCtx.state !== 'running') {
            console.warn("[GridMode] Audio context still not running after attempted start");
            // We won't show an alert here - it might still work or the user might see the UI state
          }
        }, 100);
      } catch (err) {
        console.error("[GridMode] Error starting metronome:", err);
        // Even if we encounter an error, try to start anyway as a last resort
        setIsPaused(false);
        try {
          logic.startScheduler();
        } catch (startErr) {
          console.error("[GridMode] Failed to start after error:", startErr);
          setIsPaused(true);
        }
      }
    } else {
      // Stop playing
      console.log("[GridMode] Stopping metronome");
      setIsPaused(true);
      logic.stopScheduler();
    }
  }, [logic, isPaused, setIsPaused]);

  // Extract additional needed props
  const { registerTogglePlay, registerTapTempo } = props;
  
  // Register the toggle play and tap tempo handlers
  useEffect(() => {
    if (registerTogglePlay) {
      console.log("[GridMode] Registering toggle play handler");
      registerTogglePlay(handlePlayPause);
    }
    
    if (registerTapTempo) {
      // Directly register the tapTempo handler from the metronome logic
      if (logic && typeof logic.tapTempo === 'function') {
        console.log("[GridMode] Registering tap tempo handler");
        registerTapTempo(logic.tapTempo);
      } else {
        console.warn("[GridMode] tapTempo function is not available");
        registerTapTempo(null);
      }
    }
    
    // Listen for global play/pause events (from keyboard shortcuts)
    const handleGlobalPlayPause = () => {
      console.log("[GridMode] Received global play/pause event");
      handlePlayPause().catch(err => {
        console.error("[GridMode] Error in global play/pause handler:", err);
      });
    };
    
    window.addEventListener('metronome-toggle-play', handleGlobalPlayPause);
    
    // Make play/pause function globally available as backup
    if (!window.handleGlobalPlayPauseGridMode) {
      console.log("[GridMode] Setting global play/pause handler");
      window.handleGlobalPlayPauseGridMode = handleGlobalPlayPause;
    }
    
    return () => {
      // Clean up
      if (registerTogglePlay) {
        registerTogglePlay(null);
      }
      if (registerTapTempo) {
        registerTapTempo(null);
      }
      window.removeEventListener('metronome-toggle-play', handleGlobalPlayPause);
      if (window.handleGlobalPlayPauseGridMode === handleGlobalPlayPause) {
        window.handleGlobalPlayPauseGridMode = null;
      }
    };
  }, [registerTogglePlay, registerTapTempo, handlePlayPause, logic]);

  // Effect to reload sounds when triggered
  useEffect(() => {
    if (!logic || !logic.audioCtx || !props.soundSetReloadTrigger) return;
    if (logic.reloadSounds) {
      logic.reloadSounds()
        .then(success => {
          console.log("Sounds reloaded successfully");
        })
        .catch(err => {
          console.error("Error reloading sounds:", err);
        });
    }
  }, [props.soundSetReloadTrigger, logic]);

  // Destructure specific props needed for the handler to avoid the whole props object as dependency
  const { updateAccents } = props;

  // Handler for changing column configuration
  const handleColumnClick = useCallback((colIndex) => {
    setGridConfig((prev) => {
      const newConfig = [...prev];
      // Cycle through patterns: 0 → 1 → 2 → 3 → 0
      newConfig[colIndex] = (newConfig[colIndex] + 1) % 4;
      if (updateAccents) updateAccents(newConfig);
      return newConfig;
    });
  }, [updateAccents]);

  // State to track if the first beat is playing
  const [isFirstBeatPlaying, setIsFirstBeatPlaying] = useState(false);

  // Animate the current beat
  const animateCurrentBeat = useCallback(() => {
    if (props.isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setAnimationFrame(null);
      setIsFirstBeatPlaying(false);
      return;
    }
    const currentBeat = logic.currentSubdivision;
    setAnimationFrame(currentBeat);
    setIsFirstBeatPlaying(currentBeat === 0);
    animationRef.current = requestAnimationFrame(animateCurrentBeat);
  }, [logic.currentSubdivision, props.isPaused]);

  // Start/stop animation based on pause status
  useEffect(() => {
    if (!props.isPaused) {
      animateCurrentBeat();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      setAnimationFrame(null);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [props.isPaused, animateCurrentBeat]);

  // The grid fills its visualisation area: a cell is as wide as the area allows
  // and three rows plus the beat number must fit its height.
  const [vizRef, vizSize] = useVizCardSize();
  const vizReady = vizSize.width > 0 && vizSize.height > 0;
  const fromWidth = Math.floor((vizSize.width - 2 * GRID_MARGIN) / props.subdivisions);
  const fromHeight = Math.floor((vizSize.height - 2 * GRID_MARGIN - GRID_NUMBER_HEIGHT) / 3);
  const squareSize = vizReady ? Math.max(24, Math.min(MAX_CELL, fromWidth, fromHeight)) : 0;

  // Responsive behavior for mobile devices and tablets (modified threshold)
  // Handler for manual tempo acceleration
  const handleAccelerate = useCallback(() => {
    if (!props.isPaused) {
      manualTempoAcceleration({
        tempoIncreasePercent: props.tempoIncreasePercent,
        tempoRef: { current: props.tempo },
        setTempo: props.setTempo
      });
    }
  }, [props.isPaused, props.tempo, props.tempoIncreasePercent, props.setTempo]);

  // A column is three stacked cells; the level fills them from the bottom.
  // Level 1 normal, 2 accent (middle cell gets a teal contour), 3 first beat.
  const renderGridSquares = () => {
    return Array.from({ length: props.subdivisions }, (_, colIndex) => {
      const isCurrentBeat = colIndex === animationFrame && !props.isPaused;
      const columnLevel = gridConfig[colIndex];
      const activeRows = columnLevel === 0 ? [] :
                          columnLevel === 1 ? [2] :
                          columnLevel === 2 ? [1, 2] :
                          [0, 1, 2];
      const levelLabel = columnLevel === 3 ? 'first beat' : columnLevel === 2 ? 'accent' : 'normal';

      return (
        <button
          type="button"
          key={colIndex}
          onClick={() => handleColumnClick(colIndex)}
          className={`grid-beat-control${colIndex === 0 ? ' is-first' : ''}${isCurrentBeat ? ' is-current' : ''}`}
          aria-label={columnLevel === 0
            ? `Beat ${colIndex + 1}: muted. Activate to change accent.`
            : `Beat ${colIndex + 1}: ${levelLabel}. Activate to change accent.`}
          aria-pressed={columnLevel > 1}
          style={{ width: `${squareSize}px` }}
        >
          {[0, 1, 2].map((rowIndex) => {
            const isActive = activeRows.includes(rowIndex);
            let squareType = '';
            if (isActive) {
              if (rowIndex === 0 && columnLevel === 3) squareType = 'first-beat';
              else if (rowIndex === 1 && columnLevel >= 2) squareType = 'accent';
              else squareType = 'normal';
            }
            const classNames = [
              'grid-cell',
              isActive ? 'is-on' : '',
              squareType ? `grid-square-${squareType}` : ''
            ].filter(Boolean).join(' ');
            return (
              <span
                key={rowIndex}
                className={classNames}
                aria-hidden="true"
                style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
              />
            );
          })}
          <span className="grid-number" aria-hidden="true">{colIndex + 1}</span>
        </button>
      );
    });
  };

  return (
    <div
      className={`grid-visual ${!props.isPaused ? 'metronome-active' : ''} ${isFirstBeatPlaying ? 'first-beat-playing' : ''}`}
    >
      <div className="viz-card" ref={vizRef}>
        <div className="grid-columns">
          {vizReady && renderGridSquares()}
        </div>
      </div>

      <AccelerateButton 
        onClick={handleAccelerate} 
        speedMode={props.speedMode}
      />
      
      <div className="transport-row">
        <TransportButton
          kind="play"
          label={props.isPaused ? 'Start' : 'Pause'}
          onClick={handlePlayPause}
          pressed={!props.isPaused}
          className="play-button play-pause-button"
        />
        <TransportButton
          kind="tap"
          label="Tap Tempo"
          feedbackVolume={props.volume}
          className="tap-button"
          onClick={() => {
            console.log("[GRID MODE] Tap tempo button clicked");
            if (logic && typeof logic.tapTempo === 'function') {
              logic.tapTempo();
            } else {
              console.warn("[GRID MODE] tapTempo function is not available");
            }
          }}
        />
      </div>
    </div>
  );
};

export default withTrainingContainer(GridModeMetronome);
