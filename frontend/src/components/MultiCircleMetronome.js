// File: src/components/MultiCircleMetronome.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import useMetronomeLogic from '../hooks/useMetronomeLogic';
import useKeyboardShortcuts from '../hooks/KeyboardShortcuts';

// Beat icons
import firstBeat from '../assets/svg/firstBeat.svg';
import firstBeatActive from '../assets/svg/firstBeatActive.svg';
import normalBeat from '../assets/svg/normalBeat.svg';
import normalBeatActive from '../assets/svg/normalBeatActive.svg';
import accentedBeat from '../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../assets/svg/accentedBeatActive.svg';

// Control icons
import tapButtonIcon from '../assets/svg/tap-button.svg';
import playIcon from '../assets/svg/play.svg';
import pauseIcon from '../assets/svg/pause.svg';

// A static circle background for inactive circles
import circleSVG from '../assets/svg/circle.svg';

// Subdivision icons (inactive)
import subdivision1 from '../assets/svg/subdivision-1.svg';
import subdivision2 from '../assets/svg/subdivision-2.svg';
import subdivision3 from '../assets/svg/subdivision-3.svg';
import subdivision4 from '../assets/svg/subdivision-4.svg';
import subdivision5 from '../assets/svg/subdivision-5.svg';
import subdivision6 from '../assets/svg/subdivision-6.svg';
import subdivision7 from '../assets/svg/subdivision-7.svg';
import subdivision8 from '../assets/svg/subdivision-8.svg';
import subdivision9 from '../assets/svg/subdivision-9.svg';
// Subdivision icons (active)
import subdivision1Active from '../assets/svg/subdivision-1Active.svg';
import subdivision2Active from '../assets/svg/subdivision-2Active.svg';
import subdivision3Active from '../assets/svg/subdivision-3-Active.svg';
import subdivision4Active from '../assets/svg/subdivision-4Active.svg';
import subdivision5Active from '../assets/svg/subdivision-5Active.svg';
import subdivision6Active from '../assets/svg/subdivision-6Active.svg';
import subdivision7Active from '../assets/svg/subdivision-7Active.svg';
import subdivision8Active from '../assets/svg/subdivision-8Active.svg';
import subdivision9Active from '../assets/svg/subdivision-9Active.svg';

