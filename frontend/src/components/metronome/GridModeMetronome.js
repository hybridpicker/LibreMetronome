import React, { useState, useEffect, useCallback, useRef } from 'react';
import useMetronomeLogic from '../../hooks/useMetronomeLogic';
import playIcon from '../../assets/svg/play.svg';
import pauseIcon from '../../assets/svg/pause.svg';
import tapButtonIcon from '../../assets/svg/tap-button.svg';

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

  // UPDATED: Reduced square size and adjusted spacing
  const squareSize = 50; // Reduced from 60 to 50
  const gapSize = 6; // Reduced from 8 to 6
  const gridWidth = props.subdivisions * (squareSize + gapSize) - gapSize;
  
  // Lighter Gold Color Palette based on #f8d38d
  const colors = {
    inactive: "#e8e8e8", // Very light gray for inactive squares
    level1: "#fae3ad",   // Lighter version of base gold color
    level2: "#f8d38d",   // Base gold color (as specified)
    level3: "#f5c26d",   // Slightly darker, but still bright
    highlight: "#fff5e0"  // Very light highlight color
  };
  
  // First column (first beat) gets a warmer gold
  const firstBeatColors = {
    inactive: "#e8e8e8",
    level1: "#fcd592",   // Warmer but light
    level2: "#f8c978",   // Warmer medium
    level3: "#f5bc5e",   // Warmer but still bright
    highlight: "#fff5e0"  // Same highlight
  };
  
  // Render grid as an SVG with enhanced styling
  const gridSquares = Array.from({ length: props.subdivisions }, (_, colIndex) => {
    const isCurrentBeat = colIndex === animationFrame && !props.isPaused;
    const isFirstBeat = colIndex === 0;
    const columnLevel = gridConfig[colIndex];
    const colorSet = isFirstBeat ? firstBeatColors : colors;
    
    // Determine which rows are active based on the column level (0-3)
    // 0 = no rows, 1 = bottom row, 2 = bottom two rows, 3 = all three rows
    const activeRows = columnLevel === 0 ? [] : 
                      columnLevel === 1 ? [2] : 
                      columnLevel === 2 ? [1, 2] : 
                      [0, 1, 2];
    
    return (
      <g
        key={colIndex}
        onClick={() => handleColumnClick(colIndex)}
        style={{
          cursor: colIndex === 0 ? 'default' : 'pointer',
          transform: `translateX(${colIndex * (squareSize + gapSize)}px)`,
          transition: 'transform 0.2s ease-out'
        }}
      >
        {Array.from({ length: 3 }, (_, rowIndex) => {
          const isActive = activeRows.includes(rowIndex);
          const isHighlighted = isCurrentBeat && isActive;
          
          // Calculate position from top to bottom (first row is at the top)
          const yPosition = rowIndex * (squareSize + 2); // Added 2px vertical spacing
          
          // Select appropriate color based on state
          let fillColor = isActive ? 
            (columnLevel === 3 ? colorSet.level3 : 
             columnLevel === 2 && rowIndex > 0 ? colorSet.level2 : 
             colorSet.level1) : 
            colors.inactive;
          
          // Override with highlight color if currently playing
          if (isHighlighted) {
            fillColor = colorSet.highlight;
          }
          
          return (
            <rect
              key={rowIndex}
              x={0}
              y={yPosition}
              width={squareSize}
              height={squareSize}
              rx={6} // Rounded corners
              ry={6}
              fill={fillColor}
              stroke={isHighlighted ? "#f8c978" : "transparent"}
              strokeWidth={isHighlighted ? 2 : 0}
              style={{
                opacity: isActive ? 1 : 0.3,
                transition: 'all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
                transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: 'center center',
                boxShadow: isHighlighted ? '0 0 10px rgba(248, 211, 141, 0.8)' : 'none',
                filter: isHighlighted ? 'brightness(1.1)' : 'none'
              }}
            />
          );
        })}
        
        {/* Add column number label at the bottom */}
        <text
          x={squareSize / 2}
          y={3 * (squareSize + 2) + 16} // Adjusted for new spacing
          textAnchor="middle"
          fill={colIndex === 0 ? "#f5bc5e" : "#666"}
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "12px", // Reduced font size
            fontWeight: colIndex === 0 ? "bold" : "normal"
          }}
        >
          {colIndex + 1}
        </text>
      </g>
    );
  });

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
        }).catch((err) => console.error(err));
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

  // Calculate the container width based on screen size and grid dimensions
  const containerWidth = Math.min(gridWidth, window.innerWidth - 40);
  const scale = containerWidth / gridWidth;

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div 
        style={{ 
          margin: '0 auto', 
          width: `${containerWidth}px`, 
          overflow: 'hidden'
        }}
      >
        <div style={{ 
          transformOrigin: 'top left',
          transform: scale < 1 ? `scale(${scale})` : 'none',
          width: gridWidth,
          height: (squareSize * 3) + (2 * 2) + 30, // Adjusted for new spacing
          margin: scale < 1 ? 'none' : '0 auto'
        }}>
          <svg
            width={gridWidth}
            height={(squareSize * 3) + (2 * 2) + 30} // Adjusted for new spacing
            style={{ display: 'block' }}
          >
            {gridSquares}
          </svg>
        </div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handlePlayPause}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer',
            padding: '10px',
            transition: 'all 0.2s ease',
            outline: 'none' // Remove outline/border
          }}
          className="play-button"
          aria-label="Toggle play/pause"
          onMouseOver={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) img.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) img.style.transform = 'scale(1)';
          }}
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
            outline: 'none' // Remove outline/border
          }}
          aria-label="Tap Tempo"
          onMouseOver={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1.1)';
              img.style.filter = 'drop-shadow(0 0 5px rgba(248, 211, 141, 0.5))';
            }
          }}
          onMouseOut={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1)';
              img.style.filter = 'none';
            }
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

export default GridModeMetronome;