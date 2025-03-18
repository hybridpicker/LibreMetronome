// src/components/metronome/PolyrhythmMode/PolyrhythmMetronome.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import usePolyrhythmLogic from './usePolyrhythmLogic';
import playIcon from '../../../assets/svg/play.svg';
import pauseIcon from '../../../assets/svg/pause.svg';
import tapButtonIcon from '../../../assets/svg/tap-button.svg';
import CircleRenderer from './CircleRenderer';
import './PolyrhythmMetronome.css';
import withTrainingContainer from '../../Training/withTrainingContainer';
import AccelerateButton from '../Controls/AccelerateButton';
import { manualTempoAcceleration } from '../../../hooks/useMetronomeLogic/trainingLogic';

// Utility debounce function to prevent rapid changes
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const PolyrhythmMetronome = (props) => {
  const {
    tempo,
    setTempo,
    isPaused,
    setIsPaused,
    swing,
    volume,
    setVolume,
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
  
  // Track transition states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef(null);
  
  // Beat states for both circles – initialized with proper accent patterns
  const [innerAccents, setInnerAccents] = useState(
    Array.from({ length: innerBeats }, (_, i) => (i === 0 ? 3 : 1))
  );
  const [outerAccents, setOuterAccents] = useState(
    Array.from({ length: outerBeats }, (_, i) => (i === 0 ? 3 : 1))
  );

  // State for tracking sound and color swapping
  const [soundsSwapped, setSoundsSwapped] = useState(false);
  const [circleColorSwapped, setCircleColorSwapped] = useState(false);

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
    soundsSwapped,
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
    startScheduler,
    stopScheduler
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

  // Handle Play/Pause - IMPROVED with explicit scheduler control
  const handlePlayPause = useCallback(() => {
    // Don't toggle during transitions
    if (isTransitioning) return;
    
    // First explicitly stop playback if we're pausing
    if (!isPaused) {
      stopScheduler();
    }
    
    // Then toggle the paused state
    setIsPaused(!isPaused);
  }, [isPaused, setIsPaused, isTransitioning, stopScheduler]);

  // Register play/pause toggle for keyboard control (spacebar)
  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay, handlePlayPause]);

  // Register tap tempo if available
  useEffect(() => {
    if (registerTapTempo && tapTempo) {
      registerTapTempo(tapTempo);
    }
  }, [registerTapTempo, tapTempo]);

  // New helper: pause metronome and then resume after circle change
  const handleCircleChange = useCallback((circle) => {
    if (activeCircle === circle || isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (!isPaused) {
      stopScheduler();
    }
    
    setActiveCircle(circle);
    
    // Wait for transition to complete before restarting
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      if (!isPaused) {
        startScheduler();
      }
    }, 100);
  }, [activeCircle, isPaused, isTransitioning, startScheduler, stopScheduler]);

  // Update accent toggles – also pause/resume the metronome when accent is changed
  const handleToggleAccent = useCallback((index, circle) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (!isPaused) {
      stopScheduler();
    }
    
    if (circle === 'inner') {
      setInnerAccents(prev => {
        const newAccents = [...prev];
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
    
    // Wait for transition to complete before restarting
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      if (!isPaused) {
        startScheduler();
      }
    }, 100);
  }, [isPaused, isTransitioning, startScheduler, stopScheduler]);

  // Handle subdivision changes for each circle with debounce
  const handleSetSubdivisions = useCallback((value, circle) => {
    if (isTransitioning) return;
    
    // First mark as transitioning
    setIsTransitioning(true);
    
    // Pause the metronome
    if (!isPaused) {
      stopScheduler();
    }
    
    // Update the subdivision count
    if (circle === 'inner') {
      setInnerBeats(value);
    } else {
      setOuterBeats(value);
    }
    
    // Use a delay before resuming to allow for buffer update
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      if (!isPaused) {
        startScheduler();
      }
    }, 200); // 200ms delay provides time for state updates to propagate
  }, [isPaused, isTransitioning, startScheduler, stopScheduler]);

  // Properly debounced button handler to prevent rapid transitions
  const debouncedSetSubdivisions = useCallback(
    debounce((value, circle) => handleSetSubdivisions(value, circle), 150),
    [handleSetSubdivisions]
  );

  // Handle tap tempo with proper integration
  const handleTapTempo = useCallback(() => {
    if (isTransitioning || !tapTempo) return;
    tapTempo();
  }, [isTransitioning, tapTempo]);

  // Function to swap inner and outer beats and their accent patterns
  const handleSwitchCircles = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (!isPaused) {
      stopScheduler();
    }
    
    // Swap the beat counts
    const tempBeats = innerBeats;
    setInnerBeats(outerBeats);
    setOuterBeats(tempBeats);
    
    // Swap the accent patterns
    const tempAccents = [...innerAccents];
    setInnerAccents([...outerAccents]);
    setOuterAccents(tempAccents);
    
    // Swap the sounds
    setSoundsSwapped(!soundsSwapped);
    
    // Swap the colors
    setCircleColorSwapped(!circleColorSwapped);
    
    // Wait for transition to complete before restarting
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      if (!isPaused) {
        startScheduler();
      }
    }, 200); // Give a bit more time (200ms) for the swap transition
  }, [
    innerBeats, outerBeats, 
    innerAccents, outerAccents, 
    soundsSwapped, circleColorSwapped,
    isPaused, isTransitioning, 
    startScheduler, stopScheduler
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <AccelerateButton onClick={() => {
        if (!isPaused && !isTransitioning) {
          manualTempoAcceleration({
            tempoIncreasePercent,
            tempoRef: { current: tempo },
            setTempo
          });
        }
      }} speedMode={speedMode} />
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
          setActiveCircle={handleCircleChange}
          handleToggleAccent={handleToggleAccent}
          macroMode={macroMode}
          isSilencePhaseRef={isSilencePhaseRef}
          isTransitioning={isTransitioning}
          circleColorSwapped={circleColorSwapped}
        />
      </div>
      <div className="polyrhythm-controls">
        <div className="polyrhythm-config">
          <label className="polyrhythm-label">Inner Circle: {innerBeats} beats</label>
          <div className="polyrhythm-buttons">
            {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={`inner-${num}`}
                className={`polyrhythm-button ${innerBeats === num ? 'active' : ''}`}
                onClick={() => debouncedSetSubdivisions(num, 'inner')}
                disabled={isTransitioning}
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
                onClick={() => debouncedSetSubdivisions(num, 'outer')}
                disabled={isTransitioning}
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
      
      {/* Tempo and Volume sliders matching BaseMetronomeLayout */}
      <div className="sliders-container">
        <label>
          Tempo: {tempo} BPM
          <input 
            type="range" 
            min={30} 
            max={240} 
            step={1} 
            value={tempo} 
            onChange={(e) => setTempo(Number(e.target.value))}
            disabled={isTransitioning} 
          />
        </label>
        <label>
          Volume: {Math.round(volume * 100)}%
          <input 
            type="range" 
            min={0} 
            max={1} 
            step={0.01} 
            value={volume} 
            onChange={(e) => setVolume(Number(e.target.value))}
            disabled={isTransitioning} 
          />
        </label>
      </div>
      
      {/* Swap button */}
      <div className="switch-circles-container">
        <button
          onClick={handleSwitchCircles}
          className="switch-circles-button"
          style={{
            background: '#00A0A0',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: isTransitioning ? 'not-allowed' : 'pointer',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            opacity: isTransitioning ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
          aria-label="Swap Inner and Outer Beat Patterns, Sounds, and Colors"
          disabled={isTransitioning}
        >
          <span style={{ marginRight: '8px' }}>Swap</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 16L3 12M3 12L7 8M3 12H16M17 8L21 12M21 12L17 16M21 12H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      
      <AccelerateButton onClick={() => {
        if (!isPaused && !isTransitioning) {
          manualTempoAcceleration({
            tempoIncreasePercent,
            tempoRef: { current: tempo },
            setTempo
          });
        }
      }} speedMode={speedMode} />
      <div style={{ marginTop: 20 }}>
        <button
          onClick={handlePlayPause}
          className="play-pause-button"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: isTransitioning ? 'not-allowed' : 'pointer',
            padding: '10px',
            opacity: isTransitioning ? 0.7 : 1
          }}
          aria-label="Toggle play/pause"
          disabled={isTransitioning}
        >
          <img
            src={isPaused ? playIcon : pauseIcon}
            alt={isPaused ? 'Play' : 'Pause'}
            className="play-pause-icon"
            style={{ width: 40, height: 40 }}
          />
        </button>
      </div>
      <button
        onClick={handleTapTempo}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          cursor: isTransitioning ? 'not-allowed' : 'pointer', 
          marginTop: '20px',
          padding: '10px',
          outline: 'none',
          display: 'block',
          margin: '10px auto',
          opacity: isTransitioning ? 0.7 : 1
        }}
        aria-label="Tap Tempo"
        disabled={isTransitioning}
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