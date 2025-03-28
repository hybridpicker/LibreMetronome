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
   * Enhanced with better error handling and multiple attempts
   */
  const safelyInitAudioContext = useCallback(async () => {
    console.log("[MultiCircle] Initializing audio context...");
    
    try {
      // First check if we have a shared context available
      if (window._multiCircleAudioContext && window._multiCircleAudioContext.state !== 'closed') {
        console.log("[MultiCircle] Found shared audio context");
        audioCtxRef.current = window._multiCircleAudioContext;
        
        if (audioCtxRef.current.state === 'suspended') {
          console.log("[MultiCircle] Resuming shared audio context...");
          try {
            await audioCtxRef.current.resume();
            console.log("[MultiCircle] Successfully resumed shared audio context");
          } catch (err) {
            console.warn("[MultiCircle] Could not resume shared audio context:", err);
          }
        }
      } 
      // Check if we already have our own context
      else if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        console.log("[MultiCircle] Using existing audio context");
        
        if (audioCtxRef.current.state === 'suspended') {
          console.log("[MultiCircle] Resuming existing audio context...");
          try {
            await audioCtxRef.current.resume();
            console.log("[MultiCircle] Successfully resumed existing audio context");
          } catch (err) {
            console.warn("[MultiCircle] Could not resume existing audio context:", err);
          }
        }
      } 
      // Create a new context if needed
      else {
        console.log("[MultiCircle] Creating new audio context");
        try {
          const newCtx = initAudioContext();
          if (!newCtx) {
            throw new Error('Failed to create AudioContext');
          }
          
          audioCtxRef.current = newCtx;
          window._multiCircleAudioContext = newCtx;
          
          if (newCtx.state === 'suspended') {
            console.log("[MultiCircle] Attempting to resume new audio context...");
            try {
              await newCtx.resume();
              console.log("[MultiCircle] Successfully resumed new audio context");
            } catch (err) {
              console.warn("[MultiCircle] Could not resume new audio context:", err);
            }
          }
        } catch (err) {
          console.error("[MultiCircle] Error creating audio context:", err);
          throw err;
        }
      }
      
      // Now load sound buffers
      console.log("[MultiCircle] Loading sound buffers...");
      try {
        // Try getting the active sound set first
        let soundLoaded = false;
        try {
          console.log("[MultiCircle] Attempting to load with active sound set");
          const soundSet = await getActiveSoundSet();
          soundLoaded = await loadClickBuffers({
            audioCtx: audioCtxRef.current,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef,
            soundSet
          });
          console.log("[MultiCircle] Sound set loaded successfully:", soundLoaded);
        } catch (soundSetError) {
          console.warn("[MultiCircle] Error loading with sound set:", soundSetError);
        }
        
        // If loading with sound set failed, try default sounds
        if (!soundLoaded) {
          console.log("[MultiCircle] Attempting to load default sounds");
          soundLoaded = await loadClickBuffers({
            audioCtx: audioCtxRef.current,
            normalBufferRef,
            accentBufferRef,
            firstBufferRef
          });
          
          console.log("[MultiCircle] Default sounds loaded:", soundLoaded);
        }
        
        // Final check if we have loaded all the necessary buffers
        if (!normalBufferRef.current || !accentBufferRef.current || !firstBufferRef.current) {
          console.warn("[MultiCircle] One or more sound buffers still not loaded");
          
          // One final attempt with hardcoded default paths
          console.log("[MultiCircle] Making one final attempt with hardcoded paths");
          
          const loadDirectSound = async (path) => {
            try {
              return await new Promise((resolve, reject) => {
                fetch(path)
                  .then(response => response.arrayBuffer())
                  .then(arrayBuffer => audioCtxRef.current.decodeAudioData(arrayBuffer))
                  .then(audioBuffer => resolve(audioBuffer))
                  .catch(error => reject(error));
              });
            } catch (e) {
              console.error(`Error loading direct sound ${path}:`, e);
              return null;
            }
          };
          
          if (!normalBufferRef.current) {
            console.log("[MultiCircle] Loading normal click directly");
            normalBufferRef.current = await loadDirectSound('/assets/audio/click_new.mp3');
          }
          
          if (!accentBufferRef.current) {
            console.log("[MultiCircle] Loading accent click directly");
            accentBufferRef.current = await loadDirectSound('/assets/audio/click_new_accent.mp3');
          }
          
          if (!firstBufferRef.current) {
            console.log("[MultiCircle] Loading first click directly");
            firstBufferRef.current = await loadDirectSound('/assets/audio/click_new_first.mp3');
          }
        }
      } catch (error) {
        console.error('[MultiCircle] Error loading sound buffers:', error);
        throw error;
      }
      
      return audioCtxRef.current;
    } catch (err) {
      console.error('[MultiCircle] Fatal error initializing audio:', err);
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
   * Manually reload sound samples with enhanced error handling
   */
  const reloadSounds = useCallback(async () => {
    console.log("[MultiCircle] Reloading sounds manually");
    
    // First make sure we have a valid audio context
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      console.log("[MultiCircle] No valid audio context for reload, creating new one");
      try {
        audioCtxRef.current = initAudioContext();
        
        if (!audioCtxRef.current) {
          console.error("[MultiCircle] Failed to create audio context");
          return false;
        }
        
        // Also update the shared context reference
        window._multiCircleAudioContext = audioCtxRef.current;
      } catch (err) {
        console.error("[MultiCircle] Error creating audio context:", err);
        return false;
      }
    }
    
    // Make sure audio context is running
    if (audioCtxRef.current.state === 'suspended') {
      console.log("[MultiCircle] Resuming audio context before loading sounds");
      try {
        await audioCtxRef.current.resume();
        console.log("[MultiCircle] Successfully resumed audio context");
      } catch (err) {
        console.warn("[MultiCircle] Could not resume audio context:", err);
        // Continue anyway, as decodeAudioData might still work
      }
    }
    
    // First try with active sound set
    let soundLoaded = false;
    try {
      console.log("[MultiCircle] Loading with active sound set");
      const soundSet = await getActiveSoundSet();
      soundLoaded = await loadClickBuffers({
        audioCtx: audioCtxRef.current,
        normalBufferRef,
        accentBufferRef,
        firstBufferRef,
        soundSet
      });
      
      if (soundLoaded) {
        console.log("[MultiCircle] Successfully loaded sounds with sound set");
      } else {
        console.log("[MultiCircle] loadClickBuffers returned false with sound set");
      }
    } catch (error) {
      console.error("[MultiCircle] Error loading sounds with sound set:", error);
    }
    
    // Try with fallback sounds if needed
    if (!soundLoaded) {
      try {
        console.log("[MultiCircle] Loading fallback sounds");
        soundLoaded = await loadClickBuffers({
          audioCtx: audioCtxRef.current,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef
        });
        
        if (soundLoaded) {
          console.log("[MultiCircle] Successfully loaded fallback sounds");
        } else {
          console.log("[MultiCircle] loadClickBuffers returned false with fallback sounds");
        }
      } catch (err) {
        console.error("[MultiCircle] Error loading fallback sounds:", err);
      }
    }
    
    // Direct load attempt if still not loaded
    if (!soundLoaded || !normalBufferRef.current || !accentBufferRef.current || !firstBufferRef.current) {
      console.log("[MultiCircle] Making final attempt with direct loading");
      
      const loadDirectSound = async (path) => {
        try {
          return await new Promise((resolve, reject) => {
            fetch(path)
              .then(response => {
                if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                return response.arrayBuffer();
              })
              .then(arrayBuffer => audioCtxRef.current.decodeAudioData(arrayBuffer))
              .then(audioBuffer => resolve(audioBuffer))
              .catch(error => reject(error));
          });
        } catch (e) {
          console.error(`[MultiCircle] Error loading direct sound ${path}:`, e);
          return null;
        }
      };
      
      try {
        if (!normalBufferRef.current) {
          console.log("[MultiCircle] Loading normal click directly");
          normalBufferRef.current = await loadDirectSound('/assets/audio/click_new.mp3');
        }
        
        if (!accentBufferRef.current) {
          console.log("[MultiCircle] Loading accent click directly");
          accentBufferRef.current = await loadDirectSound('/assets/audio/click_new_accent.mp3');
        }
        
        if (!firstBufferRef.current) {
          console.log("[MultiCircle] Loading first click directly");
          firstBufferRef.current = await loadDirectSound('/assets/audio/click_new_first.mp3');
        }
        
        // Check if we have all required buffers now
        soundLoaded = normalBufferRef.current && accentBufferRef.current && firstBufferRef.current;
        console.log("[MultiCircle] Direct loading result:", soundLoaded);
      } catch (err) {
        console.error("[MultiCircle] Error in direct loading:", err);
      }
    }
    
    return soundLoaded;
  }, [audioCtxRef, normalBufferRef, accentBufferRef, firstBufferRef]);
  
  return {
    safelyInitAudioContext,
    isAudioReady,
    reloadSounds
  };
}