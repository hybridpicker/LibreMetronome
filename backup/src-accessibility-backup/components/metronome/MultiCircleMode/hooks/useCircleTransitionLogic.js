// src/components/metronome/MultiCircleMode/hooks/useCircleTransitionLogic.js
import { useRef, useCallback } from 'react';
import { debugLog } from '../utils/debugUtils';

/**
 * Hook to manage transitions between different circles
 */
export function useCircleTransitionLogic(audioCtxRef, circleSettings) {
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

  /**
   * Prepare for transition between circles
   */
  const prepareCircleTransition = useCallback((fromCircle, toCircle) => {
    const now = audioCtxRef.current?.currentTime || 0;
    
    // FIXED: Ensure we don't skip any circles in sequence
    const expectedNextCircle = (fromCircle + 1) % circleSettings.length;
    if (toCircle !== expectedNextCircle) {
      debugLog(`[FIXED SEQUENCE] Correcting requested transition: wanted ${fromCircle}->${toCircle}, forcing ${fromCircle}->${expectedNextCircle}`);
      toCircle = expectedNextCircle;
    }
    
    // Prevent rapid transitions (must wait at least 500ms between transitions)
    if (circleTransitionRef.current.transitionLockout) {
      debugLog(`Transition blocked - lockout active`);
      return false;
    }
    
    // If we're already transitioning to this circle and the measure is completed, don't transition again
    if (circleTransitionRef.current.isTransitioning && 
        circleTransitionRef.current.toCircle === toCircle && 
        circleTransitionRef.current.measureCompleted &&
        circleTransitionRef.current.alreadySwitched) {
      debugLog(`Transition already in progress to circle ${toCircle} and measure completed`);
      return false;
    }
    
    // FIXED: Add logging about proper sequencing
    debugLog(`[SEQUENCE] Preparing sequential transition ${fromCircle} -> ${toCircle} (of ${circleSettings.length} circles)`);
    
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
    debugLog(`Beat mode changing from ${circleSettings[fromCircle]?.beatMode} to ${circleSettings[toCircle]?.beatMode}`);
    
    // Set a timeout to release the transition lockout
    setTimeout(() => {
      circleTransitionRef.current.transitionLockout = false;
    }, 500);
    
    return true;
  }, [circleSettings, audioCtxRef]);

  /**
   * Check if currently in a transition between circles
   */
  const isTransitioning = useCallback(() => {
    return circleTransitionRef.current.isTransitioning;
  }, []);

  return {
    circleTransitionRef,
    beatTimingRef,
    prepareCircleTransition,
    isTransitioning
  };
}