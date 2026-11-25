import React, { useState, useEffect, useCallback, useRef } from 'react';
import useMetronomeLogic from '../../../hooks/useMetronomeLogic';
import TransportButton from '../Controls/TransportButton';
import withTrainingContainer from '../../Training/withTrainingContainer';
import { useVizCardSize } from '../../../utils/layoutSize';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import AccelerateButton from '../Controls/AccelerateButton';
import { manualTempoAcceleration } from '../../../hooks/useMetronomeLogic/trainingLogic';
import gridLayout from '../Score/gridLayout';


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

  // The click sounds are preloaded when the app opens (preloadClickSounds)

  // Function to handle play/pause functionality
  const handlePlayPause = useCallback(async () => {
    console.log("[GridMode] Play/pause toggle requested");
    if (isPaused) {
      // Wake the audio while the tap is still a user gesture. The grid lights
      // up with the first beat, not before.
      const preparing = logic.prepareStart().catch((err) => {
        console.error("[GridMode] Error preparing audio:", err);
        return false;
      });
      setIsPaused(false);
      await preparing;
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

  // The grid fills its visualisation area; the columns wrap onto a second
  // block when they would be narrower than a finger.
  const [vizRef, vizSize] = useVizCardSize();
  const vizReady = vizSize.width > 0 && vizSize.height > 0;
  const minHit = typeof window !== 'undefined' && window.innerHeight < 760 ? 40 : 44;
  const layout = vizReady
    ? gridLayout({ width: vizSize.width, height: vizSize.height, beats: props.subdivisions, minHit })
    : null;

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
  // Level 1 normal (one cell), 2 accent (two), 3 first beat (three), 0 muted
  // (none). The level is the state; the grid carries no other mark.
  const renderColumn = (colIndex) => {
    const { cellW, cellH } = layout;
    const isCurrentBeat = colIndex === animationFrame && !props.isPaused;
    const columnLevel = gridConfig[colIndex] == null ? 1 : gridConfig[colIndex];
    const levelLabel = columnLevel === 3 ? 'first beat' : columnLevel === 2 ? 'accent' : 'normal';
    const filled = columnLevel === 0 ? 0 : columnLevel === 1 ? 1 : columnLevel === 2 ? 2 : 3;

    return (
      <button
        type="button"
        key={colIndex}
        onClick={() => handleColumnClick(colIndex)}
        className={`grid-beat-control${colIndex === 0 ? ' is-first' : ''}${isCurrentBeat ? ' is-current' : ''}${columnLevel === 0 ? ' is-muted' : ''}`}
        aria-label={columnLevel === 0
          ? `Beat ${colIndex + 1}: muted. Activate to change accent.`
          : `Beat ${colIndex + 1}: ${levelLabel}. Activate to change accent.`}
        aria-pressed={columnLevel > 1}
        style={{ width: `${cellW}px` }}
      >
        {[0, 1, 2].map((rowIndex) => {
          // rowIndex 2 is the bottom cell; the fill grows upwards.
          const isOn = rowIndex >= 3 - filled;
          return (
            <span
              key={rowIndex}
              className={`grid-cell${isOn ? ' is-on' : ''}`}
              aria-hidden="true"
              style={{ width: `${cellW}px`, height: `${cellH}px`, '--cell-min': `${Math.min(cellW, cellH)}px` }}
            />
          );
        })}
        <span className="grid-number" aria-hidden="true">{colIndex + 1}</span>
      </button>
    );
  };

  return (
    <div
      className={`grid-visual ${!props.isPaused ? 'metronome-active' : ''} ${isFirstBeatPlaying ? 'first-beat-playing' : ''}`}
    >
      <div className="viz-card" ref={vizRef}>
        <div className="grid-blocks">
          {layout && layout.blocks.map((block) => (
            <div key={block.from} className="grid-columns">
              {Array.from({ length: block.count }, (_, j) => renderColumn(block.from + j))}
            </div>
          ))}
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
