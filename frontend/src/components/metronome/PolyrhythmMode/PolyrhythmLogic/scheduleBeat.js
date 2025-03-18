// src/components/metronome/PolyrhythmMode/PolyrhythmLogic/scheduleBeat.js

/**
 * Schedule audio playback for a beat
 * @param {Object} params Parameters for scheduling a beat
 * @returns {string} ID of the created node for debugging
 */
export const scheduleBeat = ({
    time,
    beatIndex,
    isInnerCircle,
    mute = false,
    isFirstBeatOfBoth = false,
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    innerAccentsRef,
    outerAccentsRef,
    volumeRef,
    activeNodesRef,
    schedulerRunningRef,
    setInnerCurrentBeat,
    setOuterCurrentBeat,
    onInnerBeatTriggered,
    onOuterBeatTriggered
  }) => {
    if (!audioCtxRef.current || mute) return 'muted';
    
    // Get the right accent array for this circle
    const accents = isInnerCircle ? innerAccentsRef.current : outerAccentsRef.current;
    
    // IMPORTANT: Handle case where accents may not be initialized yet
    if (!accents || !Array.isArray(accents)) {
      console.error(`Accent array for ${isInnerCircle ? 'inner' : 'outer'} is not available`);
      // Default to normal accent if array not available
      const accentValue = beatIndex === 0 ? 3 : 1; // First beat gets accent 3, others get 1
      
      // Continue with default accent value
      return scheduleWithAccent(accentValue);
    }
    
    // Determine which accent value to use (0=muted, 1=normal, 2=accent, 3=first) 
    const accentValue = beatIndex < accents.length ? accents[beatIndex] : 1;
    
    // Skip if explicitly muted in accent pattern
    if (accentValue === 0) return 'accent-muted';
    
    // Continue with determined accent value
    return scheduleWithAccent(accentValue);
    
    // Inner function to schedule with given accent
    function scheduleWithAccent(accentValue) {
      // Select the right buffer based on accent value
      let buffer = normalBufferRef.current;
      if (accentValue === 3) {
        buffer = firstBufferRef.current;
      } else if (accentValue === 2) {
        buffer = accentBufferRef.current;
      }
      
      // CRITICAL FIX: Fallback to normal buffer if selected buffer is missing
      if (!buffer) {
        console.warn(`Buffer for accent ${accentValue} missing, falling back to normal buffer`);
        buffer = normalBufferRef.current;
        
        // If even normal buffer is missing, we cannot proceed
        if (!buffer) {
          console.error(`No buffer available for ${isInnerCircle ? 'inner' : 'outer'} beat ${beatIndex}`);
          return 'no-buffer';
        }
      }
      
      // Generate unique ID for this node for debugging
      const nodeId = `beat-${isInnerCircle ? 'inner' : 'outer'}-${beatIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create and configure audio source
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      
      // Create volume node
      const gainNode = audioCtxRef.current.createGain();
      gainNode.gain.value = volumeRef.current;
      
      // Connect audio nodes
      source.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      
      // Log when scheduling a beat with microsecond precision
      const circleType = isInnerCircle ? 'INNER' : 'OUTER';
      const preciseTime = performance.now();
      const timingInfo = {
        scheduledTime: time.toFixed(6),
        currentAudioTime: audioCtxRef.current.currentTime.toFixed(6),
        timeDelta: ((time - audioCtxRef.current.currentTime) * 1000).toFixed(3),
        performanceTime: preciseTime.toFixed(6),
        nodeId: nodeId,
        accentValue: accentValue  // Track accent value for debugging
      };
      
      if (beatIndex === 0 || isFirstBeatOfBoth) {
        console.log(`
  ${isFirstBeatOfBoth ? '>>>' : '---'} Scheduling ${circleType} FIRST BEAT ${isFirstBeatOfBoth ? '(UNIFIED)' : ''} ${isFirstBeatOfBoth ? '<<<' : '---'}
  Schedule time: ${timingInfo.scheduledTime}s
  Current audio time: ${timingInfo.currentAudioTime}s
  Time until playback: ${timingInfo.timeDelta}ms
  Performance timestamp: ${timingInfo.performanceTime}ms
  Node ID: ${nodeId}
  Buffer type: ${accentValue === 3 ? 'first' : accentValue === 2 ? 'accent' : 'normal'}
  ${isFirstBeatOfBoth ? '------------------------------------------------' : ''}
        `);
      } else {
        console.log(`Scheduling ${circleType} beat ${beatIndex} at ${timingInfo.scheduledTime}s (in ${timingInfo.timeDelta}ms) - Node ID: ${nodeId} - Buffer: ${accentValue === 3 ? 'first' : accentValue === 2 ? 'accent' : 'normal'}`);
      }
      
      // If this is a unified beat, save precise timing info for verification
      if (isFirstBeatOfBoth) {
        // Store timing data as a custom attribute on the source node for later comparison
        source._timingDebugInfo = timingInfo;
      }
      
      // Set start time callback for high-precision timing verification
      // This is non-standard but supported in some browsers and helpful for debugging
      if (typeof source.onstarted === 'function') {
        source.onstarted = () => {
          const startTime = performance.now();
          console.log(`ACTUAL START: ${circleType} beat ${beatIndex} (Node: ${nodeId}) started at ${startTime.toFixed(6)}ms`);
        };
      }
      
      // CRITICAL FIX: Ensure audio context is running before scheduling
      if (audioCtxRef.current.state !== 'running') {
        console.warn(`Audio context not running (state: ${audioCtxRef.current.state}), attempting to resume`);
        audioCtxRef.current.resume().catch(console.error);
      }
      
      // Schedule precise playback
      try {
        // Make sure the time is valid (not NaN, not too far in the past)
        if (isNaN(time)) {
          console.error(`Invalid scheduling time: ${time} for ${circleType} beat ${beatIndex}`);
          return 'invalid-time';
        }
        
        // Ensure we're not scheduling in the past
        const currentTime = audioCtxRef.current.currentTime;
        const safeTime = Math.max(time, currentTime + 0.005); // Add a small 5ms buffer
        
        // IMPORTANT: Don't allow beats to get too far in the future which can cause audio sync issues
        const maxAheadTime = currentTime + 1.0; // Max 1 second ahead
        const finalTime = Math.min(safeTime, maxAheadTime);
        
        // Log if we had to adjust the time
        if (finalTime !== time) {
          console.warn(`Had to adjust scheduling time from ${time.toFixed(6)}s to ${finalTime.toFixed(6)}s for ${circleType} beat ${beatIndex}`);
        }
        
        // DEBUG: Log exactly what we're passing to source.start()
        console.log(`Starting ${circleType} beat ${beatIndex} at audio time ${finalTime.toFixed(6)}s (Node: ${nodeId}, buffer duration: ${buffer.duration.toFixed(3)}s)`);
        
        // Actually schedule the sound
        source.start(finalTime);
      } catch (error) {
        console.error(`Failed to schedule beat: ${error.message}`, { time, beatIndex, isInnerCircle });
        return 'scheduling-error';
      }
      
      // Store for cleanup with debug ID
      source._debugNodeId = nodeId;
      source._beatIndex = beatIndex;
      source._circleType = circleType;
      activeNodesRef.current.push({ source, gainNode, id: nodeId, beatIndex, circleType });
      
      // CRITICAL FIX: Ensure nodes don't get cleaned up prematurely
      // Set up cleanup once audio is done playing
      source.onended = () => {
        // Log when the beat ended for debugging
        const endTime = performance.now();
        console.log(`ENDED: ${circleType} beat ${beatIndex} (Node: ${nodeId}) ended at ${endTime.toFixed(6)}ms`);
        
        try {
          // Clean up safely
          source.disconnect();
          gainNode.disconnect();
          
          // Remove from active nodes
          const index = activeNodesRef.current.findIndex(n => n.id === nodeId);
          if (index !== -1) {
            activeNodesRef.current.splice(index, 1);
          }
        } catch (err) {
          console.error(`Error cleaning up node ${nodeId}:`, err);
        }
      };
      
      // Create visual UI updates scheduled for the same time
      // We need to schedule these relative to current time
      const delayUntilBeat = Math.max(0, (time - audioCtxRef.current.currentTime) * 1000);
      
      // CRITICAL FIX: Ensure UI updates happen for all beats
      // Create timer ID for debugging
      const timerId = setTimeout(() => {
        // Log when UI update occurs for debugging timing
        const updateTime = performance.now();
        console.log(`UI UPDATE: ${circleType} beat ${beatIndex} (Node: ${nodeId}) UI updated at ${updateTime.toFixed(6)}ms`);
        
        // Only update if we're still running (avoid stale updates if stopped)
        if (!schedulerRunningRef.current) return;
        
        // Update UI state
        if (isInnerCircle) {
          setInnerCurrentBeat(beatIndex);
          if (typeof onInnerBeatTriggered === 'function') {
            onInnerBeatTriggered(beatIndex);
          }
        } else {
          setOuterCurrentBeat(beatIndex);
          if (typeof onOuterBeatTriggered === 'function') {
            onOuterBeatTriggered(beatIndex);
          }
        }
      }, delayUntilBeat);
      
      // Return node ID for debugging
      return nodeId;
    }
  };