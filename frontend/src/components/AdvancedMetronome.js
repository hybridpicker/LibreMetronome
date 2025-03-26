import React, { useState, useEffect, useRef, useCallback } from "react";
import useMetronomeLogic from "../hooks/useMetronomeLogic";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

import firstBeat from "../assets/svg/firstBeat.svg";
import firstBeatActive from "../assets/svg/firstBeatActive.svg";
import normalBeat from "../assets/svg/normalBeat.svg";
import normalBeatActive from "../assets/svg/normalBeatActive.svg";
import accentedBeat from "../assets/svg/accentedBeat.svg";
import accentedBeatActive from "../assets/svg/accentedBeatActive.svg";

import playIcon from "../assets/svg/play.svg";
import pauseIcon from "../assets/svg/pause.svg";
import tapButtonIcon from "../assets/svg/tap-button.svg";

import AnalogMetronomeCanvas from "./metronome/AnalogMode/AnalogMetronomeCanvas";
import withTrainingContainer from "./Training/withTrainingContainer";
import AccelerateButton from "./metronome/Controls/AccelerateButton";
import { manualTempoAcceleration } from "../hooks/useMetronomeLogic/trainingLogic";

// Unused imports removed

import "./AdvancedMetronome.css";

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

  const [pulseStates, setPulseStates] = useState(() =>
    new Array(subdivisions).fill(false)
  );

  const handleSubTriggered = useCallback(
    (subIndex) => {
      setPulseStates((prev) => {
        const arr = [...prev];
        arr[subIndex] = true;
        return arr;
      });
      setTimeout(() => {
        setPulseStates((prev) => {
          const arr = [...prev];
          arr[subIndex] = false;
          return arr;
        });
      }, 200);
    },
    []
  );

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
    beatMultiplier: currentBeatMultiplier,
    onAnySubTrigger: handleSubTriggered
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

  useKeyboardShortcuts({
    onTogglePlayPause: () => handlePlayPause(),
    onTapTempo: () => {
      if (logic && logic.tapTempo) {
        console.log("[AdvancedMetronome] Using logic.tapTempo from keyboard shortcut");
        logic.tapTempo();
      }
    },
    onManualTempoIncrease: handleAccelerate
  });

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

  const getContainerSize = () => {
    const w = window.innerWidth;
    if (w < 600) return Math.min(w - 40, 300);
    if (w < 1024) return Math.min(w - 40, 400);
    return 300;
  };

  const [containerSize, setContainerSize] = useState(getContainerSize());
  useEffect(() => {
    const handleResize = () => setContainerSize(getContainerSize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
            height: 1,
            backgroundColor: "#00A0A0",
            position: "absolute",
            pointerEvents: "none",
            left: `calc(50% + ${mx}px - ${dist / 2}px)`,
            top: `calc(50% + ${my}px)`,
            transform: `rotate(${angleDeg}deg)`,
            transformOrigin: "center center",
            boxShadow: "0 0 3px rgba(0,160,160,0.6)",
            transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
          }}
        />
      );
    });
  }

  // isMobile variable removed as it's unused
  useEffect(() => {
    const handleResize = () => {
      // Resize handler kept for potential future use 
      // but without the unused state update
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  return (
    <div style={{ position: "relative", textAlign: "center" }}>
      <div
        className="metronome-container"
        style={{
          position: "relative",
          width: containerSize,
          height: containerSize,
          margin: "0 auto"
        }}
      >
        {analogMode ? (
          <AnalogMetronomeCanvas
            width={containerSize}
            height={containerSize}
            isPaused={isPaused}
            tempo={tempo}
            audioCtxCurrentTime={() => logic.audioCtx?.currentTime || 0}
            currentSubIndex={logic.currentSubdivision}
            beatMultiplier={currentBeatMultiplier}
          />
        ) : (
          <>
            {lineConnections}
            {beatData.map((bd) => {
              const state = effectiveAccents[bd.i];
              const isActive = bd.i === logic.currentSubdivision && !isPaused;
              const isPulsing = pulseStates[bd.i];

              if (state === 0) {
                return (
                  <div
                    key={bd.i}
                    onClick={() => effectiveToggleAccent(bd.i)}
                    style={{
                      position: "absolute",
                      left: `calc(50% + ${bd.xPos}px - 12px)`,
                      top: `calc(50% + ${bd.yPos}px - 12px)`,
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: "2px dashed #ccc",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "#ccc",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
                    }}
                  >
                    +
                  </div>
                );
              }

              let icon;
              switch (state) {
                case 1:
                  icon = isActive ? normalBeatActive : normalBeat;
                  break;
                case 2:
                  icon = isActive ? accentedBeatActive : accentedBeat;
                  break;
                case 3:
                  icon = isActive ? firstBeatActive : firstBeat;
                  break;
                default:
                  icon = isActive ? normalBeatActive : normalBeat;
              }

              // Determine beat type for special accessibility handling
              const beatType = state === 3 ? "first" : state === 2 ? "accent" : "normal";
              
              return (
                <div 
                  key={bd.i}
                  className={`beat-container beat-type-${beatType}`}
                  data-beat-type={beatType}
                  onClick={() => effectiveToggleAccent(bd.i)}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${bd.xPos}px - 12px)`,
                    top: `calc(50% + ${bd.yPos}px - 12px)`,
                    width: "24px",
                    height: "24px",
                    cursor: "pointer"
                  }}
                >
                  <img
                    src={icon}
                    alt={`Beat ${bd.i} (${beatType})`}
                    className="beat-icon"
                    data-beat-type={beatType}
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "relative",
                      transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
                      filter: isActive
                        ? "drop-shadow(0 0 5px rgba(248, 211, 141, 0.8))"
                        : "none",
                      transform: isActive ? "scale(1.05)" : "scale(1)",
                      animation: isPulsing ? "pulse-beat 0.2s ease-out" : "none"
                    }}
                  />
                  {/* Add visual indicators for color blind mode */}
                  <div 
                    className="color-blind-indicator"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      pointerEvents: "none",
                      zIndex: 2,
                      // These indicators will only be visible in color blind mode
                      // due to the CSS rules in color-blindness.css
                      fontSize: beatType === "first" ? "12px" : "10px",
                      fontWeight: "bold",
                      color: "white",
                      textShadow: "0 0 2px black"
                    }}
                  >
                    {beatType === "first" ? "1" : beatType === "accent" ? "•" : ""}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Accelerate Button positioned directly after the metronome canvas */}
      <AccelerateButton onClick={handleAccelerate} speedMode={speedMode} />

      {/* Play/Pause Button */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={handlePlayPause}
          className="play-pause-button"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "10px"
          }}
          aria-label="Toggle play/pause"
        >
          <img
            src={isPaused ? playIcon : pauseIcon}
            alt={isPaused ? "Play" : "Pause"}
            className="play-pause-icon"
            style={{ width: 40, height: 40 }}
          />
        </button>
      </div>

      {/* Tap Tempo button */}
      <button
        onClick={() => {
          console.log("[AdvancedMetronome] Tap button clicked");
          
          // Try multiple approaches to handle tap tempo
          const currentLogic = logicRef.current;
          
          if (currentLogic && typeof currentLogic.tapTempo === "function") {
            console.log("[AdvancedMetronome] Using current logic tapTempo");
            currentLogic.tapTempo();
          } else if (window.tapTempoRef && typeof window.tapTempoRef.current === 'function') {
            console.log("[AdvancedMetronome] Using window.tapTempoRef.current");
            window.tapTempoRef.current();
          } else if (window.handleGlobalTapTempo) {
            console.log("[AdvancedMetronome] Using window.handleGlobalTapTempo");
            window.handleGlobalTapTempo();
          } else {
            console.log("[AdvancedMetronome] No handler found, dispatching event");
            const now = performance.now();
            window.dispatchEvent(
              new CustomEvent("metronome-tap-tempo", {
                detail: { timestamp: now }
              })
            );
          }
        }}
        aria-label="Tap Tempo"
        className="tap-button"
      >
        <img src={tapButtonIcon} alt="Tap Tempo" />
      </button>

      {!analogMode && (
        <div
          style={{
            marginTop: "15px",
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            flexWrap: "wrap",
            fontSize: "12px",
            color: "#666"
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: "#e8e8e8",
                borderRadius: "50%",
                marginRight: "5px",
                border: "1px solid #ddd"
              }}
            ></div>
            Mute
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: "#fce9c6",
                borderRadius: "50%",
                marginRight: "5px",
                border: "1px solid #ddd"
              }}
            ></div>
            Normal Beat
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: "#f6cc7c",
                borderRadius: "50%",
                marginRight: "5px",
                border: "1px solid #ddd"
              }}
            ></div>
            Accent
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: "#00a0a0",
                borderRadius: "50%",
                marginRight: "5px",
                border: "1px solid #ddd"
              }}
            ></div>
            First Beat
          </div>
        </div>
      )}
    </div>
  );
}

export default withTrainingContainer(AdvancedMetronomeWithCircle);
