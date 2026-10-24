import React, { useState, useEffect, useRef, useCallback } from "react";
import { useVizCardSize } from '../utils/layoutSize';
import useMetronomeLogic from "../hooks/useMetronomeLogic";

import TransportButton from "./metronome/Controls/TransportButton";

import AnalogMetronomeCanvas from "./metronome/AnalogMode/AnalogMetronomeCanvas";
import withTrainingContainer from "./Training/withTrainingContainer";
import AccelerateButton from "./metronome/Controls/AccelerateButton";
import { manualTempoAcceleration } from "../hooks/useMetronomeLogic/trainingLogic";

// Unused imports removed


// Room kept between the ring and the edge of the visualisation area.
const RING_MARGIN = 28;
const MAX_RING = 520;

export function AdvancedMetronomeWithCircle({
  tempo,
  setTempo,
  subdivisions,
  setSubdivisions,
  isPaused,
  setIsPaused,
  swing,
  setSwing,
  volume,
  setVolume,
  analogMode = false,
  gridMode = false,
  accents,
  toggleAccent,
  macroMode,
  speedMode,
  measuresUntilMute,
  muteDurationMeasures,
  muteProbability,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  beatMultiplier = 1,
  registerTogglePlay,
  registerTapTempo,
  soundSetReloadTrigger
}) {
  const [currentBeatMultiplier, setCurrentBeatMultiplier] = useState(beatMultiplier);
  const logicRef = useRef(null);

  useEffect(() => {
    setCurrentBeatMultiplier(beatMultiplier);
  }, [beatMultiplier]);

  const [localAccents, setLocalAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1))
  );
  const effectiveAccents = accents || localAccents;

  useEffect(() => {
    if (!accents) {
      setLocalAccents((prev) => {
        if (prev.length === subdivisions) return prev;
        return Array.from({ length: subdivisions }, (_, i) => (i === 0 ? 3 : 1));
      });
    }
  }, [subdivisions, accents]);

  const localToggleAccent = useCallback(
    (index) => {
      if (analogMode) return;
      setLocalAccents((prev) => {
        const newArr = [...prev];
        newArr[index] = (newArr[index] + 1) % 4;
        return newArr;
      });
    },
    [analogMode]
  );
  const effectiveToggleAccent = toggleAccent || localToggleAccent;

  const logic = useMetronomeLogic({
    tempo,
    setTempo,
    subdivisions,
    setSubdivisions,
    isPaused,
    setIsPaused,
    swing: analogMode ? 0 : swing,
    setSwing: (value) => {
      if (!analogMode) {
        setSwing(value);
      }
    },
    volume,
    setVolume,
    accents: effectiveAccents,
    analogMode,
    gridMode,
    macroMode,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    muteProbability,
    tempoIncreasePercent,
    measuresUntilSpeedUp,
    beatMultiplier: currentBeatMultiplier
  });

  useEffect(() => {
    logicRef.current = logic;
  }, [logic]);

  useEffect(() => {
    const handleBeatModeChange = (event) => {
      const { beatMultiplier: newBeatMultiplier } = event.detail;
      setCurrentBeatMultiplier(newBeatMultiplier);
      const currentLogic = logicRef.current;
      if (currentLogic && currentLogic.updateBeatMultiplier) {
        currentLogic.updateBeatMultiplier(newBeatMultiplier);
        if (!isPaused) {
          setTimeout(() => {
            if (currentLogic.startScheduler) {
              currentLogic.startScheduler();
            }
          }, 5);
        }
      }
    };

    window.addEventListener("beat-mode-change", handleBeatModeChange);

    return () => {
      window.removeEventListener("beat-mode-change", handleBeatModeChange);
    };
  }, [isPaused]);

  useEffect(() => {
    const handleTrainingModeToggle = (event) => {
      const { type, newValue } = event.detail;
      const updateEvent = new CustomEvent("training-settings-update", {
        detail: { [type]: newValue }
      });
      window.dispatchEvent(updateEvent);
    };

    window.addEventListener("training-mode-toggle", handleTrainingModeToggle);

    return () => {
      window.removeEventListener("training-mode-toggle", handleTrainingModeToggle);
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    console.log("[AdvancedMetronome] Play/pause toggle requested");
    if (isPaused) {
      try {
        console.log("[AdvancedMetronome] Starting playback");
        
        // First, check if we need to initialize the audio system
        if (!logic.audioCtx) {
          console.log("[AdvancedMetronome] No audio context, initializing");
          await logic.reloadSounds().catch(err => {
            console.warn("[AdvancedMetronome] Error initializing sounds:", err);
          });
        }
        
        // If the context is suspended, try to resume it
        if (logic.audioCtx && logic.audioCtx.state === "suspended") {
          console.log("[AdvancedMetronome] Resuming suspended audio context");
          try {
            await logic.audioCtx.resume();
            console.log("[AdvancedMetronome] Audio context resumed successfully");
          } catch (err) {
            console.warn("[AdvancedMetronome] Error resuming audio context:", err);
          }
        }
        
        // Ensure we have sound buffers ready
        if (!logic.normalBufferRef?.current || !logic.accentBufferRef?.current || !logic.firstBufferRef?.current) {
          console.log("[AdvancedMetronome] Sound buffers not ready, loading sounds");
          await logic.reloadSounds().catch(err => {
            console.warn("[AdvancedMetronome] Error loading sounds:", err);
          });
        }
        
        // Check audio context state one more time
        if (logic.audioCtx && logic.audioCtx.state !== "running") {
          console.log("[AdvancedMetronome] Audio context still not running, making final attempt to resume");
          try {
            await logic.audioCtx.resume();
          } catch (err) {
            console.warn("[AdvancedMetronome] Final resume attempt failed:", err);
            // Continue anyway - the play button handler will show an error if needed
          }
        }
        
        // Start playback now that we've tried to initialize everything
        setIsPaused(false);
        logic.startScheduler();
        console.log("[AdvancedMetronome] Playback started");
      } catch (err) {
        console.error("[AdvancedMetronome] Error starting playback:", err);
        // Continue with playback attempt even if there were errors in initialization
        setIsPaused(false);
        logic.startScheduler();
      }
    } else {
      console.log("[AdvancedMetronome] Stopping playback");
      setIsPaused(true);
      logic.stopScheduler();
    }
  }, [isPaused, logic, setIsPaused]);

  const handleAccelerate = useCallback(() => {
    if (!isPaused) {
      manualTempoAcceleration({
        tempoIncreasePercent,
        tempoRef: { current: tempo },
        setTempo
      });
    }
  }, [isPaused, tempo, tempoIncreasePercent, setTempo]);

  useEffect(() => {
    if (registerTogglePlay) {
      registerTogglePlay(handlePlayPause);
    }
  }, [registerTogglePlay, handlePlayPause]);
  
  // Register the tap tempo handler separately to avoid dependency on registerTapTempo
  useEffect(() => {
    // Make the tap tempo function available globally to avoid prop passing issues
    if (logic && logic.tapTempo) {
      console.log("[AdvancedMetronome] Making tap tempo handler available globally");
      
      // Set both the window.tapTempoRef and App's tapTempoRef
      window.tapTempoRef = { current: logic.tapTempo };
      
      // Try three different approaches to register the tap tempo handler
      // 1. Use the prop if available
      if (typeof registerTapTempo === 'function') {
        console.log("[AdvancedMetronome] Registering via prop");
        registerTapTempo(logic.tapTempo);
      }
      
      // 2. Update the global App-level tapTempoRef directly
      if (window.tapTempoRef) {
        console.log("[AdvancedMetronome] Setting window.tapTempoRef");
        window.tapTempoRef.current = logic.tapTempo;
      }
      
      // 3. Dispatch a custom event that App.js can listen for
      console.log("[AdvancedMetronome] Dispatching register-tap-tempo event");
      window.dispatchEvent(new CustomEvent('register-tap-tempo', {
        detail: { handler: logic.tapTempo }
      }));
    }
    
    return () => {
      // Clean up on unmount if we set the global ref
      if (window.tapTempoRef && window.tapTempoRef.current === logic.tapTempo) {
        window.tapTempoRef.current = null;
      }
    };
  }, [logic, registerTapTempo]);

  // The visualisation area is sized by CSS (layout.css); the beats scale to it.
  const [vizRef, vizSize] = useVizCardSize();
  const vizReady = vizSize.width > 0 && vizSize.height > 0;
  // Beat marks sit on the ring and overhang it by half a mark; keep that room.
  const ringSize = vizReady
    ? Math.max(120, Math.floor(Math.min(MAX_RING, vizSize.width - 2 * RING_MARGIN, vizSize.height - 2 * RING_MARGIN)))
    : 0;
  const containerSize = ringSize;
  const analogBox = analogMode && vizReady
    ? { width: vizSize.width, height: vizSize.height }
    : null;
  const radius = containerSize / 2;

  const beatData = Array.from({ length: subdivisions }, (_, i) => {
    if (subdivisions === 1) {
      return { i, xPos: 0, yPos: 0 };
    } else {
      const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
      return {
        i,
        xPos: radius * Math.cos(angle),
        yPos: radius * Math.sin(angle)
      };
    }
  });

  let lineConnections = null;
  if (!analogMode && subdivisions > 1) {
    lineConnections = beatData.map((bd, index) => {
      const nextIndex = (index + 1) % subdivisions;
      const bd2 = beatData[nextIndex];
      const dx = bd2.xPos - bd.xPos;
      const dy = bd2.yPos - bd.yPos;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mx = (bd.xPos + bd2.xPos) / 2;
      const my = (bd.yPos + bd2.yPos) / 2;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      return (
        <div
          key={`line-${index}`}
          className="line-connection"
          style={{
            width: dist,
            left: `calc(50% + ${mx}px - ${dist / 2}px)`,
            top: `calc(50% + ${my}px)`,
            transform: `rotate(${angleDeg}deg)`
          }}
        />
      );
    });
  }

  useEffect(() => {
    if (logic && logic.audioCtx && logic.audioBuffers) {
      if (window.metronomeDebug) {
        window.metronomeDebug.audioBuffers = logic.audioBuffers;
        window.metronomeDebug.audioContext = logic.audioCtx;
      }
    }
  }, [logic]);

  // Listen for both soundSetReloadTrigger and soundSetChanged event
  useEffect(() => {
    if (logic && logic.audioCtx && soundSetReloadTrigger > 0) {
      if (logic.reloadSounds) {
        console.log("Reloading sounds due to soundSetReloadTrigger change");
        logic
          .reloadSounds()
          .then((success) => {
            if (success) {
              console.log("Successfully reloaded sound buffers");
            } else {
              console.error("Failed to reload sound buffers");
            }
          })
          .catch((err) => {
            console.error("Error reloading sounds:", err);
          });
      }
    }
  }, [soundSetReloadTrigger, logic]);

  // Add event listeners for global events
  useEffect(() => {
    const handleSoundSetChanged = (event) => {
      // Only reload if we have the necessary logic methods
      if (logic && logic.reloadSounds) {
        const soundSetId = event.detail?.soundSetId;
        console.log(`Sound set changed event received (ID: ${soundSetId}), reloading sounds immediately`);
        
        // Always reload sounds regardless of playing status
        logic
          .reloadSounds()
          .then((success) => {
            if (success) {
              console.log("Successfully reloaded sound buffers after sound set change");
            } else {
              console.error("Failed to reload sound buffers after sound set change");
            }
          })
          .catch((err) => {
            console.error("Error reloading sounds after sound set change:", err);
          });
      }
    };
    
    const handleSettingsApplied = (event) => {
      // Force immediate sound reload if we're playing
      if (!isPaused && logic && logic.reloadSounds) {
        console.log("Settings applied while playing, forcing immediate sound reload");
        logic.reloadSounds()
          .then(success => {
            if (success) {
              console.log("Successfully reloaded sound buffers while playing");
            }
          })
          .catch(err => {
            console.error("Error reloading sounds while playing:", err);
          });
      }
    };
    
    // Listen for global play/pause toggle events (from keyboard shortcuts)
    const handleGlobalPlayPause = (event) => {
      console.log("[AdvancedMetronome] Received global play/pause event");
      handlePlayPause().catch(err => {
        console.error("[AdvancedMetronome] Error in global play/pause handler:", err);
      });
    };
    
    window.addEventListener('soundSetChanged', handleSoundSetChanged);
    window.addEventListener('metronome-settings-applied', handleSettingsApplied);
    window.addEventListener('metronome-toggle-play', handleGlobalPlayPause);
    
    // Make handlePlayPause globally available for other components
    window.handleGlobalPlayPause = () => {
      console.log("[AdvancedMetronome] Global play/pause function called");
      handlePlayPause().catch(err => {
        console.error("[AdvancedMetronome] Error in global play handler:", err);
      });
    };
    
    return () => {
      window.removeEventListener('soundSetChanged', handleSoundSetChanged);
      window.removeEventListener('metronome-settings-applied', handleSettingsApplied);
      window.removeEventListener('metronome-toggle-play', handleGlobalPlayPause);
      if (window.handleGlobalPlayPause === handlePlayPause) {
        window.handleGlobalPlayPause = null;
      }
    };
  }, [logic, isPaused, handlePlayPause]);

  useEffect(() => {
    const handlePreviewSound = (event) => {
      const { type, volume } = event.detail;
      if (!logic.audioCtx) return;
      if (!logic.audioBuffers) return;
      let bufferKey;
      switch (type) {
        case "first":
          bufferKey = "first";
          break;
        case "accent":
          bufferKey = "accent";
          break;
        case "normal":
          bufferKey = "normal";
          break;
        default:
          return;
      }
      if (logic.audioBuffers[bufferKey]) {
        if (logic.audioCtx.state === "suspended") {
          logic.audioCtx.resume();
        }
        const source = logic.audioCtx.createBufferSource();
        source.buffer = logic.audioBuffers[bufferKey];
        const gainNode = logic.audioCtx.createGain();
        gainNode.gain.value = volume || 1.0;
        source.connect(gainNode);
        gainNode.connect(logic.audioCtx.destination);
        source.start(0);
      }
    };

    const handlePreviewPattern = (event) => {
      const { volume } = event.detail;
      if (!logic.audioCtx) return;
      if (!logic.audioBuffers) return;
      if (!logic.audioBuffers.first || !logic.audioBuffers.normal || !logic.audioBuffers.accent) {
        return;
      }
      if (logic.audioCtx.state === "suspended") {
        logic.audioCtx.resume();
      }
      const beatDuration = 60 / 120;
      const types = ["first", "normal", "normal", "accent"];
      types.forEach((type, index) => {
        setTimeout(() => {
          const source = logic.audioCtx.createBufferSource();
          source.buffer = logic.audioBuffers[type];
          const gainNode = logic.audioCtx.createGain();
          gainNode.gain.value = volume || 1.0;
          source.connect(gainNode);
          gainNode.connect(logic.audioCtx.destination);
          source.start(0);
        }, index * beatDuration * 1000);
      });
    };

    window.addEventListener("metronome-preview-sound", handlePreviewSound);
    window.addEventListener("metronome-preview-pattern", handlePreviewPattern);

    return () => {
      window.removeEventListener("metronome-preview-sound", handlePreviewSound);
      window.removeEventListener("metronome-preview-pattern", handlePreviewPattern);
    };
  }, [logic]);

  const beatStateLabels = ["Muted", "Normal", "Accent", "First beat"];
  const markStates = ["muted", "normal", "accent", "first"];

  return (
    <div className={analogMode ? "analog-visual" : "beat-visual"}>
      <div className="viz-card" ref={vizRef}>
        <div
          className="metronome-container"
          style={{
            width: analogBox ? analogBox.width : containerSize,
            height: analogBox ? analogBox.height : containerSize
          }}
        >
          {analogMode ? (
            analogBox && (
              <AnalogMetronomeCanvas
                width={analogBox.width}
                height={analogBox.height}
                isPaused={isPaused}
                tempo={tempo}
                beatMultiplier={currentBeatMultiplier}
              />
            )
          ) : (
            vizReady && (
              <>
                <svg className="dial-ticks" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
                  {Array.from({ length: 60 }, (_, i) => (
                    <line
                      key={i}
                      className={i % 5 === 0 ? 'is-major' : undefined}
                      x1="0" x2="0"
                      y1={i % 5 === 0 ? -49 : -49}
                      y2={i % 5 === 0 ? -45.5 : -47}
                      transform={`rotate(${i * 6})`}
                    />
                  ))}
                </svg>
                {lineConnections}
                {beatData.map((bd) => {
                  const state = effectiveAccents[bd.i];
                  const isActive = bd.i === logic.currentSubdivision && !isPaused;
                  return (
                    <button
                      type="button"
                      key={bd.i}
                      className={`beat-control ${state === 0 ? 'is-muted' : ''} ${isActive ? 'is-current' : ''}`}
                      onClick={() => effectiveToggleAccent(bd.i)}
                      aria-label={`Beat ${bd.i + 1}: ${state === 0 ? 'muted' : beatStateLabels[state]}. Activate to change accent.`}
                      aria-pressed={state === 2 || state === 3}
                      style={{
                        left: `calc(50% + ${bd.xPos}px - 22px)`,
                        top: `calc(50% + ${bd.yPos}px - 22px)`
                      }}
                    >
                      <span className="beat-mark" data-state={markStates[state] || 'normal'} aria-hidden="true" />
                    </button>
                  );
                })}
              </>
            )
          )}
        </div>
      </div>

      <AccelerateButton onClick={handleAccelerate} speedMode={speedMode} />

      <div className="transport-row">
        <TransportButton
          kind="play"
          label={isPaused ? "Start" : "Pause"}
          onClick={handlePlayPause}
          pressed={!isPaused}
          className="play-pause-button"
        />
        <TransportButton
          kind="tap"
          label="Tap Tempo"
          feedbackVolume={volume}
          className="tap-button"
          onClick={() => {
            const currentLogic = logicRef.current;
            if (currentLogic && typeof currentLogic.tapTempo === "function") {
              currentLogic.tapTempo();
            } else if (window.tapTempoRef && typeof window.tapTempoRef.current === 'function') {
              window.tapTempoRef.current();
            } else if (window.handleGlobalTapTempo) {
              window.handleGlobalTapTempo();
            } else {
              window.dispatchEvent(
                new CustomEvent("metronome-tap-tempo", {
                  detail: { timestamp: performance.now() }
                })
              );
            }
          }}
        />
      </div>
    </div>
  );
}

export default withTrainingContainer(AdvancedMetronomeWithCircle);
