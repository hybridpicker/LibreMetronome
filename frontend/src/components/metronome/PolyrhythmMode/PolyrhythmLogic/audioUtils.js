// src/components/metronome/PolyrhythmMode/PolyrhythmLogic/audioUtils.js
import { initAudioContext, loadClickBuffers } from '../../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../../services/soundSetService';

/**
 * Check and fix potential audio issues
 * Call this when initializing the audio context to ensure everything is working properly
 */
export const checkAndFixAudioIssues = async ({
  audioCtxRef,
  normalBufferRef,
  accentBufferRef,
  firstBufferRef,
  volumeRef
}) => {
  console.log("Running audio diagnosis and troubleshooting...");
  
  // 1. Check audio context state
  if (!audioCtxRef.current) {
    console.error("Audio context is null - creating new one");
    audioCtxRef.current = initAudioContext();
  }
  
  if (audioCtxRef.current.state === 'suspended') {
    console.warn("Audio context is suspended - attempting to resume");
    try {
      await audioCtxRef.current.resume();
      console.log("Successfully resumed audio context");
    } catch (err) {
      console.error("Failed to resume audio context:", err);
    }
  }
  
  // 2. Check if buffers are loaded
  const bufferStatus = {
    normal: !!normalBufferRef.current,
    accent: !!accentBufferRef.current,
    first: !!firstBufferRef.current
  };
  
  console.log("Buffer status:", bufferStatus);
  
  if (!bufferStatus.normal || !bufferStatus.accent || !bufferStatus.first) {
    console.warn("Some buffers are missing - reloading all buffers");
    try {
      const soundSet = await getActiveSoundSet();
      await loadClickBuffers({
        audioCtx: audioCtxRef.current,
        normalBufferRef,
        accentBufferRef,
        firstBufferRef,
        soundSet
      });
      console.log("Successfully reloaded audio buffers");
    } catch (err) {
      console.error("Failed to reload audio buffers:", err);
      
      // Fallback to default click sounds if custom sound set fails
      try {
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
        console.log("Loaded fallback click sounds");
      } catch (fallbackErr) {
        console.error("Critical error - even fallback sounds failed to load:", fallbackErr);
      }
    }
  }
  
  // 3. Test sound playback
  const testSoundPlayback = () => {
    if (normalBufferRef.current) {
      try {
        const testSource = audioCtxRef.current.createBufferSource();
        testSource.buffer = normalBufferRef.current;
        
        const testGain = audioCtxRef.current.createGain();
        testGain.gain.value = 0.1; // Low volume for test sound
        
        testSource.connect(testGain);
        testGain.connect(audioCtxRef.current.destination);
        
        // Play a very short test sound
        testSource.start();
        setTimeout(() => {
          testSource.stop();
          testSource.disconnect();
          testGain.disconnect();
        }, 50);
        
        console.log("Test sound played successfully");
        return true;
      } catch (err) {
        console.error("Test sound playback failed:", err);
        return false;
      }
    } else {
      console.error("Cannot test sound - normal buffer is null");
      return false;
    }
  };
  
  const testResult = testSoundPlayback();
  
  // 4. Check audio gain/volume settings
  console.log("Current volume setting:", volumeRef.current);
  if (volumeRef.current === 0) {
    console.warn("Volume is set to 0 - no sound will be heard");
  } else if (volumeRef.current < 0.1) {
    console.warn("Volume is very low - sound may be difficult to hear");
  }
  
  return {
    contextState: audioCtxRef.current.state,
    buffers: bufferStatus,
    testPlayback: testResult,
    volume: volumeRef.current
  };
};