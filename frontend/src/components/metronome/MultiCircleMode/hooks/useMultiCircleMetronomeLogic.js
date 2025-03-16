// src/components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic.js - with all fixes
import { useEffect, useRef, useState, useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../../hooks/useMetronomeLogic/audioBuffers';
import { useMetronomeRefs } from '../../../../hooks/useMetronomeLogic/references';
import { createTapTempoLogic } from '../../../../hooks/useMetronomeLogic/tapTempo';
import { 
  runScheduler, 
  scheduleSubdivision 
} from '../../../../hooks/useMetronomeLogic/scheduler';
import { handleMeasureBoundary, shouldMuteThisBeat } from '../../../../hooks/useMetronomeLogic/trainingLogic';
import { getActiveSoundSet } from '../../../../services/soundSetService';

/**
 * A specialized version of useMetronomeLogic for Multi Circle Mode
 * Prioritizes precise timing above all else
 */
export default function useMultiCircleMetronomeLogic({
  tempo,
  setTempo,
  subdivisions,
  setSubdivisions,
  isPaused,
  setIsPaused,
  swing,
  volume,
  accents = [],
  analogMode = false,
  gridMode = false,
  macroMode = 0,
  speedMode = 0,
  measuresUntilMute = 2,
  muteDurationMeasures = 1,
  muteProbability = 0.3,
  tempoIncreasePercent = 5,
  measuresUntilSpeedUp = 2,
  beatMode = "quarter", // The active circle's beat mode
  onAnySubTrigger = null,
  circleSettings = [], // Array of all circle settings
  playingCircle = 0, // Index of currently playing circle
  onCircleChange = null // New callback to sync UI when circle changes
}) {
  const nextCircleFor3CircleCase = useCallback((currentIndex) => {
    // Ensure circleSettings is defined and non-empty
    if (!circleSettings || circleSettings.length === 0) return 0;
    
    // CRITICAL FIX: Special handling for exactly 2 circles
    if (circleSettings.length === 2) {
      // For two circles: 0->1->0->1 alternation pattern
      const nextIndex = currentIndex === 0 ? 1 : 0;
      console.log(`[2-CIRCLE] Force strict alternation: ${currentIndex} -> ${nextIndex}`);
      return nextIndex;
    }
    
    // Special handling for exactly 3 circles
    if (circleSettings.length === 3) {
      console.log(`[3-CIRCLE] Computing next circle from ${currentIndex}`);
      let nextIndex;
      switch (currentIndex) {
        case 0:
          nextIndex = 1;
          break;
        case 1:
          nextIndex = 2;
          break;
        case 2:
          nextIndex = 0;
          break;
        default:
          nextIndex = 0;
      }
      console.log(`[3-CIRCLE] Explicit transition: ${currentIndex} -> ${nextIndex}`);
      return nextIndex;
    }
    
    // Standard calculation for other cases
    return (currentIndex + 1) % circleSettings.length;
  }, [circleSettings]);
  
  const playStartTimeRef = useRef(0);

  // Track current and next circle data for smooth transitions
  const circleTransitionRef = useRef({
    isTransitioning: false,
    fromCircle: 0,
    toCircle: 0,
    nextCircleScheduled: false,
    lastBeatTime: 0,
    transitionStartTime: 0,
    transitionLockout: false,
    measureCompleted: false,
    alreadySwitched: false
  });
  
  // For calculating correct beat timing during transition
  const beatTimingRef = useRef({
    lastQuarterNote: 0,
    measureStartTime: 0
  });
  
  // Track if we've completed a full cycle of all circles
  const fullCycleCompletedRef = useRef(false);
  
  // Get the basic refs from useMetronomeRefs
  const {
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    currentSubRef,
    nextNoteTimeRef,
    lookaheadRef,
    nodeRefs,
    playedBeatTimesRef,
    schedulerRunningRef,
    currentSubStartRef,
    currentSubIntervalRef,
    actualBpm, setActualBpm
  } = useMetronomeRefs();

  // Create our own refs for values not provided by useMetronomeRefs
  const tempoRef = useRef(tempo);
  const swingRef = useRef(swing);
  const volumeRef = useRef(volume);
  const accentsRef = useRef(accents);
  
  // For training mode refs
  const measureCountRef = useRef(0);
  const muteMeasureCountRef = useRef(0);
  const isSilencePhaseRef = useRef(false);
  const lastTempoIncreaseTimeRef = useRef(0);

  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Additional specialized refs for multi-circle
  const subdivisionsRef = useRef(subdivisions);
  const lastBeatTimeRef = useRef(0);

   // Keep local copies of changing values in refs
   const playingCircleRef = useRef(playingCircle);
   const isFirstMeasurePlayedRef = useRef(false);
   const minBeatsBeforeTransitionRef = useRef(0);
   const hasPlayedEnoughRef = useRef(false);
  
  const safelyInitAudioContext = useCallback(async () => {
    try {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        if (audioCtxRef.current.state === 'suspended') {
          try {
            await audioCtxRef.current.resume();
            console.log('[AUDIO] Successfully resumed existing AudioContext');
            return audioCtxRef.current;
          } catch (err) {
            console.log('[AUDIO] Could not resume AudioContext, will create new one:', err);
          }
        } else {
          console.log('[AUDIO] Using existing running AudioContext');
          return audioCtxRef.current;
        }
      }
      console.log('[AUDIO] Creating new AudioContext');
      const newCtx = initAudioContext();
      if (!newCtx) {
        throw new Error('Failed to create AudioContext');
      }
      audioCtxRef.current = newCtx;
      try {
        const soundSet = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
        console.log('[AUDIO] Successfully loaded sound set');
      } catch (error) {
        console.log('[AUDIO] Loading default sound set');
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
      }
      return audioCtxRef.current;
    } catch (err) {
      console.error('[AUDIO] Fatal error initializing audio:', err);
      return null;
    }
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);
  
  const isAudioReady = useCallback(() => {
    return audioCtxRef.current &&
           audioCtxRef.current.state === 'running' &&
           normalBufferRef.current &&
           accentBufferRef.current &&
           firstBufferRef.current;
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);
  
  const transitionBlockCountRef = useRef(0);
  const hasCompletedFirstMeasureRef = useRef(false);

  // Fix: Add debug logging for initialization
  useEffect(() => {
    console.log("MultiCircleLogic initialized with settings:", {
      tempo,
      subdivisions,
      playingCircle,
      beatMode,
      circleSettings
    });
  }, []);

  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { playingCircleRef.current = playingCircle; }, [playingCircle]);
  useEffect(() => { subdivisionsRef.current = subdivisions; }, [subdivisions]);

  useEffect(() => { 
    // Update accents array for different beat counts
    accentsRef.current = accents; 
  }, [accents]);

  useEffect(() => { 
    // CRITICAL FIX: When changing circles, ensure we update our internal references
    console.log(`[MultiCircleLogic] Circle changed from ${playingCircleRef.current} to ${playingCircle}`);
    playingCircleRef.current = playingCircle;
    
    // Update subdivisions based on the currently playing circle's settings
    const currentCircleData = circleSettings[playingCircle];
    if (currentCircleData) {
      // Use the exact subdivision value from the current circle
      const exactSubdivisions = currentCircleData.subdivisions || 4;
      
      console.log(`[MultiCircleLogic] Updating subdivisions: exact=${exactSubdivisions}`);
      subdivisionsRef.current = exactSubdivisions;
    } else {
      subdivisionsRef.current = 4; // Default to 4
      console.log("[MultiCircleLogic] Warning: No circle data found, defaulting to 4 subdivisions");
    }
    
    // CRITICAL: Update accents array for the new circle
    if (circleSettings[playingCircle] && circleSettings[playingCircle].subdivisions) {
      // IMPORTANT: We need to make a deep copy to ensure independence between circles
      let newAccents = [];
      
      // Get the current accent pattern from the newly selected circle's settings
      if (circleSettings[playingCircle].accents && circleSettings[playingCircle].accents.length > 0) {
        // Make a deep copy of the accents array to prevent cross-circle mutation
        newAccents = [...circleSettings[playingCircle].accents];
      } else {
        // Default accent pattern if none exists
        newAccents = new Array(circleSettings[playingCircle].subdivisions).fill(1);
      }
      
      // Log the old accent pattern and the new one for debugging
      console.log(`[MultiCircleLogic] CIRCLE CHANGE: Changing accents for circle ${playingCircle}:`, 
                 `Old: ${accentsRef.current ? accentsRef.current.join(',') : 'none'}`, 
                 `New: ${newAccents.join(',')}`);
      
      // Set the accent pattern for the scheduler
      accentsRef.current = newAccents;
    }
  }, [playingCircle, circleSettings, playingCircleRef, subdivisionsRef]);

  // Derive beatMultiplier from beatMode (1 for quarter, 2 for eighth)
  const getBeatMultiplier = useCallback(() => {
    const currentCircleIndex = playingCircleRef.current;
    const currentBeatMode = circleSettings[currentCircleIndex]?.beatMode;
    const multiplier = currentBeatMode === "eighth" ? 2 : 1;
    console.log(`[MultiCircleLogic] getBeatMultiplier: circle=${currentCircleIndex}, beatMode=${currentBeatMode}, multiplier=${multiplier}`);
    return multiplier;
  }, [circleSettings, playingCircleRef]);

  // Initialize audio context
  useEffect(() => {
    const audioCtx = initAudioContext();
    audioCtxRef.current = audioCtx;

    // Fetch the active sound set from the API and load it
    const loadSounds = async () => {
      try {
        // Get the active sound set from the API
        const soundSet = await getActiveSoundSet();
        console.log('MultiCircleMetronome: Loaded sound set from API:', soundSet);
        
        // Load the sound buffers with the sound set
        await loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
        console.log("Sound buffers loaded successfully");
      } catch (error) {
        console.error('MultiCircleMetronome: Failed to load sound set from API:', error);
        // Fallback to default sounds if the API call fails
        try {
          await loadClickBuffers({
            audioCtx,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef
          });
          console.log("Fallback sound buffers loaded");
        } catch (err) {
          console.error("Failed to load fallback sounds:", err);
        }
      }
    };

    loadSounds();

    return () => {
      stopScheduler();
    };
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);

  // Define the stopScheduler function first, before any references to it
  const stopScheduler = useCallback(() => {
    // Clear the scheduling interval first
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    
    // Reset running state immediately to prevent more scheduling
    schedulerRunningRef.current = false;
    isFirstMeasurePlayedRef.current = false;
    
    // Stop and disconnect all active audio nodes
    if (nodeRefs.current && nodeRefs.current.length > 0) {
      const nodesToCleanup = [...nodeRefs.current];
      nodeRefs.current = []; // Clear references immediately
      
      nodesToCleanup.forEach(node => {
        try {
          if (node.stop) node.stop(0);
          if (node.disconnect) node.disconnect();
        } catch (e) {
          // Silently ignore errors when cleaning up nodes
        }
      });
    }
    
    // Reset timing references
    nextNoteTimeRef.current = 0;
    currentSubRef.current = 0;
    playedBeatTimesRef.current = [];
    
    // Reset transition state
    circleTransitionRef.current.isTransitioning = false;
    circleTransitionRef.current.nextCircleScheduled = false;
    circleTransitionRef.current.measureCompleted = false;
    circleTransitionRef.current.alreadySwitched = false;
    
    // Update visual state
    setCurrentSubdivision(0);
  }, [lookaheadRef, nextNoteTimeRef, currentSubRef, playedBeatTimesRef, nodeRefs, schedulerRunningRef]);

  // Update effect to clean up resources
  useEffect(() => {
    // Load click sound samples when component mounts
    async function loadSounds() {
      try {
        // Check if we need to initialize audio context
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = initAudioContext();
          console.log('[MultiCircleLogic] Created new AudioContext');
        }
        
        // Load sound buffers
        const soundSet = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
        console.log('[MultiCircleLogic] Sound buffers loaded');
      } catch (error) {
        console.log('[MultiCircleLogic] Error loading sounds, using defaults');
        if (audioCtxRef.current) {
          await loadClickBuffers({
            audioCtx: audioCtxRef.current,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef
          });
        }
      }
    }
    
    loadSounds();
    
    // Clean up function
    return () => {
      stopScheduler();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (e) {
          console.log("[MultiCircleLogic] Error closing AudioContext", e);
        }
      }
    };
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef, stopScheduler]);

  // Calculate the interval between beats, using dynamic beatMultiplier from beatMode
  const getCurrentSubIntervalSec = useCallback((subIndex) => {
    const localTempo = tempoRef.current;
    if (!localTempo) return 0.5;
    
    // Get the beat mode multiplier (1 for quarter, 2 for eighth)
    const beatMultiplier = getBeatMultiplier();
    
    // Standard calculation for quarter note duration at the given tempo
    // In standard metronome behavior, BPM directly corresponds to quarter notes
    const quarterNoteDuration = 60 / localTempo;
    
    // In quarter note mode, one subdivision equals one quarter note
    // In eighth note mode, one subdivision equals one eighth note (half as long)
    const basicBeatDuration = quarterNoteDuration / beatMultiplier;
    
    // For subdivisions, we need to divide the beat duration by the number of subdivisions per beat
    const totalSubs = subdivisionsRef.current;
    
    // In a standard 4/4 measure with quarter notes:
    // - Each beat is one quarter note
    // - If subdivisions = 4, we play one note per beat (4 notes per measure)
    // - If subdivisions = 8, we play two notes per beat (8 notes per measure)
    const subDivisionDuration = basicBeatDuration;
    
    // Handle swing timing if needed
    const sFactor = swingRef.current || 0;
    if (totalSubs >= 2 && sFactor > 0) {
      const isEvenSub = (subIndex % 2 === 0);
      return isEvenSub
        ? subDivisionDuration * (1 + sFactor)
        : subDivisionDuration * (1 - sFactor);
    }
    return subDivisionDuration;
  }, [getBeatMultiplier, tempoRef, swingRef, subdivisionsRef]);

  // Prepare circle transition - called when we detect we need to switch circles
  const prepareCircleTransition = useCallback((fromCircle, toCircle) => {
    const now = audioCtxRef.current?.currentTime || 0;
    
    // FIXED: Ensure we don't skip any circles in sequence
    const expectedNextCircle = (fromCircle + 1) % circleSettings.length;
    if (toCircle !== expectedNextCircle) {
      console.log(`[FIXED SEQUENCE] Correcting requested transition: wanted ${fromCircle}->${toCircle}, forcing ${fromCircle}->${expectedNextCircle}`);
      toCircle = expectedNextCircle;
    }
    
    // Prevent rapid transitions (must wait at least 500ms between transitions)
    if (circleTransitionRef.current.transitionLockout) {
      console.log(`[MultiCircleLogic] Transition blocked - lockout active`);
      return false;
    }
    
    // If we're already transitioning to this circle and the measure is completed, don't transition again
    if (circleTransitionRef.current.isTransitioning && 
        circleTransitionRef.current.toCircle === toCircle && 
        circleTransitionRef.current.measureCompleted &&
        circleTransitionRef.current.alreadySwitched) {
      console.log(`[MultiCircleLogic] Transition already in progress to circle ${toCircle} and measure completed`);
      return false;
    }
    
    // FIXED: Add logging about proper sequencing
    console.log(`[SEQUENCE] Preparing sequential transition ${fromCircle} -> ${toCircle} (of ${circleSettings.length} circles)`);
    
    // Set transition state
    circleTransitionRef.current = {
      isTransitioning: true,
      fromCircle,
      toCircle,
      nextCircleScheduled: false,
      lastBeatTime: now,
      transitionStartTime: now,
      transitionLockout: true,
      measureCompleted: false,
      alreadySwitched: false
    };
    
    console.log(`[MultiCircleLogic] Preparing transition from circle ${fromCircle} to ${toCircle}`);
    console.log(`[MultiCircleLogic] Beat mode changing from ${circleSettings[fromCircle]?.beatMode} to ${circleSettings[toCircle]?.beatMode}`);
    
    // Set a timeout to release the transition lockout
    setTimeout(() => {
      circleTransitionRef.current.transitionLockout = false;
    }, 500);
    
    return true;
  }, [circleSettings, audioCtxRef, circleTransitionRef]);

  // Add back the updateActualBpm function
  const updateActualBpm = useCallback(() => {
    const arr = playedBeatTimesRef.current;
    const MAX_BEATS = 16;
    if (arr.length > MAX_BEATS) {
      arr.shift();
    }
    if (arr.length < 2) return;
    
    let totalDiff = 0;
    for (let i = 1; i < arr.length; i++) {
      totalDiff += arr[i] - arr[i - 1];
    }
    const avgDiff = totalDiff / (arr.length - 1);
    const newBpm = 60000 / avgDiff;
    setActualBpm(newBpm);
  }, [playedBeatTimesRef, setActualBpm]);

  // Schedule subdivision function that handles transitions smoothly
  const scheduleSubFn = useCallback((subIndex, when) => {
    // Store the last beat time for stability
    lastBeatTimeRef.current = when;
    
    // For debugging - log every beat with its timing information
    const currentCircleIndex = playingCircleRef.current;
    const currentBeatMode = circleSettings[currentCircleIndex]?.beatMode;
    const totalSubs = subdivisionsRef.current;
    
    // Remove the critical fix that was forcing first beats audible
    // Now all beats can be muted, including first beats in all circles
    
    if (subIndex === 0) {
      // Increment beat counter for initial stabilization period
      minBeatsBeforeTransitionRef.current++;
      const elapsedTime = Date.now() - playStartTimeRef.current;

      // CRITICAL FIX: For 2-circle mode, we want IMMEDIATE alternation 0-1-0-1
      const isTwoCircles = circleSettings.length === 2;
      
      if (isTwoCircles) {
        // TWO CIRCLE MODE: Enable transitions immediately for 2 circles
        // Force alternating pattern without blocking
        hasPlayedEnoughRef.current = true;
        
        // Force correct alternating sequence for 2 circles
        // Critical fix: First beat (1) is circle 0, second beat (2) is circle 1, and so on
        // We subtract 1 from minBeatsBeforeTransitionRef.current because it starts at 1, not 0
        // (1-1)%2=0, (2-1)%2=1, (3-1)%2=0, (4-1)%2=1, etc.
        const beatIndex = minBeatsBeforeTransitionRef.current - 1;
        const shouldBeCircle = beatIndex % 2;
        console.log(`[TWOCIRCLE] Beat ${minBeatsBeforeTransitionRef.current} (index ${beatIndex}) - should be circle ${shouldBeCircle}`);
        
        // Force transition to the correct circle on every beat
        if (playingCircleRef.current !== shouldBeCircle) {
          console.log(`[TWOCIRCLE] ⚠️ Correcting circle from ${playingCircleRef.current} to ${shouldBeCircle}`);
          playingCircleRef.current = shouldBeCircle;
          if (onCircleChange) onCircleChange(shouldBeCircle);
        }
      } else {
        // Normal case for 3+ circles - use standard stabilization period
        const MIN_BEATS = 4;
        const MIN_TIME_MS = 1000; // 1 second minimum time
        
        // Block transitions until minimum beats and time
        if ((minBeatsBeforeTransitionRef.current < MIN_BEATS || elapsedTime < MIN_TIME_MS) && 
            playingCircleRef.current === 0) {
          console.log(`[FIXED] Blocking transitions - beats: ${minBeatsBeforeTransitionRef.current}/${MIN_BEATS}, time: ${Math.round(elapsedTime/1000)}s/${MIN_TIME_MS/1000}s`);
          hasPlayedEnoughRef.current = false;
        } else {
          hasPlayedEnoughRef.current = true;
          console.log(`[FIXED] Enabling transitions - beat count threshold reached (${circleSettings.length} circles total)`);
        }
      }
      
      if (!hasPlayedEnoughRef.current) {
        if (playingCircleRef.current !== 0) {
          console.log(`[FIXED] Forcing back to circle 0 during initial measures`);
          playingCircleRef.current = 0;
          if (onCircleChange) {
            onCircleChange(0);
          }
        }
        // Skip auto-transition logic
      } else {
        if (circleSettings.length > 1) {
          const totalCircles = circleSettings.length;
          const nextCircleIndex = totalCircles === 3
            ? nextCircleFor3CircleCase(currentCircleIndex)
            : (currentCircleIndex + 1) % totalCircles;
          console.log(`[MultiCircleLogic] 🔄 Auto-transition triggered at start of measure: ${currentCircleIndex} -> ${nextCircleIndex}`);
          // Transition code will follow later in original block
        }
      }
      
      // First beat of measure
      beatTimingRef.current.measureStartTime = when;
      beatTimingRef.current.lastQuarterNote = when;
      
      // If we've already completed one measure of the current circle and we're still in transition
      if (circleTransitionRef.current.measureCompleted && 
          circleTransitionRef.current.isTransitioning && 
          !circleTransitionRef.current.alreadySwitched) {
        
        // Mark that we've already switched to prevent double switching
        circleTransitionRef.current.alreadySwitched = true;
        
        // Update the beat mode for the next circle
        const nextCircleIndex = circleTransitionRef.current.toCircle;
        if (circleSettings[nextCircleIndex]) {
          console.log(`[MultiCircleLogic] 🔄 TRANSITION COMPLETE: Now using beatMode=${circleSettings[nextCircleIndex].beatMode} for circle ${nextCircleIndex}`);
          
          // Reset transition state to allow future transitions
          circleTransitionRef.current.isTransitioning = false;
          circleTransitionRef.current.nextCircleScheduled = false;
          circleTransitionRef.current.measureCompleted = false;
          circleTransitionRef.current.alreadySwitched = false;
          console.log(`[MultiCircleLogic] 🏁 Transition state reset, ready for next transition`);
        }
      } 
      // If this is the first measure after a transition was requested, mark it as completed
      else if (circleTransitionRef.current.isTransitioning && !circleTransitionRef.current.measureCompleted) {
        circleTransitionRef.current.measureCompleted = true;
        console.log(`[MultiCircleLogic] ✓ First measure after transition request completed`);
      }
      // If we've already switched and completed the next measure, reset transition state
      else if (circleTransitionRef.current.isTransitioning && 
               circleTransitionRef.current.measureCompleted && 
               circleTransitionRef.current.alreadySwitched) {
        
        // Reset transition state completely after we've played the next circle for one measure
        circleTransitionRef.current.isTransitioning = false;
        circleTransitionRef.current.nextCircleScheduled = false;
        circleTransitionRef.current.measureCompleted = false;
        circleTransitionRef.current.alreadySwitched = false;
        console.log(`[MultiCircleLogic] 🏁 Transition state fully reset`);
      }
      
      // FIXED: Handle training mode measure boundaries properly
      if (!isPaused) {
        // Increment the measure counter
        measureCountRef.current++;
        
        console.log(`[MultiCircleLogic] [Training] Measure count: ${measureCountRef.current}/${measuresUntilSpeedUp}, speedMode=${speedMode}`);
        
        // Dispatch event for UI updates to ensure TrainingActiveContainer sees the updated count
        window.dispatchEvent(new CustomEvent('training-measure-update'));
        
        // Macro Timing Mode - Handle silence phase
        if (macroMode === 1) {
          if (!isSilencePhaseRef.current) {
            // Check if we should enter silence phase
            if (measureCountRef.current >= measuresUntilMute) {
              console.log(`[MultiCircleLogic] [Training] 🔇 STARTING SILENCE PHASE 🔇`);
              isSilencePhaseRef.current = true;
              muteMeasureCountRef.current = 0;
              
              // Make sure the global silence reference is updated
              window.isSilencePhaseRef = isSilencePhaseRef;
              
              // Notify UI
              window.dispatchEvent(new CustomEvent('training-measure-update'));
            }
          } else {
            // Already in silence phase, increment counter
            muteMeasureCountRef.current++;
            
            console.log(`[MultiCircleLogic] [Training] Silence phase: ${muteMeasureCountRef.current}/${muteDurationMeasures}`);
            
            // Check if we should exit silence phase
            if (muteMeasureCountRef.current >= muteDurationMeasures) {
              console.log(`[MultiCircleLogic] [Training] 🔊 ENDING SILENCE PHASE 🔊`);
              isSilencePhaseRef.current = false;
              window.isSilencePhaseRef = isSilencePhaseRef;
              muteMeasureCountRef.current = 0;
              measureCountRef.current = 0; // Reset measure count after silence ends
              
              // Notify UI
              window.dispatchEvent(new CustomEvent('training-measure-update'));
            }
          }
        }
        
        // Speed Training Mode - Handle auto tempo increase
        if (speedMode === 1 && !isSilencePhaseRef.current) {
          if (measureCountRef.current >= measuresUntilSpeedUp) {
            // Calculate new tempo with percentage increase
            const factor = 1 + tempoIncreasePercent / 100;
            const newTempo = Math.min(Math.round(tempoRef.current * factor), 240);
            
            // Only increase if it would change by at least 1 BPM
            if (newTempo > tempoRef.current) {
              console.log(`[MultiCircleLogic] ⏩ AUTO INCREASING TEMPO from ${tempoRef.current} to ${newTempo} BPM (${tempoIncreasePercent}%)`);
              
              // Set new tempo
              setTempo(newTempo);
              
              // Reset measure counter after tempo increase
              measureCountRef.current = 0;
              
              // Notify UI
              window.dispatchEvent(new CustomEvent('training-measure-update'));
            }
          }
        }
      }
      
      // Trigger auto-transition to the next circle
      const isTwoCircleCase = circleSettings.length === 2;
      
      // Handle 2-circle case specially for perfect alternation
      if (isTwoCircleCase) {
        // TWO CIRCLE MODE: Strict alternating pattern enforcement
        // CRITICAL FIX: For perfect alternation, odd beats (1,3,5...) are circle 0, even beats (2,4,6...) are circle 1
        // We subtract 1 from minBeatsBeforeTransitionRef.current to make beat 1 play on circle 0
        const beatIndex = minBeatsBeforeTransitionRef.current - 1;
        const shouldBeCircle = beatIndex % 2;
        
        if (playingCircleRef.current !== shouldBeCircle) {
          console.log(`[TWOCIRCLE] 🔄 Enforcing alternating pattern: circle ${shouldBeCircle} for beat ${minBeatsBeforeTransitionRef.current}`);
          
          // Update playing circle ref directly
          playingCircleRef.current = shouldBeCircle;
          
          // Call the onCircleChange callback to sync the UI
          if (onCircleChange) {
            console.log(`[TWOCIRCLE] Notifying UI of circle change to ${shouldBeCircle}`);
            onCircleChange(shouldBeCircle);
          }
        } else {
          console.log(`[TWOCIRCLE] ✓ Correct circle ${shouldBeCircle} for beat ${minBeatsBeforeTransitionRef.current}`);
        }
      }
      // Standard transition logic for 3+ circles
      else if (circleSettings.length > 1 && hasPlayedEnoughRef.current) {
        // FIXED: Always use sequential transitions, never skip circles
        // Force circle order: 0 -> 1 -> 2 -> 0 (for 3+ circles)
        const nextCircleIndex = (currentCircleIndex + 1) % circleSettings.length;
        
        // CHECK IF WE NEED TO COMPLETE ONE FULL CYCLE
        if (nextCircleIndex === 0 && currentCircleIndex === circleSettings.length - 1) {
          fullCycleCompletedRef.current = true;
          console.log(`[MULTICIRCLE] ✓ Completed full cycle of all ${circleSettings.length} circles`);
        }
        
        // For 3+ circles, log as sequential transition
        console.log(`[MultiCircleLogic] 🔄 Sequential transition: ${currentCircleIndex} -> ${nextCircleIndex} (of ${circleSettings.length} total circles)`);
        
        // FIXED: Better transition handling with guaranteed progression
        const success = prepareCircleTransition(currentCircleIndex, nextCircleIndex);
        
        if (success) {
          console.log(`[MULTICIRCLE] ✓ Successfully transitioning from circle ${currentCircleIndex} to ${nextCircleIndex} (total circles: ${circleSettings.length})`);
          
          // Update playing circle ref for the next measure
          playingCircleRef.current = nextCircleIndex;
          
          // Call the onCircleChange callback to sync the UI
          if (onCircleChange) {
            console.log(`[MULTICIRCLE] Notifying UI of circle change to ${nextCircleIndex}`);
            onCircleChange(nextCircleIndex);
          }
        } else {
          console.log(`[MULTICIRCLE] ✕ Transition preparation failed, remaining on circle ${currentCircleIndex}`);
        }
      }
    } else if (subIndex === totalSubs - 1) {
      // End of circle reached: deferring circle transition until beginning of next measure
      console.log('End of circle reached: deferring circle transition until beginning of next measure.');
      // The transition itself will happen on the next first beat
    }
    
    // Check mute status for training mode
    const muteThisBeat = shouldMuteThisBeat({
      macroMode,
      muteProbability,
      isSilencePhaseRef
    });

    // Fix: Always check if we have valid audio context and buffers
    if (!audioCtxRef.current || 
        !normalBufferRef.current || 
        !accentBufferRef.current || 
        !firstBufferRef.current) {
      console.warn("Missing audio context or buffers, can't schedule subdivision");
      return;
    }

    // We always schedule the beat to maintain precise timing
    scheduleSubdivision({
      subIndex,
      when,
      audioCtx: audioCtxRef.current,
      analogMode,
      gridMode,
      multiCircleMode: true,
      volumeRef,
      onAnySubTrigger,
      normalBufferRef,
      accentBufferRef,
      firstBufferRef,
      beatConfigRef: null,
      accentsRef,
      shouldMute: muteThisBeat,
      playedBeatTimesRef,
      updateActualBpm,
      // Pass additional metadata for logging
      debugInfo: {
        currentCircle: currentCircleIndex,
        beatMode: currentBeatMode,
        isTransitioning: circleTransitionRef.current.isTransitioning
      }
    });
  }, [
    macroMode, 
    muteProbability, 
    analogMode, 
    gridMode, 
    volumeRef, 
    onAnySubTrigger,
    circleSettings,
    onCircleChange,
    playingCircleRef,
    subdivisionsRef,
    circleTransitionRef,
    beatTimingRef,
    lastBeatTimeRef,
    accentsRef,
    isSilencePhaseRef,
    prepareCircleTransition,
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    playedBeatTimesRef,
    updateActualBpm,
    isPaused,
    speedMode,
    measuresUntilMute,
    muteDurationMeasures,
    measuresUntilSpeedUp,
    tempoIncreasePercent,
    tempoRef,
    setTempo,
    muteMeasureCountRef,
    nextCircleFor3CircleCase,
    playStartTimeRef
  ]);

  // Detect when we need to switch circles - called from the component
  const switchToNextCircle = useCallback(() => {
    if (circleSettings.length <= 1) return 0;
    
    // Calculate next circle index - ALWAYS proceed in sequential order
    const currentCircle = playingCircleRef.current;
    const nextCircle = (currentCircle + 1) % circleSettings.length;
    
    console.log(`[MultiCircleLogic] 🔄 switchToNextCircle called: ${currentCircle} -> ${nextCircle} (ensuring sequential progression)`);
    
    // Block transitions during initial stabilization period
    if (!hasPlayedEnoughRef.current && currentCircle === 0) {
      console.log(`[FIXED] Blocking manual transition during initial stabilization period`);
      return currentCircle;
    }
    
    // Prepare for transition (will be handled by scheduler)
    const transitionPrepared = prepareCircleTransition(currentCircle, nextCircle);
    
    // Only return the next circle index if transition was successfully prepared
    if (transitionPrepared) {
      console.log(`[FIXED] Successfully prepared sequential transition to circle ${nextCircle}`);
      return nextCircle;
    } else {
      return currentCircle;
    }
  }, [circleSettings, prepareCircleTransition, hasPlayedEnoughRef]);

  // Fixed: doSchedulerLoop function that properly checks for valid audio context and handles beat mode changes
  const doSchedulerLoop = useCallback(() => {
    // Debug output to help track scheduler issues
    if (!schedulerRunningRef.current) {
      console.log("[MultiCircleLogic] Scheduler not running, skipping loop");
      return;
    }
    
    // Fix: Check if audio context is valid before scheduling
    if (!audioCtxRef.current || audioCtxRef.current.state !== 'running') {
      console.log("[MultiCircleLogic] Audio context not running, trying to resume");
      if (audioCtxRef.current) {
        audioCtxRef.current.resume().catch(err => {
          console.error("Error resuming audio context:", err);
        });
      }
      return;
    }
    
    // Recalculate subdivision interval on each loop to ensure it respects current beat mode
    if (currentSubRef.current !== undefined) {
      currentSubIntervalRef.current = getCurrentSubIntervalSec(currentSubRef.current);
    }
    
    runScheduler({
      audioCtxRef,
      nextNoteTimeRef,
      currentSubRef,
      currentSubdivisionSetter: setCurrentSubdivision,
      getCurrentSubIntervalSec,
      // Fix: Using our own implementation of handleMeasureBoundary for Multi Circle Mode
      handleMeasureBoundary: () => {
        // Measure boundary handling is now done directly in scheduleSubFn
        // when subIndex === 0, which is the start of a new measure
        return true; // Always continue scheduler
      },
      scheduleSubFn,
      subdivisionsRef,
      multiCircleMode: true,
      nodeRefs,
      schedulerRunningRef
    });
  }, [
    audioCtxRef,
    nextNoteTimeRef,
    currentSubRef,
    getCurrentSubIntervalSec,
    scheduleSubFn,
    nodeRefs,
    schedulerRunningRef,
    currentSubIntervalRef
  ]);

  // Fixed: Improved startScheduler function with proper initialization and error handling
  const startScheduler = useCallback(() => {
    if (schedulerRunningRef.current) {
      console.log("[MultiCircleLogic] Scheduler already running, ignoring start request");
      return;
    }

    console.log("[MultiCircleLogic] Starting scheduler");
    
    // Make sure we're starting clean
    stopScheduler();
    
    (async function() {
      try {
        // Create new audio context if it doesn't exist or is closed
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          const newCtx = initAudioContext();
          if (!newCtx) {
            console.error('[MultiCircleLogic] Failed to create audio context');
            return;
          }
          audioCtxRef.current = newCtx;
          
          // Load sound buffers
          try {
            const soundSet = await getActiveSoundSet();
            await loadClickBuffers({
              audioCtx: audioCtxRef.current,
              normalBufferRef,
              accentBufferRef,
              firstBufferRef,
              soundSet
            });
            console.log('[MultiCircleLogic] Successfully loaded sound set');
          } catch (error) {
            console.log('[MultiCircleLogic] Loading default sound set');
            await loadClickBuffers({
              audioCtx: audioCtxRef.current,
              normalBufferRef,
              accentBufferRef,
              firstBufferRef
            });
          }
        } 
        // Resume if suspended
        else if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
          console.log('[MultiCircleLogic] Resumed audio context');
        }
        
        // Check if we have all needed components ready
        if (
          !audioCtxRef.current || 
          audioCtxRef.current.state !== 'running' ||
          !normalBufferRef.current || 
          !accentBufferRef.current || 
          !firstBufferRef.current
        ) {
          console.error('[MultiCircleLogic] Audio context or buffers not ready');
          // Fix: Try to reload buffers as a last resort
          try {
            await loadClickBuffers({
              audioCtx: audioCtxRef.current,
              normalBufferRef,
              accentBufferRef,
              firstBufferRef
            });
            console.log('[MultiCircleLogic] Emergency buffer reload successful');
          } catch (err) {
            console.error('[MultiCircleLogic] Failed to reload buffers:', err);
            return;
          }
        }
        
        // Fix: Ensure we have valid circle settings
        if (!circleSettings || circleSettings.length === 0) {
          console.error('[MultiCircleLogic] No circle settings available');
          return;
        }
        
        // FIXED: Always start playback from circle 0 with proper initialization
        console.log("[MultiCircleLogic] Starting playback from circle 0");
        playingCircleRef.current = 0;
        if (onCircleChange) {
          onCircleChange(0);
        }
        
        // CRITICAL FIX: Special case for 2 circles - initialize for strict alternation pattern
        if (circleSettings.length === 2) {
          console.log("[CRITICAL] Two-circle case detected, enforcing strict 0-1-0-1 alternation pattern");
          
          // Start counter at 1 for the first beat (which will play on circle 0)
          minBeatsBeforeTransitionRef.current = 1;
          playingCircleRef.current = 0;
          
          // Force perfect alternation in 2-circle mode regardless of tempo
          console.log("[TWOCIRCLE] Initializing for perfect alternation: first beat (1) will be circle 0");
          
          // Make sure the UI shows circle 0
          if (onCircleChange) {
            onCircleChange(0);
          }
        }
        
        // All checks passed, start scheduler
        schedulerRunningRef.current = true;
        const now = audioCtxRef.current.currentTime;
        
        // Initialize the playStartTimeRef for time-based blocking
        playStartTimeRef.current = Date.now();
        
        // Reset scheduling state
        currentSubRef.current = 0;
        setCurrentSubdivision(0);
        nextNoteTimeRef.current = now;
        currentSubStartRef.current = now;
        currentSubIntervalRef.current = getCurrentSubIntervalSec(0);
        playedBeatTimesRef.current = [];
        
        // Reset transition state
        circleTransitionRef.current = {
          isTransitioning: false,
          fromCircle: playingCircleRef.current,
          toCircle: playingCircleRef.current,
          nextCircleScheduled: false,
          lastBeatTime: now,
          transitionStartTime: now,
          transitionLockout: false,
          measureCompleted: false,
          alreadySwitched: false
        };
        
        // FIXED: Reset the full cycle completion flag when restarting
        fullCycleCompletedRef.current = false;
        
        // Reset the beat counter for initial blocking
        minBeatsBeforeTransitionRef.current = 0;
        
        isFirstMeasurePlayedRef.current = false;
        console.log("[CRITICAL] Reset first measure flag, will block transitions until first measure plays");
        
        // FIXED: Reset training-related counters when starting scheduler
        measureCountRef.current = 0;
        muteMeasureCountRef.current = 0;
        isSilencePhaseRef.current = false;
        lastTempoIncreaseTimeRef.current = Date.now();
        
        // Make sure the global isSilencePhaseRef is updated
        window.isSilencePhaseRef = isSilencePhaseRef;
        
        // Force a training measure update to refresh the UI 
        window.dispatchEvent(new CustomEvent('training-measure-update'));
        
        // Start scheduling loop with a short delay to ensure AudioContext is ready
        setTimeout(() => {
          lookaheadRef.current = setInterval(doSchedulerLoop, 20);
          console.log('[MultiCircleLogic] Metronome started successfully');
        }, 50);
      } catch (err) {
        console.error('[MultiCircleLogic] Error starting metronome:', err);
        schedulerRunningRef.current = false;
      }
    })();
  }, [
    audioCtxRef, 
    stopScheduler, 
    doSchedulerLoop, 
    normalBufferRef, 
    accentBufferRef, 
    firstBufferRef, 
    schedulerRunningRef, 
    nextNoteTimeRef, 
    currentSubRef, 
    getCurrentSubIntervalSec, 
    currentSubStartRef, 
    currentSubIntervalRef, 
    playedBeatTimesRef, 
    lookaheadRef,
    circleSettings,
    playingCircleRef,
    isSilencePhaseRef,
    measureCountRef,
    muteMeasureCountRef
  ]);

  // Tap Tempo handler
  const handleTapTempo = useCallback(
    createTapTempoLogic(setTempo),
    [setTempo]
  );

  // Function to check if we're currently in a transition
  const isTransitioning = useCallback(() => {
    return circleTransitionRef.current.isTransitioning;
  }, [circleTransitionRef]);

  // Function to update the beatMultiplier based on the current playing circle's beatMode
  const updateBeatMultiplier = useCallback((newMultiplier) => {
    console.log(`[MultiCircleLogic] Updating beat multiplier to: ${newMultiplier}`);
    
    // Update the current playing circle's beat mode
    const currentCircleIndex = playingCircleRef.current;
    const newBeatMode = newMultiplier === 2 ? "eighth" : "quarter";
    
    // Update the playing settings ref with the new beat mode
    if (circleSettings[currentCircleIndex]) {
      circleSettings[currentCircleIndex].beatMode = newBeatMode;
    }
    
    // Immediately update the current subdivision interval to respect the new beat multiplier
    if (currentSubIntervalRef.current && currentSubRef.current !== undefined) {
      // Calculate the new subdivision interval based on the new multiplier
      const newInterval = getCurrentSubIntervalSec(currentSubRef.current);
      currentSubIntervalRef.current = newInterval;
      
      console.log(`[MultiCircleLogic] Updated currentSubIntervalRef with new timing: ${newInterval}s`);
    }
    
    // Log the change for debugging
    console.log(`[MultiCircleLogic] Updated beat mode to: ${newBeatMode} for circle ${currentCircleIndex}`);
    
    // Return the new beat mode for any chaining operations
    return newBeatMode;
  }, [playingCircleRef, circleSettings, getCurrentSubIntervalSec, currentSubRef, currentSubIntervalRef]);

  // Listen for beat-mode-change events directly in the hook
  useEffect(() => {
    const handleBeatModeChange = (event) => {
      const { beatMode, beatMultiplier } = event.detail;
      
      console.log(`[MultiCircleLogic] Beat mode change event received: ${beatMode} (multiplier: ${beatMultiplier})`);
      
      // Update the beat multiplier
      updateBeatMultiplier(beatMultiplier);
    };
    
    window.addEventListener('beat-mode-change', handleBeatModeChange);
    
    return () => {
      window.removeEventListener('beat-mode-change', handleBeatModeChange);
    };
  }, [updateBeatMultiplier]);
  
  // Listen for accent-change events to update audio immediately
  useEffect(() => {
    const handleAccentChange = (event) => {
      const { circleIndex, beatIndex, isPlayingCircle } = event.detail;
      
      // CRITICAL FIX: Only update the audio scheduler's accent reference if this is the currently playing circle
      // This prevents changes to one circle from affecting the sound of another circle
      if (isPlayingCircle && circleSettings[circleIndex]) {
        // Get updated accents pattern from the circle settings
        let updatedAccents = [...circleSettings[circleIndex].accents];
        
        // No special handling - allow all beats to be muted including first beat in all circles
        
        // Only update the audio reference if this is for the currently playing circle
        accentsRef.current = updatedAccents;
        console.log(`[MultiCircleLogic] Updated accent state for beat ${beatIndex} to ${updatedAccents[beatIndex]} (playing circle: ${playingCircleRef.current})`);
        
        // Only restart scheduler if we're actually playing (not paused)
        if (!isPaused && schedulerRunningRef.current) {
          // Properly restart the scheduler to force the new accent pattern to take effect immediately
          console.log(`[MultiCircleLogic] Restarting scheduler to apply accent changes`);
          
          // Use stopScheduler and startScheduler to ensure clean restart
          if (lookaheadRef.current) {
            clearInterval(lookaheadRef.current);
            lookaheadRef.current = null;
          }
          
          // Briefly delay the restart to ensure clean state
          setTimeout(() => {
            if (!isPaused) {
              // Only restart if still playing
              lookaheadRef.current = setInterval(doSchedulerLoop, 20);
              console.log('[MultiCircleLogic] Scheduler restarted after accent change');
            }
          }, 20);
        }
      } else {
        console.log(`[MultiCircleLogic] Ignored accent change for non-playing circle ${circleIndex} (current playing: ${playingCircleRef.current})`);
      }
    };
    
    window.addEventListener('accent-change', handleAccentChange);
    
    return () => {
      window.removeEventListener('accent-change', handleAccentChange);
    };
  }, [circleSettings, accentsRef, isPaused, schedulerRunningRef, lookaheadRef, doSchedulerLoop, playingCircleRef]);

  // Auto-start/stop based on isPaused
  useEffect(() => {
    if (isPaused) {
      console.log('[MultiCircleLogic] Paused state detected, stopping scheduler');
      stopScheduler();
      
      // Suspend audio context if it exists
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(err => {
          console.error('[MultiCircleLogic] Error suspending audio context:', err);
        });
      }
    } else { 
      console.log('[MultiCircleLogic] Play state detected, starting scheduler');
      startScheduler();
    }
    
    return () => {
      // Clean up on component unmount
      if (!isPaused) {
        stopScheduler();
      }
      
      // Close audio context on unmount to prevent memory leaks
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(err => {
          console.error('[MultiCircleLogic] Error closing audio context:', err);
        });
      }
    };
  }, [isPaused, startScheduler, stopScheduler, audioCtxRef]);

  // Restart scheduler when circleSettings change and we're not paused
  useEffect(() => {
    if (!isPaused && schedulerRunningRef.current) {
      console.log("[MultiCircleLogic] Restarting scheduler due to circleSettings change");
      stopScheduler();
      // Add a small delay before restarting to ensure clean state
      setTimeout(() => {
        startScheduler();
      }, 50);
    }
  }, [circleSettings, isPaused, startScheduler, stopScheduler, schedulerRunningRef]);

  // Return the enhanced logic object
  const resetToFirstCircle = useCallback(() => {
    console.log("[CRITICAL] Direct reset to circle 0");
    playingCircleRef.current = 0;
    isFirstMeasurePlayedRef.current = false;
    // Reset the minBeatsBeforeTransitionRef to ensure full delay
    minBeatsBeforeTransitionRef.current = 0;
    // Reset the playStartTimeRef for time-based blocking
    playStartTimeRef.current = Date.now();
    if (onCircleChange) {
      onCircleChange(0);
    }
    return 0;
  }, [onCircleChange]);
  
  return {
    currentSubdivision,
    actualBpm,
    audioCtx: audioCtxRef.current,
    tapTempo: handleTapTempo,
    currentSubStartRef,
    currentSubIntervalRef,
    startScheduler,
    stopScheduler,
    getBeatMultiplier, 
    measureCountRef,
    muteMeasureCountRef,
    isSilencePhaseRef,
    switchToNextCircle,
    isTransitioning,
    lastBeatTimeRef,
    // Add the new updateBeatMultiplier function
    updateBeatMultiplier,
    resetToFirstCircle,
    // Expose the beat counters and playStartTimeRef
    minBeatsBeforeTransitionRef,
    hasPlayedEnoughRef,
    playStartTimeRef,
    // Expose accentsRef to allow direct updates
    accentsRef,
    // Add references to audio buffers for reloading
    reloadSounds: async function() {
      console.log("[MultiCircleLogic] Reloading sounds manually");
      if (!audioCtxRef.current) {
        console.error("[MultiCircleLogic] No audio context available for reload");
        return false;
      }
      
      try {
        const soundSet = await getActiveSoundSet();
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet
        });
        console.log("[MultiCircleLogic] Successfully reloaded sounds");
        return true;
      } catch (error) {
        console.error("[MultiCircleLogic] Error reloading sounds:", error);
        try {
          // Fallback to default sounds
          await loadClickBuffers({
            audioCtx: audioCtxRef.current,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef
          });
          console.log("[MultiCircleLogic] Loaded fallback sounds");
          return true;
        } catch (err) {
          console.error("[MultiCircleLogic] Failed to load fallback sounds:", err);
          return false;
        }
      }
    },
    // Add references so MultiCircleMetronome component can access them
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    audioCtxRef,
    // Expose audio helper functions
    safelyInitAudioContext,
    isAudioReady
  };
}