export default function MultiCircleMetronome(props) {
  // Each circle has its own settings.
  // Initially, we start with one circle using the default settings from props.
  const [circleSettings, setCircleSettings] = useState([
    {
      subdivisions: props.subdivisions || 4,
      accents: Array.from({ length: props.subdivisions || 4 }, (_, i) => (i === 0 ? 3 : 1)),
      beatMode: "quarter" // "quarter" or "eighth"
    }
  ]);
  const [activeCircle, setActiveCircle] = useState(0);
  const currentSettings = circleSettings[activeCircle] || { subdivisions: 4, accents: [3, 1, 1, 1], beatMode: "quarter" };

  // --- Define addCircle before usage ---
  const addCircle = () => {
    setCircleSettings(prev => [...prev, {
      subdivisions: props.subdivisions || 4,
      accents: Array.from({ length: props.subdivisions || 4 }, (_, i) => (i === 0 ? 3 : 1)),
      beatMode: "quarter"
    }]);
  };

  // Allow clicking on any circle to activate it.
  const onCircleClick = (index) => {
    setActiveCircle(index);
  };

  // Create a metronome logic hook using the active circle's settings.
  const logic = useMetronomeLogic({
    tempo: props.tempo,
    setTempo: props.setTempo,
    subdivisions: currentSettings.subdivisions,
    setSubdivisions: (newSub) => {
      setCircleSettings(prev => {
        const newSettings = [...prev];
        newSettings[activeCircle] = {
          ...newSettings[activeCircle],
          subdivisions: newSub,
          accents: Array.from({ length: newSub }, (_, i) => (i === 0 ? 3 : 1))
        };
        return newSettings;
      });
    },
    isPaused: props.isPaused,
    setIsPaused: props.setIsPaused,
    swing: props.swing,
    volume: props.volume,
    accents: currentSettings.accents,
    beatConfig: null,
    analogMode: props.analogMode,
    gridMode: props.gridMode,
    macroMode: props.macroMode,
    speedMode: props.speedMode,
    measuresUntilMute: props.measuresUntilMute,
    muteDurationMeasures: props.muteDurationMeasures,
    muteProbability: props.muteProbability,
    tempoIncreasePercent: props.tempoIncreasePercent,
    measuresUntilSpeedUp: props.measuresUntilSpeedUp,
    beatMultiplier: currentSettings.beatMode === "quarter" ? 1 : 2
  });

  // Update accent for active circle when a beat is clicked.
  const updateAccent = (index) => {
    setCircleSettings(prev => {
      const newSettings = [...prev];
      const currentAccents = newSettings[activeCircle].accents.slice();
      currentAccents[index] = (currentAccents[index] + 1) % 3;
      newSettings[activeCircle] = { ...newSettings[activeCircle], accents: currentAccents };
      return newSettings;
    });
  };

  // Cycle active circle automatically when a measure completes.
  const prevSubdivisionRef = useRef(null);
  useEffect(() => {
    if (prevSubdivisionRef.current !== null && logic.currentSubdivision === 0) {
      setActiveCircle(prev => (prev + 1) % circleSettings.length);
    }
    prevSubdivisionRef.current = logic.currentSubdivision;
  }, [logic.currentSubdivision, circleSettings.length]);

  // Responsive container size.
  const getContainerSize = () => {
    if (window.innerWidth < 600) return Math.min(window.innerWidth - 40, 300);
    if (window.innerWidth < 1024) return Math.min(window.innerWidth - 40, 400);
    return 300;
  };
  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    const handleResize = () => setContainerSize(getContainerSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const radius = containerSize / 2;

  // Compute beat data for the active circle.
  const computeBeatData = useCallback(() => {
    return Array.from({ length: currentSettings.subdivisions }, (_, i) => {
      const angle = (2 * Math.PI * i) / currentSettings.subdivisions - Math.PI / 2;
      const xPos = radius * Math.cos(angle);
      const yPos = radius * Math.sin(angle);
      const isActive = (i === logic.currentSubdivision) && !props.isPaused &&
                       logic.audioCtx && logic.audioCtx.state === 'running';
      let icon;
      if (i === 0) {
        icon = isActive ? firstBeatActive : firstBeat;
      } else {
        const state = currentSettings.accents[i] || 1;
        icon = state === 2 ? (isActive ? accentedBeatActive : accentedBeat)
                           : (isActive ? normalBeatActive : normalBeat);
      }
      return { i, xPos, yPos, icon };
    });
  }, [currentSettings, radius, logic.currentSubdivision, props.isPaused]);

  const beatData = computeBeatData();

  // Render the active circle (clickable beat icons that update accents).
  const renderActiveCircle = () => {
    return beatData.map((bd, i) => (
      <img
        key={i}
        src={bd.icon}
        alt={`Beat ${bd.i}`}
        onClick={() => updateAccent(bd.i)}
        style={{
          position: 'absolute',
          left: `calc(50% + ${bd.xPos}px - 12px)`,
          top: `calc(50% + ${bd.yPos}px - 12px)`,
          width: '24px',
          height: '24px',
          cursor: 'pointer'
        }}
      />
    ));
  };

  // Render subdivision chooser for the active circle.
  const subdivisionButtons = useCallback(() => {
    const subIcons = [
      subdivision1, subdivision2, subdivision3, subdivision4, subdivision5,
      subdivision6, subdivision7, subdivision8, subdivision9
    ];
    const subIconsActive = [
      subdivision1Active, subdivision2Active, subdivision3Active, subdivision4Active, subdivision5Active,
      subdivision6Active, subdivision7Active, subdivision8Active, subdivision9Active
    ];
    return subIcons.map((icon, idx) => {
      const subVal = idx + 1;
      const isActive = subVal === currentSettings.subdivisions;
      const iconToUse = isActive ? subIconsActive[idx] : icon;
      return (
        <img
          key={subVal}
          src={iconToUse}
          alt={`Subdivision ${subVal}`}
          onClick={() => {
            setCircleSettings(prev => {
              const newSettings = [...prev];
              newSettings[activeCircle] = {
                ...newSettings[activeCircle],
                subdivisions: subVal,
                accents: Array.from({ length: subVal }, (_, i) => (i === 0 ? 3 : 1))
              };
              return newSettings;
            });
          }}
          style={{ cursor: 'pointer', width: '36px', height: '36px', margin: '0 3px' }}
        />
      );
    });
  }, [currentSettings.subdivisions, activeCircle]);

  // Note selector for the active circle.
  const noteSelector = () => {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button
          onClick={() => {
            setCircleSettings(prev => {
              const newSettings = [...prev];
              newSettings[activeCircle] = { ...newSettings[activeCircle], beatMode: "quarter" };
              return newSettings;
            });
          }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <img
            src={require('../assets/svg/quarter_eight_notes/quarterNotesActive.svg').default}
            alt="Quarter Notes"
            style={{ width: '50px', height: '50px', opacity: currentSettings.beatMode === "quarter" ? 1 : 0.5 }}
          />
        </button>
        <button
          onClick={() => {
            setCircleSettings(prev => {
              const newSettings = [...prev];
              newSettings[activeCircle] = { ...newSettings[activeCircle], beatMode: "eighth" };
              return newSettings;
            });
          }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <img
            src={require('../assets/svg/quarter_eight_notes/eightNotesActive.svg').default}
            alt="Eighth Notes"
            style={{ width: '50px', height: '50px', opacity: currentSettings.beatMode === "eighth" ? 1 : 0.5 }}
          />
        </button>
      </div>
    );
  };

  // Define play/pause handler (already defined above, but we also use useCallback for stability).
  const handlePlayPause = useCallback(() => {
    if (props.isPaused) {
      if (logic.audioCtx && logic.audioCtx.state === 'suspended') {
        logic.audioCtx.resume().then(() => {
          props.setIsPaused(false);
          logic.startScheduler();
        }).catch((err) => {
          console.error("[MultiCircleMetronome] Error resuming AudioContext:", err);
        });
      } else {
        props.setIsPaused(false);
        logic.startScheduler();
      }
    } else {
      props.setIsPaused(true);
      logic.stopScheduler();
    }
  }, [props.isPaused, logic]);

  // Register keyboard shortcuts.
  useKeyboardShortcuts({
    onTogglePlayPause: handlePlayPause,
    onTapTempo: logic.tapTempo
  });

  // Mobile detection.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Render circles: each circle is clickable to become active */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {circleSettings.map((settings, index) => (
          <div
            key={index}
            onClick={() => onCircleClick(index)}
            style={{
              position: 'relative',
              width: containerSize,
              height: containerSize,
              border: index === activeCircle ? '3px solid #00A0A0' : '3px solid transparent',
              borderRadius: '50%',
              cursor: 'pointer'
            }}
          >
            {index === activeCircle ? (
              renderActiveCircle()
            ) : (
              // Inactive circle: render static beat layout based on its stored settings.
              Array.from({ length: settings.subdivisions }, (_, i) => {
                const angle = (2 * Math.PI * i) / settings.subdivisions - Math.PI / 2;
                const xPos = radius * Math.cos(angle);
                const yPos = radius * Math.sin(angle);
                let icon = i === 0 ? firstBeat : (settings.accents[i] === 2 ? accentedBeat : normalBeat);
                return (
                  <img
                    key={i}
                    src={icon}
                    alt={`Beat ${i}`}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${xPos}px - 12px)`,
                      top: `calc(50% + ${yPos}px - 12px)`,
                      width: '24px',
                      height: '24px'
                    }}
                  />
                );
              })
            )}
          </div>
        ))}
      </div>
      {/* Controls: Play/Pause and Add Circle */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button
          onClick={handlePlayPause}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
          aria-label="Toggle Play/Pause"
        >
          <img
            src={props.isPaused ? playIcon : pauseIcon}
            alt={props.isPaused ? 'Play' : 'Pause'}
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
        </button>
        <button
          onClick={addCircle}
          style={{
            background: '#00A0A0',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '24px',
            lineHeight: '50px'
          }}
          aria-label="Add Circle"
        >
          +
        </button>
      </div>
      {/* Active circle controls */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <h3>Subdivision</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {subdivisionButtons()}
        </div>
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <h3>Notes</h3>
        {noteSelector()}
      </div>
      {/* Global sliders */}
      <div className="sliders-container" style={{ marginTop: '20px', width: '100%' }}>
        <div className="slider-item" style={{ marginBottom: '10px', maxWidth: '300px', margin: '0 auto' }}>
          {currentSettings.subdivisions % 2 === 0 && (
            <>
              <label>Swing: {Math.round(props.swing * 200)}% </label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={props.swing}
                onChange={(e) => props.setSwing(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </>
          )}
        </div>
        <div className="slider-item" style={{ marginBottom: '10px', maxWidth: '300px', margin: '0 auto' }}>
          <label>Volume: {Math.round(props.volume * 100)}% </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={props.volume}
            onChange={(e) => props.setVolume(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div className="slider-item tempo-slider" style={{ maxWidth: '300px', margin: '0 auto' }}>
          <label>Tempo: {props.tempo} BPM </label>
          <input
            type="range"
            min={15}
            max={240}
            step={1}
            value={props.tempo}
            onChange={(e) => props.setTempo(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
      {isMobile && (
        <button
          onClick={logic.tapTempo}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '20px' }}
          aria-label="Tap Tempo"
        >
          <img
            src={tapButtonIcon}
            alt="Tap Tempo"
            style={{ height: '35px', objectFit: 'contain' }}
          />
        </button>
      )}
    </div>
  );
}
