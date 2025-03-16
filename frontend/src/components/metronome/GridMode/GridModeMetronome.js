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
  // Initialize gridConfig based on the current subdivisions (1 to 9)
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: props.subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );
  
  // Animation state
  const [animationFrame, setAnimationFrame] = useState(null);
  const animationRef = useRef(null);

  useEffect(() => {
    // If accents are passed in and match subdivisions count, update gridConfig.
    if (props.accents && props.accents.length === props.subdivisions) {
      setGridConfig(props.accents);
    } else {
      // Otherwise, reinitialize gridConfig based on subdivisions.
      setGridConfig(Array.from({ length: props.subdivisions }, (_, i) => (i === 0 ? 3 : 1)));
    }
  }, [props.subdivisions, props.accents]);

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

  // Add a useEffect for reloading sounds
  useEffect(() => {
    if (!logic || !logic.audioCtx || !props.soundSetReloadTrigger) return;
    
    // Use the reloadSounds function if available
    if (logic.reloadSounds) {
      logic.reloadSounds()
        .then(success => {
          // Success handling
        })
        .catch(err => {
          // Error handling
        });
    }
  }, [props.soundSetReloadTrigger, logic]);

  // Modified column click handler to cycle through patterns:
  // 0 → mute, 1 → normal beat, 2 → accent, 3 → first beat
  const handleColumnClick = useCallback((colIndex) => {
    setGridConfig((prev) => {
      const newConfig = [...prev];
      // Cycle through the patterns: 0→1→2→3→0
      newConfig[colIndex] = (newConfig[colIndex] + 1) % 4;
      
      if (props.updateAccents) props.updateAccents(newConfig);
      return newConfig;
    });
  }, [props.updateAccents]);

  // Track if we're on the first beat
  const [isFirstBeatPlaying, setIsFirstBeatPlaying] = useState(false);

  // Minimalist animation function for the current beat
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
    
    // Check if this is the first beat of the measure
    // In a standard metronome, the first beat would be at position 0
    setIsFirstBeatPlaying(currentBeat === 0);
    
    animationRef.current = requestAnimationFrame(animateCurrentBeat);
  }, [logic.currentSubdivision, props.isPaused]);

  // Start/stop animation based on isPaused state
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

  // Square size and spacing configuration
  const squareSize = 50;
  const gapSize = 8;
  
  // Minimalist color palette - reduced contrast
  const colors = {
    inactive: "#f0f0f0",     // Lighter inactive
    level1: "#fae8c1",       // Softer light
    level2: "#f8d38d",       // Base gold
    level3: "#f5c26d",       // First beat
    muted: "#f5f5f5",        // Background for muted
    teal: "#4db6ac",         // Teal for first beat highlighting
    tealDark: "#26a69a"      // Darker teal for active first beat
  };
  
  // First column colors with minimal difference
  const firstBeatColors = {
    inactive: "#f0f0f0",
    level1: "#fae3ad", 
    level2: "#f8c978",
    level3: "#f5bc5e", 
    muted: "#f5f5f5",
    teal: "#4db6ac",
    tealDark: "#26a69a"
  };
  
  // Responsive behavior for mobile devices
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1400);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePlayPause = () => {
    if (props.isPaused) {
      // Initialize audio context if needed
      if (!logic.audioCtx) {
        props.setIsPaused(false);
        return;
      }
      
      // If we have audio but it's suspended, resume it
      if (logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          props.setIsPaused(false);
          logic.startScheduler();
        }).catch((err) => {
          // Error handling
        });
      } else {
        props.setIsPaused(false);
        logic.startScheduler();
      }
    } else {
      props.setIsPaused(true);
      logic.stopScheduler();
    }
  };

  // Register the toggle play function for keyboard shortcuts
  useEffect(() => {
    if (props.registerTogglePlay) {
      props.registerTogglePlay(handlePlayPause);
    }
    
    if (props.registerTapTempo) {
      props.registerTapTempo(logic.tapTempo);
    }
    
    return () => {
      if (props.registerTogglePlay) {
        props.registerTogglePlay(null);
      }
      if (props.registerTapTempo) {
        props.registerTapTempo(null);
      }
    };
  }, [props.registerTogglePlay, props.registerTapTempo, handlePlayPause, logic.tapTempo]);

  // Handle manual tempo acceleration
  const handleAccelerate = useCallback(() => {
    if (!props.isPaused) {
      manualTempoAcceleration({
        tempoIncreasePercent: props.tempoIncreasePercent,
        tempoRef: { current: props.tempo },
        setTempo: props.setTempo
      });
    }
  }, [props.isPaused, props.tempo, props.tempoIncreasePercent, props.setTempo]);

  // Minimalist grid squares renderer
  const renderGridSquares = () => {
    return Array.from({ length: props.subdivisions }, (_, colIndex) => {
      const isCurrentBeat = colIndex === animationFrame && !props.isPaused;
      const isFirstBeat = colIndex === 0;
      const columnLevel = gridConfig[colIndex];
      const colorSet = isFirstBeat ? firstBeatColors : colors;
      
      // Render muted squares with minimal styling
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
      
      // Determine which rows are active based on the column level (0-3)
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
            
            // Determine square type for CSS classes
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
            
            // Select appropriate color based on state
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
            
            // Build className for CSS animations
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
      {/* Grid container with minimalist styling */}
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
      
      {/* Accelerate button for Training Mode */}
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

      {/* Legend with minimalist styling */}
      <div style={{ 
        marginTop: '15px', 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '15px',
        flexWrap: 'wrap',
        fontSize: '12px',
        color: '#888'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            backgroundColor: colors.inactive, 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid #eee'
          }}></div>
          Mute
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            backgroundColor: colors.level1, 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid #eee'
          }}></div>
          Normal Beat
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            backgroundColor: colors.level2, 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid #eee'
          }}></div>
          Accent
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            backgroundColor: colors.level3, 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid #eee'
          }}></div>
          First Beat
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            backgroundColor: colors.teal, 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid #eee'
          }}></div>
          First Beat Sound
        </div>
      </div>
      
      <button
        onClick={() => {
          if (logic && typeof logic.tapTempo === 'function') {
            logic.tapTempo();
          } else {
            // Dispatch global event for tap tempo as fallback
            const now = performance.now();
            window.dispatchEvent(new CustomEvent('metronome-tap-tempo', {
              detail: { timestamp: now }
            }));
          }
        }}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          cursor: 'pointer', 
          marginTop: '20px',
          padding: '10px',
          outline: 'none',
          display: 'inline-block'
        }}
        aria-label="Tap Tempo"
      >
        <img
          src={tapButtonIcon}
          alt="Tap Tempo"
          style={{
            height: '35px',
            objectFit: 'contain',
            transition: 'all 0.15s ease-out'
          }}
        />
      </button>
    </div>
  );
};

export default withTrainingContainer(GridModeMetronome);