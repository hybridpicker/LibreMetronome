// src/components/Training/TrainingEventDispatcher.js
// Add this to each metronome mode to ensure proper event dispatching

/**
 * Helper function to dispatch training events consistently across metronome modes.
 * This should be called at the start of each measure to ensure the training container
 * receives updates regardless of which metronome mode is active.
 */
function dispatchTrainingEvents({
    measureIndex,
    isSilent = false,
    mode = 'unknown'
  }) {
    try {
      // Create the event with standardized detail
      const event = new CustomEvent('training-measure-update', {
        bubbles: true,
        detail: {
          measureIndex,
          timestamp: Date.now(),
          isSilent,
          mode,
          measureDate: new Date().toISOString()
        }
      });
      
      // Dispatch the event on multiple targets for maximum compatibility
      window.dispatchEvent(event);
      document.dispatchEvent(new CustomEvent('metronome-measure', { 
        detail: { measureIndex, isSilent }
      }));
      
      console.log(`[TrainingEvents] Dispatched measure update: index=${measureIndex}, silent=${isSilent}, mode=${mode}`);
      
      // Update direct global refs if available
      if (window.trainingRefs) {
        // If we have direct refs, update them
        window.trainingRefs.measureCountRef.current = measureIndex;
        window.trainingRefs.silenceRef.current = isSilent;
        
        if (typeof window.trainingRefs.forceUpdate === 'function') {
          window.trainingRefs.forceUpdate();
        }
      }
      
      // Also update legacy global ref for maximum compatibility
      if (window.isSilencePhaseRef) {
        window.isSilencePhaseRef.current = isSilent;
      }
      
      return true;
    } catch (err) {
      console.error('[TrainingEvents] Failed to dispatch event:', err);
      return false;
    }
  }
  
  /**
   * Helper to dispatch silence phase changes separately
   */
  function dispatchSilenceChange(isSilent) {
    try {
      // Create specialized silence event
      const event = new CustomEvent('training-silence-change', {
        bubbles: true,
        detail: {
          isSilent,
          timestamp: Date.now()
        }
      });
      
      // Dispatch event
      window.dispatchEvent(event);
      document.dispatchEvent(event);
      
      console.log(`[TrainingEvents] Silence phase changed to: ${isSilent ? 'silent' : 'playing'}`);
      
      // Update global refs
      if (window.trainingRefs) {
        window.trainingRefs.silenceRef.current = isSilent;
        
        if (typeof window.trainingRefs.forceUpdate === 'function') {
          window.trainingRefs.forceUpdate();
        }
      }
      
      if (window.isSilencePhaseRef) {
        window.isSilencePhaseRef.current = isSilent;
      }
      
      return true;
    } catch (err) {
      console.error('[TrainingEvents] Failed to dispatch silence change:', err);
      return false;
    }
  }
  
  /**
   * Function to add measure tracking to any metronome component
   * Call this in useEffect to set up measure tracking
   */
  function setupMeasureTracking(mode, onMeasureStart) {
    console.log(`[TrainingEvents] Setting up measure tracking for ${mode} mode`);
    
    // Create handler function that dispatches events and calls callback
    const handleMeasureBoundary = (measureIndex) => {
      // Dispatch events
      dispatchTrainingEvents({
        measureIndex,
        mode
      });
      
      // Call callback if provided
      if (typeof onMeasureStart === 'function') {
        onMeasureStart(measureIndex);
      }
    };
    
    return handleMeasureBoundary;
  }
  
  export {
    dispatchTrainingEvents,
    dispatchSilenceChange,
    setupMeasureTracking
  };