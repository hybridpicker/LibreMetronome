// src/components/metronome/MultiCircleMode/hooks/useAudioContext.js
import { useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../../services/soundSetService';
import { debugLog } from '../utils/debugUtils';

/**
 * Hook to manage audio context initialization and sound loading
 */
export function useAudioContext(audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef) {
  /**
   * Initialize or resume AudioContext safely
   */
  const safelyInitAudioContext = useCallback(async () => {
    try {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        if (audioCtxRef.current.state === 'suspended') {
          try {
            await audioCtxRef.current.resume();
            debugLog('Successfully resumed existing AudioContext');
            return audioCtxRef.current;
          } catch (err) {
            debugLog('Could not resume AudioContext, will create new one:', err);
          }
        } else {
          debugLog('Using existing running AudioContext');
          return audioCtxRef.current;
        }
      }
      debugLog('Creating new AudioContext');
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
      return audioCtxRef.current;
    } catch (err) {
      console.error('Fatal error initializing audio:', err);
      return null;
    }
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);
  
  /**
   * Check if audio is ready to use
   */
  const isAudioReady = useCallback(() => {
    return audioCtxRef.current &&
           audioCtxRef.current.state === 'running' &&
           normalBufferRef.current &&
           accentBufferRef.current &&
           firstBufferRef.current;
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);
  
  /**
   * Manually reload sound samples
   */
  const reloadSounds = useCallback(async () => {
    debugLog("Reloading sounds manually");
    if (!audioCtxRef.current) {
      console.error("No audio context available for reload");
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
      debugLog("Successfully reloaded sounds");
      return true;
    } catch (error) {
      console.error("Error reloading sounds:", error);
      try {
        // Fallback to default sounds
        await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
        debugLog("Loaded fallback sounds");
        return true;
      } catch (err) {
        console.error("Failed to load fallback sounds:", err);
        return false;
      }
    }
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);
  
  return {
    safelyInitAudioContext,
    isAudioReady,
    reloadSounds
  };
}