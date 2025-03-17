// src/components/metronome/MultiCircleMode/hooks/useSchedulerLogic.js
import { useCallback } from 'react';
import { 
  runScheduler, 
  scheduleSubdivision 
} from '../../../../hooks/useMetronomeLogic/scheduler';
import { shouldMuteThisBeat } from '../../../../hooks/useMetronomeLogic/trainingLogic';
import { initAudioContext, loadClickBuffers } from '../../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../../services/soundSetService';
import { debugLog } from '../utils/debugUtils';

/**
 * Hook to manage audio scheduling and beat timing logic
 */
export function useSchedulerLogic({
  audioCtxRef,
  nextNoteTimeRef,
  currentSubRef,
  lookaheadRef,
  nodeRefs,
  schedulerRunningRef,
  currentSubStartRef,
  currentSubIntervalRef,
  playedBeatTimesRef,
  setCurrentSubdivision,
  tempoRef,
  swingRef,
  subdivisionsRef,
  lastBeatTimeRef,
  accentsRef,
  volumeRef,
  normalBufferRef,
  accentBufferRef,
  firstBufferRef,
  onAnySubTrigger,
  analogMode,
  gridMode,
  macroMode,
  muteProbability,
  isSilencePhaseRef,
  setActualBpm,
  playingCircleRef,
  circleSettings,
  circleTransitionRef,
  beatTimingRef,
  onCircleChange,
  playStartTimeRef,
  minBeatsBeforeTransitionRef,
  hasPlayedEnoughRef,
  handleMeasureBoundary,
  nextCircleFor3CircleCase,
  measuresUntilMute,
  muteDurationMeasures,
  measuresUntilSpeedUp,
  tempoIncreasePercent,
  isPaused
}) {
  /**
   * Helper function to prepare circle transitions
   * Defined first to avoid circular dependencies
   */
  const prepareCircleTransition = useCallback((fromCircle, toCircle) => {
    const now = audioCtxRef.current?.currentTime || 0;
    
    // Ensure we don't skip any circles in sequence
    const expectedNextCircle = (fromCircle + 1) % circleSettings.length;
    if (toCircle !== expectedNextCircle) {
      debugLog(`Correcting requested transition: wanted ${fromCircle}->${toCircle}, forcing ${fromCircle}->${expectedNextCircle}`);
      toCircle = expectedNextCircle;
    }
    
    // Prevent rapid transitions
    if (circleTransitionRef.current.transitionLockout) {
      debugLog(`Transition blocked - lockout active`);
      return false;
    }
    
    // If already transitioning, don't start another
    if (circleTransitionRef.current.isTransitioning && 
        circleTransitionRef.current.toCircle === toCircle && 
        circleTransitionRef.current.measureCompleted) {
      debugLog(`Transition already in progress to circle ${toCircle}`);
      return false;
    }
    
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
    
    debugLog(`Preparing transition from circle ${fromCircle} to ${toCircle}`);
    
    // Set lockout timeout
    setTimeout(() => {
      circleTransitionRef.current.transitionLockout = false;
    }, 500);
    
    return true;
  }, [circleSettings, audioCtxRef, circleTransitionRef]);

  /**
   * Derive beatMultiplier from beatMode (1 for quarter, 2 for eighth)
   */
  const getBeatMultiplier = useCallback(() => {
    const currentCircleIndex = playingCircleRef.current;
    const currentBeatMode = circleSettings[currentCircleIndex]?.beatMode;
    const multiplier = currentBeatMode === "eighth" ? 2 : 1;
    debugLog(`getBeatMultiplier: circle=${currentCircleIndex}, beatMode=${currentBeatMode}, multiplier=${multiplier}`);
    return multiplier;
  }, [circleSettings, playingCircleRef]);

  /**
   * Calculate subdivision interval based on tempo and beat mode
   */
  const getCurrentSubIntervalSec = useCallback((subIndex) => {
    const localTempo = tempoRef.current;
    if (!localTempo) return 0.5;
    
    // Get the beat mode multiplier (1 for quarter, 2 for eighth)
    const beatMultiplier = getBeatMultiplier();
    
    // Standard calculation for quarter note duration at the given tempo
    const quarterNoteDuration = 60 / localTempo;
    
    // In quarter note mode, one subdivision equals one quarter note
    // In eighth note mode, one subdivision equals one eighth note (half as long)
    const basicBeatDuration = quarterNoteDuration / beatMultiplier;
    
    // For subdivisions, we need to divide the beat duration by the number of subdivisions per beat
    const subDivisionDuration = basicBeatDuration;
    
    // Handle swing timing if needed
    const sFactor = swingRef.current || 0;
    if (subdivisionsRef.current >= 2 && sFactor > 0) {
      const isEvenSub = (subIndex % 2 === 0);
      return isEvenSub
        ? subDivisionDuration * (1 + sFactor)
        : subDivisionDuration * (1 - sFactor);
    }
    return subDivisionDuration;
  }, [getBeatMultiplier, tempoRef, swingRef, subdivisionsRef]);

  /**
   * Calculate actual BPM based on played notes
   */
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

  /**
   * Schedule a subdivision/beat 
   */
  const scheduleSubFn = useCallback((subIndex, when) => {
    // Store the last beat time for stability
    lastBeatTimeRef.current = when;
    
    // For debugging - get current settings
    const currentCircleIndex = playingCircleRef.current;
    const currentBeatMode = circleSettings[currentCircleIndex]?.beatMode;
    const totalSubs = subdivisionsRef.current;
    
    if (subIndex === 0) {
      // Increment beat counter for initial stabilization period
      minBeatsBeforeTransitionRef.current++;
      const elapsedTime = Date.now() - playStartTimeRef.current;

      // CRITICAL FIX: For 2-circle mode, we want IMMEDIATE alternation 0-1-0-1
      const isTwoCircles = circleSettings.length === 2;
      
      if (isTwoCircles) {
        // TWO CIRCLE MODE: Enable transitions immediately for 2 circles
        hasPlayedEnoughRef.current = true;
        
        // Force correct alternating sequence for 2 circles
        const beatIndex = minBeatsBeforeTransitionRef.current - 1;
        const shouldBeCircle = beatIndex % 2;
        debugLog(`[TWOCIRCLE] Beat ${minBeatsBeforeTransitionRef.current} (index ${beatIndex}) - should be circle ${shouldBeCircle}`);
        
        // Force transition to the correct circle on every beat
        if (playingCircleRef.current !== shouldBeCircle) {
          debugLog(`[TWOCIRCLE] ⚠️ Correcting circle from ${playingCircleRef.current} to ${shouldBeCircle}`);
          
          // CRITICAL FIX: Update accent pattern when switching circles
          if (circleSettings[shouldBeCircle] && circleSettings[shouldBeCircle].accents) {
            accentsRef.current = [...circleSettings[shouldBeCircle].accents];
            debugLog(`[TWOCIRCLE] Updated accent pattern for circle ${shouldBeCircle}: ${accentsRef.current}`);
          }
          
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
          debugLog(`[FIXED] Blocking transitions - beats: ${minBeatsBeforeTransitionRef.current}/${MIN_BEATS}, time: ${Math.round(elapsedTime/1000)}s/${MIN_TIME_MS/1000}s`);
          hasPlayedEnoughRef.current = false;
        } else {
          hasPlayedEnoughRef.current = true;
          debugLog(`[FIXED] Enabling transitions - beat count threshold reached (${circleSettings.length} circles total)`);
        }
      }
      
      // First beat of measure
      beatTimingRef.current.measureStartTime = when;
      beatTimingRef.current.lastQuarterNote = when;
      
      // Handle measure completion and transitions
      if (circleTransitionRef.current.measureCompleted && 
          circleTransitionRef.current.isTransitioning && 
          !circleTransitionRef.current.alreadySwitched) {
        
        // Mark that we've already switched to prevent double switching
        circleTransitionRef.current.alreadySwitched = true;
        
        // Update the beat mode for the next circle
        const nextCircleIndex = circleTransitionRef.current.toCircle;
        if (circleSettings[nextCircleIndex]) {
          // CRITICAL FIX: Update accent pattern when switching circles
          if (circleSettings[nextCircleIndex].accents) {
            accentsRef.current = [...circleSettings[nextCircleIndex].accents];
            debugLog(`🔄 TRANSITION: Updated accent pattern to ${accentsRef.current} for circle ${nextCircleIndex}`);
          }
          
          debugLog(`🔄 TRANSITION COMPLETE: Now using beatMode=${circleSettings[nextCircleIndex].beatMode} for circle ${nextCircleIndex}`);
          
          // Reset transition state to allow future transitions
          circleTransitionRef.current.isTransitioning = false;
          circleTransitionRef.current.nextCircleScheduled = false;
          circleTransitionRef.current.measureCompleted = false;
          circleTransitionRef.current.alreadySwitched = false;
          debugLog(`🏁 Transition state reset, ready for next transition`);
        }
      } 
      // If this is the first measure after a transition was requested, mark it as completed
      else if (circleTransitionRef.current.isTransitioning && !circleTransitionRef.current.measureCompleted) {
        circleTransitionRef.current.measureCompleted = true;
        debugLog(`✓ First measure after transition request completed`);
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
        debugLog(`🏁 Transition state fully reset`);
      }
      
      // FIXED: Handle training mode measure boundaries properly
      if (!isPaused) {
        handleMeasureBoundary();
      }
      
      // Trigger auto-transition to the next circle
      const isTwoCircleCase = circleSettings.length === 2;
      
      // Handle 2-circle case specially for perfect alternation
      if (isTwoCircleCase) {
        // TWO CIRCLE MODE: Strict alternating pattern enforcement
        const beatIndex = minBeatsBeforeTransitionRef.current - 1;
        const shouldBeCircle = beatIndex % 2;
        
        if (playingCircleRef.current !== shouldBeCircle) {
          debugLog(`[TWOCIRCLE] 🔄 Enforcing alternating pattern: circle ${shouldBeCircle} for beat ${minBeatsBeforeTransitionRef.current}`);
          
          // Update playing circle ref directly
          playingCircleRef.current = shouldBeCircle;
          
          // Call the onCircleChange callback to sync the UI
          if (onCircleChange) {
            debugLog(`[TWOCIRCLE] Notifying UI of circle change to ${shouldBeCircle}`);
            onCircleChange(shouldBeCircle);
          }
        } else {
          debugLog(`[TWOCIRCLE] ✓ Correct circle ${shouldBeCircle} for beat ${minBeatsBeforeTransitionRef.current}`);
        }
      }
      // Standard transition logic for 3+ circles
      else if (circleSettings.length > 1 && hasPlayedEnoughRef.current) {
        // Force circle order: 0 -> 1 -> 2 -> 0 (for 3+ circles)
        const nextCircleIndex = circleSettings.length === 3
          ? nextCircleFor3CircleCase(currentCircleIndex)
          : (currentCircleIndex + 1) % circleSettings.length;
        
        debugLog(`🔄 Sequential transition: ${currentCircleIndex} -> ${nextCircleIndex} (of ${circleSettings.length} total circles)`);
        
        // FIXED: Better transition handling with guaranteed progression
        const success = prepareCircleTransition(currentCircleIndex, nextCircleIndex);
        
        if (success) {
          debugLog(`✓ Successfully transitioning from circle ${currentCircleIndex} to ${nextCircleIndex}`);
          
          // Update playing circle ref for the next measure
          playingCircleRef.current = nextCircleIndex;
          
          // CRITICAL FIX: Update the accent pattern for the new playing circle
          if (circleSettings[nextCircleIndex] && circleSettings[nextCircleIndex].accents) {
            accentsRef.current = [...circleSettings[nextCircleIndex].accents];
            debugLog(`Updated accent pattern for new playing circle ${nextCircleIndex}: ${accentsRef.current}`);
          }
          
          // Call the onCircleChange callback to sync the UI
          if (onCircleChange) {
            debugLog(`Notifying UI of circle change to ${nextCircleIndex}`);
            onCircleChange(nextCircleIndex);
          }
        } else {
          debugLog(`✕ Transition preparation failed, remaining on circle ${currentCircleIndex}`);
        }
      }
    } else if (subIndex === totalSubs - 1) {
      // End of circle reached: deferring circle transition until beginning of next measure
      debugLog('End of circle reached, deferring transition until beginning of next measure');
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
    lastBeatTimeRef,
    playingCircleRef,
    circleSettings,
    subdivisionsRef,
    minBeatsBeforeTransitionRef,
    playStartTimeRef,
    hasPlayedEnoughRef,
    beatTimingRef,
    circleTransitionRef,
    isPaused,
    handleMeasureBoundary,
    nextCircleFor3CircleCase,
    prepareCircleTransition,
    onCircleChange,
    macroMode,
    muteProbability,
    isSilencePhaseRef,
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    analogMode,
    gridMode,
    volumeRef,
    onAnySubTrigger,
    accentsRef,
    playedBeatTimesRef,
    updateActualBpm
  ]);

  /**
   * The main scheduler loop that handles timing
   */
  const doSchedulerLoop = useCallback(() => {
    // Debug output to help track scheduler issues
    if (!schedulerRunningRef.current) {
      debugLog("Scheduler not running, skipping loop");
      return;
    }
    
    // Fix: Check if audio context is valid before scheduling
    if (!audioCtxRef.current || audioCtxRef.current.state !== 'running') {
      debugLog("Audio context not running, trying to resume");
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
      // Using a simpler measure boundary handler
      handleMeasureBoundary: () => true, // Always continue scheduler
      scheduleSubFn,
      subdivisionsRef,
      multiCircleMode: true,
      nodeRefs,
      schedulerRunningRef
    });
  }, [
    schedulerRunningRef,
    audioCtxRef,
    currentSubRef,
    currentSubIntervalRef,
    getCurrentSubIntervalSec,
    nextNoteTimeRef,
    setCurrentSubdivision,
    scheduleSubFn,
    subdivisionsRef,
    nodeRefs
  ]);

  /**
   * Stop the scheduler and clean up resources
   */
  const stopScheduler = useCallback(() => {
    // Clear the scheduling interval first
    if (lookaheadRef.current) {
      clearInterval(lookaheadRef.current);
      lookaheadRef.current = null;
    }
    
    // Reset running state immediately to prevent more scheduling
    schedulerRunningRef.current = false;
    
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
  }, [
    lookaheadRef,
    schedulerRunningRef,
    nodeRefs,
    nextNoteTimeRef,
    currentSubRef,
    playedBeatTimesRef,
    circleTransitionRef,
    setCurrentSubdivision
  ]);

  /**
   * Prepare and start the scheduler
   */
  const startScheduler = useCallback(() => {
    if (schedulerRunningRef.current) {
      debugLog("Scheduler already running, ignoring start request");
      return;
    }

    debugLog("Starting scheduler");
    
    // Make sure we're starting clean
    stopScheduler();
    
    (async function() {
      try {
        // Create new audio context if it doesn't exist or is closed
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          const newCtx = initAudioContext();
          if (!newCtx) {
            console.error('Failed to create audio context');
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
            debugLog('Successfully loaded sound set');
          } catch (error) {
            debugLog('Loading default sound set');
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
          debugLog('Resumed audio context');
        }
        
        // Check if we have all needed components ready
        if (
          !audioCtxRef.current || 
          audioCtxRef.current.state !== 'running' ||
          !normalBufferRef.current || 
          !accentBufferRef.current || 
          !firstBufferRef.current
        ) {
          console.error('Audio context or buffers not ready');
          // Fix: Try to reload buffers as a last resort
          try {
            await loadClickBuffers({
              audioCtx: audioCtxRef.current,
              normalBufferRef,
              accentBufferRef,
              firstBufferRef
            });
            debugLog('Emergency buffer reload successful');
          } catch (err) {
            console.error('Failed to reload buffers:', err);
            return;
          }
        }
        
        // Fix: Ensure we have valid circle settings
        if (!circleSettings || circleSettings.length === 0) {
          console.error('No circle settings available');
          return;
        }
        
        // FIXED: Always start playback from circle 0 with proper initialization
        debugLog("Starting playback from circle 0");
        playingCircleRef.current = 0;
        if (onCircleChange) {
          onCircleChange(0);
        }
        
        // CRITICAL FIX: Special case for 2 circles - initialize for strict alternation pattern
        if (circleSettings.length === 2) {
          debugLog("[CRITICAL] Two-circle case detected, enforcing strict 0-1-0-1 alternation pattern");
          
          // Start counter at 1 for the first beat (which will play on circle 0)
          minBeatsBeforeTransitionRef.current = 1;
          playingCircleRef.current = 0;
          
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
        
        // Reset counters and flags
        minBeatsBeforeTransitionRef.current = 0;
        hasPlayedEnoughRef.current = false;
        
        // FIXED: Reset training-related counters when starting scheduler
        isSilencePhaseRef.current = false;
        
        // Make sure the global isSilencePhaseRef is updated
        window.isSilencePhaseRef = isSilencePhaseRef;
        
        // Force a training measure update to refresh the UI 
        window.dispatchEvent(new CustomEvent('training-measure-update'));
        
        // Start scheduling loop with a short delay to ensure AudioContext is ready
        setTimeout(() => {
          lookaheadRef.current = setInterval(doSchedulerLoop, 20);
          debugLog('Metronome started successfully');
        }, 50);
      } catch (err) {
        console.error('Error starting metronome:', err);
        schedulerRunningRef.current = false;
      }
    })();
  }, [
    schedulerRunningRef,
    stopScheduler,
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    circleSettings,
    onCircleChange,
    playingCircleRef,
    minBeatsBeforeTransitionRef,
    hasPlayedEnoughRef,
    playStartTimeRef,
    currentSubRef,
    setCurrentSubdivision,
    nextNoteTimeRef,
    currentSubStartRef,
    currentSubIntervalRef,
    getCurrentSubIntervalSec,
    playedBeatTimesRef,
    circleTransitionRef,
    isSilencePhaseRef,
    doSchedulerLoop,
    lookaheadRef
  ]);

  return {
    getCurrentSubIntervalSec,
    updateActualBpm,
    getBeatMultiplier,
    scheduleSubFn,
    doSchedulerLoop,
    stopScheduler,
    startScheduler
  };
}