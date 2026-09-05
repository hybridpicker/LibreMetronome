// src/components/metronome/MultiCircleMode/MultiCircleMetronome.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import useMultiCircleMetronomeLogic from "./hooks/useMultiCircleMetronomeLogic";
import CircleRenderer from "./CircleRenderer";
import tapButtonIcon from "../../../assets/svg/tap.svg";
import InterfaceIcon from "../../common/InterfaceIcon";
import playIcon from "../../../assets/svg/play.svg";
import pauseIcon from "../../../assets/svg/pause.svg";
import "./MultiCircleMetronome.css";
import '../Controls/slider-styles.css';
import withTrainingContainer from '../../Training/withTrainingContainer'; // Use the standard training container
import MultiCircleControls from './MultiCircleControls';
import TransportButton from '../Controls/TransportButton';

import AccelerateButton from "../Controls/AccelerateButton";
import { manualTempoAcceleration } from "../../../hooks/useMetronomeLogic/trainingLogic";


function MultiCircleMetronome(props) {
  const {
    tempo,
    setTempo,
    isPaused,
    setIsPaused,
    swing,
    setSwing,
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
    soundSetReloadTrigger = 0,
    // training‐related Refs
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef
  } = props;

  const [circleSettings, setCircleSettings] = useState([
    {
      subdivisions: 4,
      accents: [3, 1, 1, 1],
      beatMode: "quarter"
    },
    {
      subdivisions: 3,
      accents: [3, 1, 1],
      beatMode: "quarter"
    }
  ]);
  const [activeCircle, setActiveCircle] = useState(0);
  const [playingCircle, setPlayingCircle] = useState(0);

  // Local training references
  const localMeasureCountRef = useRef(0);
  const localMuteMeasureCountRef = useRef(0);
  const localIsSilencePhaseRef = useRef(false);

  useEffect(() => {
    if (measureCountRef) localMeasureCountRef.current = measureCountRef.current;
    if (muteMeasureCountRef) localMuteMeasureCountRef.current = muteMeasureCountRef.current;
    if (isSilencePhaseRef) localIsSilencePhaseRef.current = isSilencePhaseRef.current;

    const syncInterval = setInterval(() => {
      if (measureCountRef) measureCountRef.current = localMeasureCountRef.current;
      if (muteMeasureCountRef) muteMeasureCountRef.current = localMuteMeasureCountRef.current;
      if (isSilencePhaseRef) isSilencePhaseRef.current = localIsSilencePhaseRef.current;
      window.isSilencePhaseRef = isSilencePhaseRef || localIsSilencePhaseRef;
    }, 500);
    return () => clearInterval(syncInterval);
  }, [measureCountRef, muteMeasureCountRef, isSilencePhaseRef]);

  const getContainerSize = () => {
    if (window.innerWidth < 600) return Math.min(window.innerWidth - 40, 300);
    if (window.innerWidth < 1024) return Math.min(window.innerWidth - 40, 400);
    if (window.matchMedia?.('(orientation: landscape)').matches) return 210;
    return 300;
  };
  const [containerSize, setContainerSize] = useState(getContainerSize());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setContainerSize(getContainerSize());
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Use specialized multi-circle logic
  const logic = useMultiCircleMetronomeLogic({
    tempo,
    setTempo,
    subdivisions: circleSettings[playingCircle]?.subdivisions || 4,
    setSubdivisions: () => {},
    isPaused,
    setIsPaused,
    swing,
    volume,
    accents: circleSettings[playingCircle]?.accents || [3, 1, 1, 1],
    analogMode: false,
    gridMode: false,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    beatMode: circleSettings[playingCircle]?.beatMode || "quarter",
    circleSettings,
    playingCircle,
    onCircleChange: setPlayingCircle
  });

  // Listen for beat-mode-change events
  useEffect(() => {
    const handleBeatModeChange = (event) => {
      const { beatMode, beatMultiplier, circleIndex } = event.detail;
      
      console.log(`[MultiCircle] Beat mode change detected: ${beatMode} (multiplier: ${beatMultiplier}) for circle ${circleIndex}`);
      
      // If we have logic and we're dealing with the currently playing circle,
      // make sure the UI is updated to reflect the change
      if (circleIndex === playingCircle) {
        // We could update some UI state here if needed
        window.currentTempo = tempo; // Update this global if being used
        
        // If needed, we could also force an update through setCircleSettings
        // but this should already be handled by the original event handler
      }
    };
    
    window.addEventListener('beat-mode-change', handleBeatModeChange);
    
    return () => {
      window.removeEventListener('beat-mode-change', handleBeatModeChange);
    };
  }, [playingCircle, tempo]);

  // Re-load sounds when soundSetReloadTrigger changes
  useEffect(() => {
    if (!logic || !logic.reloadSounds || !soundSetReloadTrigger) return;
    logic.reloadSounds()
      .then(success => {
        if (success) {
          console.log("Reloaded sound buffers after settings changed");
        } else {
          console.warn("Failed to reload sound buffers");
        }
      })
      .catch(err => {
        console.error("Error reloading sound buffers:", err);
      });
  }, [soundSetReloadTrigger, logic]);

  // Provide tap tempo if registerTapTempo is given
  useEffect(() => {
    if (registerTapTempo && logic && logic.tapTempo) {
      registerTapTempo(logic.tapTempo);
    }
    return () => {
      if (registerTapTempo) {
        registerTapTempo(null);
      }
    };
  }, [logic, registerTapTempo]);

  // Provide play/pause toggle callback if registerTogglePlay is given
  const handlePlayPause = useCallback(() => {
    if (logic && logic.isProcessingPlayPauseRef?.current) {
      console.log("Ignoring play/pause - already processing");
      return;
    }
    if (!logic) return;

    if (isPaused) {
      // starting
      logic.safelyInitAudioContext?.().then(() => {
        setPlayingCircle(0);
        setIsPaused(false);
      });
    } else {
      setIsPaused(true);
      if (logic.stopScheduler) {
        logic.stopScheduler();
      }
      setPlayingCircle(0);
    }
  }, [isPaused, logic, setIsPaused]);

  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
    return () => {
      if (registerTogglePlay) {
        registerTogglePlay(null);
      }
    };
  }, [handlePlayPause, registerTogglePlay]);

  // Manual accelerate
  const handleAccelerate = useCallback(() => {
    if (!isPaused && tempoIncreasePercent > 0) {
      manualTempoAcceleration({
        tempoIncreasePercent,
        tempoRef: { current: tempo },
        setTempo
      });
      localMeasureCountRef.current = 0;
      if (macroMode !== 0 || speedMode !== 0) {
        window.dispatchEvent(new CustomEvent('training-measure-update'));
      }
    }
  }, [isPaused, tempoIncreasePercent, tempo, setTempo, macroMode, speedMode]);

  // ─────────────────────────────────────────────────────────
  //                ***  The critical FIX here  ***
  // ─────────────────────────────────────────────────────────
  const removeCircle = useCallback((indexToRemove) => {
    if (!circleSettings || circleSettings.length <= 1) return;
    setCircleSettings(prev => prev.filter((_, idx) => idx !== indexToRemove));

    if (playingCircle === indexToRemove) {
      setPlayingCircle(0);
    } else if (playingCircle > indexToRemove) {
      setPlayingCircle(prev => prev - 1);
    }
    if (activeCircle === indexToRemove) {
      setActiveCircle(0);
    } else if (activeCircle > indexToRemove) {
      setActiveCircle(prev => prev - 1);
    }
  }, [circleSettings, playingCircle, activeCircle]);

  // Accent edits are read at the next bar boundary without restarting playback.
  const updateAccent = useCallback((beatIndex, circleIndex) => {
    if (beatIndex === 'remove') {
      removeCircle(circleIndex);
      return;
    }
    
    setCircleSettings(prev => {
      if (!prev || !prev.length) return prev;
      const updated = [...prev];
      if (activeCircle >= updated.length) return prev;
  
      const circle = updated[activeCircle];
      if (!circle.accents || beatIndex >= circle.accents.length) return prev;
  
      const acc = [...circle.accents];
      acc[beatIndex] = (acc[beatIndex] + 1) % 4; // cycle 0→1→2→3→0
  
      updated[activeCircle] = { 
        ...circle,
        accents: acc
      };
  
      return updated;
    });
  
    // Dispatch an event for potential debugging
    window.dispatchEvent(new CustomEvent('accent-change', {
      detail: {
        circleIndex: activeCircle,
        beatIndex,
        playingCircleIndex: playingCircle,
        isPlayingCircle: activeCircle === playingCircle // Add this property
      }
    }));
  }, [activeCircle, playingCircle, removeCircle]);

  // Add new circle
  const addCircle = useCallback(() => {
    setCircleSettings(prev => {
      if (!prev?.length) return prev;
      const lastCircle = prev[prev.length - 1];
      const newSubdivisions = (lastCircle.subdivisions === 4) ? 3 : 4;
      const newBeatMode = (lastCircle.beatMode === "quarter") ? "eighth" : "quarter";

      return [
        ...prev,
        {
          subdivisions: newSubdivisions,
          accents: Array.from({ length: newSubdivisions }, (_, i) => (i === 0 ? 3 : 1)),
          beatMode: newBeatMode
        }
      ];
    });
  }, []);

  // Render
  return (
    <div className="multi-mode-shell" style={{ textAlign: "center" }}>
      <AccelerateButton onClick={handleAccelerate} speedMode={speedMode} />

      <div className="circles-container" style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "20px",
        width: "100%",
        flexWrap: "wrap"
      }}>
        {circleSettings.map((settings, idx) => (
          <CircleRenderer
            key={idx}
            settings={settings}
            idx={idx}
            isActiveUI={idx === activeCircle}
            isPlaying={idx === playingCircle && !isPaused}
            currentSubdivision={logic?.currentSubdivision || 0}
            isPaused={isPaused}
            audioCtxRunning={logic?.audioCtx && logic.audioCtx.state === "running"}
            isTransitioning={logic && logic.isTransitioning ? logic.isTransitioning() : false}
            updateAccent={updateAccent}
            radius={containerSize / 2}
            containerSize={containerSize}
            setActiveCircle={setActiveCircle}
            circleSettings={circleSettings}
            macroMode={macroMode}
            isSilencePhaseRef={localIsSilencePhaseRef}
            isMobile={isMobile}
          />
        ))}
        
      </div>

      <div className="circle-actions" role="group" aria-label="Manage rhythm circles">
        <button
          type="button"
          onClick={() => removeCircle(activeCircle)}
          disabled={circleSettings.length <= 1}
          aria-label={`Remove circle ${activeCircle + 1}`}
          title={`Remove selected circle ${activeCircle + 1}`}
        >
          <InterfaceIcon name="remove" size={20} />
        </button>
        <button type="button" onClick={addCircle} aria-label="Add rhythm circle" title="Add circle">
          <InterfaceIcon name="add" size={20} />
        </button>
      </div>

      <div className="transport-row multi-transport-row">
        <TransportButton
          kind="play"
          icon={isPaused ? playIcon : pauseIcon}
          label={isPaused ? 'Start' : 'Pause'}
          onClick={handlePlayPause}
          pressed={!isPaused}
          className="play-pause-button"
        />
        <TransportButton
          kind="tap"
          icon={tapButtonIcon}
          label="Tap Tempo"
          feedbackVolume={volume}
          className="tap-button"
          onClick={() => {
            if (logic && typeof logic.tapTempo === 'function') {
              logic.tapTempo();
            } else {
              const now = performance.now();
              window.dispatchEvent(new CustomEvent('metronome-tap-tempo', {
                detail: { timestamp: now }
              }));
            }
          }}
        />
      </div>

      <MultiCircleControls
        circleSettings={circleSettings}
        setCircleSettings={setCircleSettings}
        activeCircle={activeCircle}
        tempo={tempo}
        setTempo={setTempo}
        volume={volume}
        setVolume={setVolume}
        swing={swing}
        setSwing={setSwing}
      />
    </div>
  );
}

export default withTrainingContainer(MultiCircleMetronome);
