import React, { useState, useEffect, useCallback } from 'react';
import useMetronomeLogic from '../../hooks/useMetronomeLogic';
import playIcon from '../../assets/svg/play.svg';
import pauseIcon from '../../assets/svg/pause.svg';
import tapButtonIcon from '../../assets/svg/tap-button.svg';
// Ensure you have created src/assets/svg/subdivisionIcons.js as described
import { subdivisionIcons } from '../../assets/svg/subdivisionIcons';

const GridModeMetronome = (props) => {
  // Initialize gridConfig based on the current subdivisions (1 to 9)
  const [gridConfig, setGridConfig] = useState(
    Array.from({ length: props.subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );

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

  // Render grid as an SVG where each column represents a subdivision.
  const squareSize = 50;
  const gridSquares = Array.from({ length: props.subdivisions }, (_, colIndex) => (
    <g key={colIndex} onClick={() => handleColumnClick(colIndex)} style={{ cursor: 'pointer' }}>
      {Array.from({ length: 3 }, (_, rowIndex) => {
        const isActive = rowIndex >= (3 - gridConfig[colIndex]);
        return (
          <image
            key={rowIndex}
            href={isActive ? subdivisionIcons.squareActive : subdivisionIcons.squareInactive}
            x={colIndex * squareSize}
            y={rowIndex * squareSize}
            width={squareSize}
            height={squareSize}
          />
        );
      })}
    </g>
  ));

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
        <button onClick={handlePlayPause} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="Toggle play/pause">
          <img src={props.isPaused ? playIcon : pauseIcon} alt={props.isPaused ? 'Play' : 'Pause'} style={{ width: '36px', height: '36px' }} />
        </button>
      </div>
      {isMobile && (
        <button onClick={logic.tapTempo} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '20px' }} aria-label="Tap Tempo">
          <img src={tapButtonIcon} alt="Tap Tempo" style={{ height: '35px', objectFit: 'contain' }} />
        </button>
      )}
    </div>
  );
};

export default GridModeMetronome;
