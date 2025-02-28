import React, { useState, useEffect, useCallback, useRef } from 'react';
import useMetronomeLogic from '../../hooks/useMetronomeLogic';
import playIcon from '../../assets/svg/play.svg';
import pauseIcon from '../../assets/svg/pause.svg';
import tapButtonIcon from '../../assets/svg/tap-button.svg';
import squareActive from '../../assets/svg/grid/square_active.svg';
import squareActivePlay from '../../assets/svg/grid/square_active_play.svg.svg';
import squareInactive from '../../assets/svg/grid/square_inactive.svg';

// Create a local object for the icons
const subdivisionIcons = {
  squareActive,
  squareActivePlay,
  squareInactive
};

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

  // When a column is clicked, cycle that column's configuration.
  const handleColumnClick = useCallback((colIndex) => {
    if (colIndex === 0) return;
    setGridConfig((prev) => {
      const newConfig = [...prev];
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

  // Render grid as an SVG where each column represents a subdivision.
  const squareSize = 50;
  const gridSquares = Array.from({ length: props.subdivisions }, (_, colIndex) => {
    const isCurrentBeat = colIndex === animationFrame && !props.isPaused;
    
    return (
      <g
        key={colIndex}
        onClick={() => handleColumnClick(colIndex)}
        style={{
          cursor: 'pointer'
        }}
      >
        {Array.from({ length: 3 }, (_, rowIndex) => {
          const isActive = rowIndex >= (3 - gridConfig[colIndex]);
          const isHighlighted = isCurrentBeat && isActive;
          
          return (
            <image
              key={rowIndex}
              href={isHighlighted ? subdivisionIcons.squareActivePlay : (isActive ? subdivisionIcons.squareActive : subdivisionIcons.squareInactive)}
              x={colIndex * squareSize}
              y={rowIndex * squareSize}
              width={squareSize}
              height={squareSize}
              style={{
                filter: 'none',
                transition: 'filter 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
              }}
            />
          );
        })}
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

  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        width={props.subdivisions * squareSize}
        height={3 * squareSize}
        style={{ margin: '0 auto', display: 'block' }}
      >
        {gridSquares}
      </svg>
      <div style={{ marginTop: '10px' }}>
        <button
          onClick={handlePlayPause}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          aria-label="Toggle play/pause"
          onMouseOver={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1.1)';
              img.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))';
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
            src={props.isPaused ? playIcon : pauseIcon}
            alt={props.isPaused ? 'Play' : 'Pause'}
            style={{
              width: '36px',
              height: '36px',
              transition: 'all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)'
            }}
          />
        </button>
      </div>
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '20px' }}
          aria-label="Tap Tempo"
          onMouseOver={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1.1)';
              img.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))';
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
