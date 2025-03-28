import React, { useState, useEffect, useCallback, useRef } from 'react';
import useMetronomeLogic from '../../../hooks/useMetronomeLogic';
import playIcon from '../../../assets/svg/play.svg';
import pauseIcon from '../../../assets/svg/pause.svg';
import tapButtonIcon from '../../../assets/svg/tap-button.svg';
import './GridAnimation.css';
import withTrainingContainer from '../../Training/withTrainingContainer';
import AccelerateButton from '../Controls/AccelerateButton';
import { manualTempoAcceleration } from '../../../hooks/useMetronomeLogic/trainingLogic';

const GridModeMetronome = (props) => {
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

  // Square size, gap, and color configuration
  const squareSize = 50;
  const gapSize = 8;
  
  const colors = {
    inactive: "#f0f0f0",
    level1: "#fae8c1",
    level2: "#f8d38d",
    level3: "#f5c26d",
    muted: "#f5f5f5",
    teal: "#4db6ac",
    tealDark: "#26a69a"
  };
  
  const firstBeatColors = {
    inactive: "#f0f0f0",
    level1: "#fae3ad",
    level2: "#f8c978",
    level3: "#f5bc5e",
    muted: "#f5f5f5",
    teal: "#4db6ac",
    tealDark: "#26a69a"
  };
  
  // Responsive behavior for mobile devices and tablets (modified threshold)
  // Changed to show tap button only on tablets and mobile (≤ 1024px)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth <= 1024);
  useEffect(() => {
    const handleResize = () => setIsMobileOrTablet(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Render grid squares
  const renderGridSquares = () => {
    return Array.from({ length: props.subdivisions }, (_, colIndex) => {
      const isCurrentBeat = colIndex === animationFrame && !props.isPaused;
      const isFirstBeat = colIndex === 0;
      const columnLevel = gridConfig[colIndex];
      const colorSet = isFirstBeat ? firstBeatColors : colors;
      
      if (columnLevel === 0) {
        return (
          <div 
            key={colIndex}
            onClick={() => handleColumnClick(colIndex)}
            style={{
              display: 'inline-block',
              verticalAlign: 'top',
              marginRight: `${gapSize}px`,
              cursor: 'pointer',
              width: `${squareSize}px`,
              textAlign: 'center'
            }}
          >
            <div style={{ 
              height: `${3 * squareSize + 8}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                border: '1px dashed #ddd',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#ccc',
                fontSize: '14px'
              }}>
                +
              </div>
            </div>
            <div style={{ 
              fontSize: '12px', 
              marginTop: '8px', 
              color: colIndex === 0 ? "#f5bc5e" : "#999",
              fontWeight: colIndex === 0 ? "500" : "normal"
            }}>
              {colIndex + 1}
            </div>
          </div>
        );
      }
      
      const activeRows = columnLevel === 0 ? [] : 
                          columnLevel === 1 ? [2] : 
                          columnLevel === 2 ? [1, 2] : 
                          [0, 1, 2];
      
      return (
        <div 
          key={colIndex}
          onClick={() => handleColumnClick(colIndex)}
          style={{
            display: 'inline-block',
            verticalAlign: 'top',
            marginRight: `${gapSize}px`,
            cursor: 'pointer',
            width: `${squareSize}px`,
            textAlign: 'center'
          }}
        >
          {Array.from({ length: 3 }, (_, rowIndex) => {
            const isActive = activeRows.includes(rowIndex);
            const isHighlighted = isCurrentBeat && isActive;
            
            let squareType = '';
            if (isActive) {
              if (rowIndex === 0 && columnLevel === 3) {
                squareType = 'first-beat';
              } else if (rowIndex === 1 && columnLevel >= 2) {
                squareType = 'accent';
              } else {
                squareType = 'normal';
              }
            }
            
            let fillColor = colors.inactive;
            if (isActive) {
              if (rowIndex === 0 && columnLevel === 3) {
                fillColor = colorSet.level3;
              } else if (rowIndex === 1 && columnLevel >= 2) {
                fillColor = colorSet.level2;
              } else {
                fillColor = colorSet.level1;
              }
            }
            
            const classNames = [
              'grid-square',
              isActive ? 'grid-square-active' : '',
              isHighlighted ? 'grid-square-playing' : '',
              squareType ? `grid-square-${squareType}` : ''
            ].filter(Boolean).join(' ');
            
            return (
              <div
                key={rowIndex}
                className={classNames}
                style={{
                  width: `${squareSize}px`,
                  height: `${squareSize}px`,
                  backgroundColor: fillColor,
                  marginBottom: '4px',
                  opacity: isActive ? 1 : 0.4
                }}
              />
            );
          })}
          <div style={{ 
            fontSize: '12px', 
            marginTop: '8px', 
            color: colIndex === 0 ? "#f5bc5e" : "#999",
            fontWeight: colIndex === 0 ? "500" : "normal"
          }}>
            {colIndex + 1}
          </div>
        </div>
      );
    });
  };

  return (
    <div 
      style={{ textAlign: 'center', padding: '20px 0' }}
      className={`${!props.isPaused ? 'metronome-active' : ''} ${isFirstBeatPlaying ? 'first-beat-playing' : ''}`}
    >
      <div style={{ 
        margin: '0 auto',
        padding: '20px',
        maxWidth: '100%',
        overflowX: 'auto', 
        overflowY: 'visible',
        whiteSpace: 'nowrap'
      }}>
        {renderGridSquares()}
      </div>
      
      <AccelerateButton 
        onClick={handleAccelerate} 
        speedMode={props.speedMode}
      />
      
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handlePlayPause}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer',
            padding: '10px',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          className="play-button"
          aria-label="Toggle play/pause"
        >
          <img
            src={props.isPaused ? playIcon : pauseIcon}
            alt={props.isPaused ? 'Play' : 'Pause'}
            style={{
              width: '40px',
              height: '40px',
              transition: 'transform 0.2s ease-out'
            }}
          />
        </button>
      </div>

      <div style={{ 
        marginTop: '20px', 
        marginBottom: '20px',
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
            backgroundColor: colors.inactive, 
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
            backgroundColor: colors.level1, 
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
            backgroundColor: colors.level2, 
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
            backgroundColor: colors.level3, 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid var(--neutral-border)'
          }}></div>
          First Beat
        </div>

      </div>

      {/* Only show tap tempo button on mobile and tablet devices */}
      {isMobileOrTablet && (
        <button
          onClick={() => {
            console.log("[GRID MODE] Tap tempo button clicked");
            if (logic && typeof logic.tapTempo === 'function') {
              console.log("[GRID MODE] Using metronome logic's tapTempo function");
              logic.tapTempo();
            } else {
              console.warn("[GRID MODE] tapTempo function is not available");
            }
          }}
          aria-label="Tap Tempo"
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            marginTop: '20px',
            padding: '10px',
            outline: 'none',
            display: 'block',
            margin: '10px auto'
          }}
        >
          <img
            src={tapButtonIcon}
            alt="Tap Tempo"
            style={{
              height: '35px',
              objectFit: 'contain',
              transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
            }}
          />
        </button>
      )}
    </div>
  );
};

export default withTrainingContainer(GridModeMetronome);