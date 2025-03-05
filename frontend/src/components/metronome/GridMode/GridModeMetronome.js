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

  // Modified column click handler to cycle through patterns:
  // First row → First two rows → All three rows → No rows
  const handleColumnClick = useCallback((colIndex) => {
    if (colIndex === 0) return; // First column is fixed
    
    setGridConfig((prev) => {
      const newConfig = [...prev];
      // Cycle through the patterns: 1 → 2 → 3 → 0
      newConfig[colIndex] = (newConfig[colIndex] + 1) % 4;
      
      if (props.updateAccents) props.updateAccents(newConfig);
      return newConfig;
    });
  }, [props.updateAccents]);

  // Animation function for the current beat
  const animateCurrentBeat = useCallback(() => {
    if (props.isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setAnimationFrame(null);
      return;
    }

    setAnimationFrame(logic.currentSubdivision);
    
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
  
  // Calculate total grid width including ample padding to prevent cutoff
  const gridWidth = props.subdivisions * (squareSize + gapSize);
  
  // Gold color palette
  const colors = {
    inactive: "#e8e8e8", // Very light gray for inactive squares
    level1: "#fae3ad",   // Lighter version of base gold color
    level2: "#f8d38d",   // Base gold color (as specified)
    level3: "#f5c26d",   // Slightly darker, but still bright
    highlight: "#f9d69a"  // Softer highlight color
  };
  
  // First column (first beat) gets a warmer gold
  const firstBeatColors = {
    inactive: "#e8e8e8",
    level1: "#fcd592",   // Warmer but light
    level2: "#f8c978",   // Warmer medium
    level3: "#f5bc5e",   // Warmer but still bright
    highlight: "#f7ca80"  // Softer highlight color
  };
  
  // Responsive behavior for mobile devices
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePlayPause = () => {
    if (props.isPaused) {
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          props.setIsPaused(false);
          logic.startScheduler();
        }).catch((err) => {});
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

  // Render grid as an SVG with enhanced styling
  const renderGridSquares = () => {
    return Array.from({ length: props.subdivisions }, (_, colIndex) => {
      const isCurrentBeat = colIndex === animationFrame && !props.isPaused;
      const isFirstBeat = colIndex === 0;
      const columnLevel = gridConfig[colIndex];
      const colorSet = isFirstBeat ? firstBeatColors : colors;
      
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
            cursor: colIndex === 0 ? 'default' : 'pointer',
            width: `${squareSize}px`,
            textAlign: 'center'
          }}
        >
          {Array.from({ length: 3 }, (_, rowIndex) => {
            const isActive = activeRows.includes(rowIndex);
            const isHighlighted = isCurrentBeat && isActive;
            
            // Select appropriate color based on state
            let fillColor = isActive ? 
              (rowIndex === 0 && columnLevel === 3 ? colorSet.level3 : 
               rowIndex === 1 && columnLevel >= 2 ? colorSet.level2 : 
               colorSet.level1) : 
              colors.inactive;
            
            // Override with highlight color if currently playing
            if (isHighlighted) {
              fillColor = colorSet.highlight;
            }
            
            return (
              <div
                key={rowIndex}
                style={{
                  width: `${squareSize}px`,
                  height: `${squareSize}px`,
                  borderRadius: '6px',
                  backgroundColor: fillColor,
                  marginBottom: '4px',
                  opacity: isActive ? 1 : 0.3,
                  transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
                  transform: isHighlighted ? 'scale(1.03)' : 'scale(1)',
                  boxShadow: isHighlighted ? '0 0 4px rgba(248, 211, 141, 0.4)' : 'none',
                  filter: isHighlighted ? 'brightness(1.05)' : 'none'
                }}
              />
            );
          })}
          <div style={{ 
            fontSize: '12px', 
            marginTop: '8px', 
            color: colIndex === 0 ? "#f5bc5e" : "#666",
            fontWeight: colIndex === 0 ? "bold" : "normal"
          }}>
            {colIndex + 1}
          </div>
        </div>
      );
    });
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      {/* COMPLETELY REDESIGNED CONTAINER: Using native divs instead of SVG */}
      <div style={{ 
        margin: '0 auto',
        padding: '20px',
        maxWidth: '100%',
        overflowX: 'auto', // Allow horizontal scrolling on small screens
        overflowY: 'visible',
        whiteSpace: 'nowrap' // Keep squares in a row
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
              transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)'
            }}
          />
        </button>
      </div>

      {/* Legend - explain what the colors mean */}
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
            backgroundColor: colors.level1, 
            borderRadius: '2px',
            marginRight: '5px',
            border: '1px solid #ddd'
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
            border: '1px solid #ddd'
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
            border: '1px solid #ddd'
          }}></div>
          First Beat
        </div>
      </div>
      
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            marginTop: '20px',
            padding: '10px',
            outline: 'none'
          }}
          aria-label="Tap Tempo"
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