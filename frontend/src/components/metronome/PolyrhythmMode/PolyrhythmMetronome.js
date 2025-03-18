// src/components/metronome/PolyrhythmMode/PolyrhythmMetronome.js
import React, { useState, useEffect, useCallback } from 'react';
import usePolyrhythmLogic from './usePolyrhythmLogic';
import playIcon from '../../../assets/svg/play.svg';
import pauseIcon from '../../../assets/svg/pause.svg';
import tapButtonIcon from '../../../assets/svg/tap-button.svg';
import CircleRenderer from './CircleRenderer';
import './PolyrhythmMetronome.css';
import withTrainingContainer from '../../Training/withTrainingContainer';
import AccelerateButton from '../Controls/AccelerateButton';
import { manualTempoAcceleration } from '../../../hooks/useMetronomeLogic/trainingLogic';

const PolyrhythmMetronome = (props) => {
  const {
    tempo,
    setTempo,
    isPaused,
    setIsPaused,
    swing,
    volume,
    registerTogglePlay,
    registerTapTempo,
    macroMode = 0,
    speedMode = 0,
    measuresUntilMute = 2,
    muteDurationMeasures = 1,
    muteProbability = 0.3,
    tempoIncreasePercent = 5,
    measuresUntilSpeedUp = 2,
    soundSetReloadTrigger = 0
  } = props;

  // Polyrhythm settings: Two circles with different beat divisions
  const [innerBeats, setInnerBeats] = useState(4); // Default inner circle: 4 beats
  const [outerBeats, setOuterBeats] = useState(3); // Default outer circle: 3 beats
  const [activeCircle, setActiveCircle] = useState('inner'); // 'inner' or 'outer'
  
  // Beat states for both circles - initialized with proper accent patterns
  const [innerAccents, setInnerAccents] = useState(
    Array.from({ length: innerBeats }, (_, i) => (i === 0 ? 3 : 1))
  );
  const [outerAccents, setOuterAccents] = useState(
    Array.from({ length: outerBeats }, (_, i) => (i === 0 ? 3 : 1))
  );

  // Update accent patterns when beat counts change
  useEffect(() => {
    setInnerAccents(Array.from({ length: innerBeats }, (_, i) => (i === 0 ? 3 : 1)));
  }, [innerBeats]);

  useEffect(() => {
    setOuterAccents(Array.from({ length: outerBeats }, (_, i) => (i === 0 ? 3 : 1)));
  }, [outerBeats]);

  // Container size based on viewport width
  const getContainerSize = () => {
    if (window.innerWidth < 600) return Math.min(window.innerWidth - 40, 300);
    if (window.innerWidth < 1024) return Math.min(window.innerWidth - 40, 400);
    return 300;
  };
  const [containerSize, setContainerSize] = useState(getContainerSize());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Callbacks for beat visualization updates
  const handleInnerBeatTriggered = useCallback((beatIndex) => {
    // Additional actions when inner beat is triggered (if needed)
  }, []);

  const handleOuterBeatTriggered = useCallback((beatIndex) => {
    // Additional actions when outer beat is triggered (if needed)
  }, []);

  // Initialize polyrhythm logic hook
  const polyrhythmLogic = usePolyrhythmLogic({
    tempo,
    innerBeats,
    outerBeats,
    innerAccents,
    outerAccents,
    isPaused,
    volume,
    swing,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    onInnerBeatTriggered: handleInnerBeatTriggered,
    onOuterBeatTriggered: handleOuterBeatTriggered
  });

  // Extract state and functions from polyrhythm logic
  const {
    innerCurrentSubdivision,
    outerCurrentSubdivision,
    isSilencePhaseRef,
    measureCountRef,
    muteMeasureCountRef,
    actualBpm,
    tapTempo,
    reloadSounds,
  } = polyrhythmLogic;

  useEffect(() => {
    const handleResize = () => {
      setContainerSize(getContainerSize());
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reload sounds when soundSetReloadTrigger changes
  useEffect(() => {
    if (soundSetReloadTrigger > 0 && reloadSounds) {
      reloadSounds().catch(console.error);
    }
  }, [soundSetReloadTrigger, reloadSounds]);

  // Handle Play/Pause
  const handlePlayPause = useCallback(() => {
    setIsPaused(!isPaused);
  }, [isPaused, setIsPaused]);

  // Register callbacks for togglePlay and tapTempo
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
    
    if (registerTapTempo && tapTempo) {
      registerTapTempo(tapTempo);
    }
    
    return () => {
      if (registerTogglePlay) registerTogglePlay(null);
      if (registerTapTempo) registerTapTempo(null);
    };
  }, [registerTogglePlay, registerTapTempo, handlePlayPause, tapTempo]);

  // Handle manual tempo acceleration for training mode
  const handleAccelerate = useCallback(() => {
    if (!isPaused) {
      manualTempoAcceleration({
        tempoIncreasePercent,
        tempoRef: { current: tempo },
        setTempo
      });
    }
  }, [isPaused, tempo, tempoIncreasePercent, setTempo]);

  // Handle subdivision changes for each circle
  const handleSetSubdivisions = (value, circle) => {
    if (circle === 'inner') {
      setInnerBeats(value);
    } else {
      setOuterBeats(value);
    }
  };

  // Handle accent toggles for each circle
  const handleToggleAccent = (index, circle) => {
    if (circle === 'inner') {
      setInnerAccents(prev => {
        const newAccents = [...prev];
        // Cycle through accent values: 0 (muted) → 1 (normal) → 2 (accent) → 3 (first beat) → 0...
        newAccents[index] = (newAccents[index] + 1) % 4;
        return newAccents;
      });
    } else {
      setOuterAccents(prev => {
        const newAccents = [...prev];
        newAccents[index] = (newAccents[index] + 1) % 4;
        return newAccents;
      });
    }
  };

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <div className="polyrhythm-container">
        <CircleRenderer 
          innerBeats={innerBeats}
          outerBeats={outerBeats}
          innerAccents={innerAccents}
          outerAccents={outerAccents}
          innerCurrentSubdivision={innerCurrentSubdivision}
          outerCurrentSubdivision={outerCurrentSubdivision}
          isPaused={isPaused}
          containerSize={containerSize}
          activeCircle={activeCircle}
          setActiveCircle={setActiveCircle}
          handleToggleAccent={handleToggleAccent}
          macroMode={macroMode}
          isSilencePhaseRef={isSilencePhaseRef}
        />
      </div>

      {/* Beats per bar controls */}
      <div className="polyrhythm-controls">
        <div className="polyrhythm-config">
          <label className="polyrhythm-label">Inner Circle: {innerBeats} beats</label>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={`inner-${num}`}
                className={`polyrhythm-button ${innerBeats === num ? 'active' : ''}`}
                onClick={() => handleSetSubdivisions(num, 'inner')}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
        
        <div className="polyrhythm-config">
          <label className="polyrhythm-label">Outer Circle: {outerBeats} beats</label>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={`outer-${num}`}
                className={`polyrhythm-button ${outerBeats === num ? 'active' : ''}`}
                onClick={() => handleSetSubdivisions(num, 'outer')}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="polyrhythm-ratio">
        <h3>
          Polyrhythm: <span className="ratio-value">{innerBeats}:{outerBeats}</span>
        </h3>
      </div>

      {/* Training Mode Accelerate Button */}
      <AccelerateButton 
        onClick={handleAccelerate} 
        speedMode={speedMode}
      />

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

      {/* Tap Tempo button */}
      <button
        onClick={tapTempo}
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

      {/* Legend */}
      <div className="polyrhythm-legend">
        <div className="legend-item">
          <div className="legend-color inner-beat"></div>
          <span>Inner Beat</span>
        </div>
        <div className="legend-item">
          <div className="legend-color outer-beat"></div>
          <span>Outer Beat</span>
        </div>
        <div className="legend-item">
          <div className="legend-color first-beat"></div>
          <span>First Beat</span>
        </div>
      </div>
    </div>
  );
};

export default withTrainingContainer(PolyrhythmMetronome);