// src/components/metronome/MultiCircleMode/hooks/useAudioContext.js
import { useCallback } from 'react';
import { initAudioContext, loadClickBuffers } from '../../../../hooks/useMetronomeLogic/audioBuffers';
import { getActiveSoundSet } from '../../../../services/soundSetService';

// Bundled clicks used when neither the API nor the default loader delivered a buffer
const DIRECT_SOUND_PATHS = {
  normal: '/assets/audio/click_new.wav',
  accent: '/assets/audio/click_new_accent.wav',
  first: '/assets/audio/click_new_first.wav'
};

/**
 * Resume a suspended context; a failure is logged and otherwise ignored.
 */
async function resumeIfSuspended(ctx, label) {
  if (ctx.state !== 'suspended') return;
  console.log(`[MultiCircle] Resuming ${label}...`);
  try {
    await ctx.resume();
    console.log(`[MultiCircle] Successfully resumed ${label}`);
  } catch (err) {
    console.warn(`[MultiCircle] Could not resume ${label}:`, err);
  }
}

/**
 * Fetch and decode one bundled click; resolves to null when anything fails.
 */
async function loadDirectSound(audioCtx, path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return await audioCtx.decodeAudioData(await response.arrayBuffer());
  } catch (e) {
    console.error(`[MultiCircle] Error loading direct sound ${path}:`, e);
    return null;
  }
}

/**
 * Fill every empty buffer ref straight from the bundled clicks.
 */
async function loadMissingDirectSounds(audioCtx, { normalBufferRef, accentBufferRef, firstBufferRef }) {
  if (!normalBufferRef.current) {
    console.log("[MultiCircle] Loading normal click directly");
    normalBufferRef.current = await loadDirectSound(audioCtx, DIRECT_SOUND_PATHS.normal);
  }
  if (!accentBufferRef.current) {
    console.log("[MultiCircle] Loading accent click directly");
    accentBufferRef.current = await loadDirectSound(audioCtx, DIRECT_SOUND_PATHS.accent);
  }
  if (!firstBufferRef.current) {
    console.log("[MultiCircle] Loading first click directly");
    firstBufferRef.current = await loadDirectSound(audioCtx, DIRECT_SOUND_PATHS.first);
  }
}

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
      if (window._multiCircleAudioContext && window._multiCircleAudioContext.state !== 'closed') {
        // A shared context is available
        console.log("[MultiCircle] Found shared audio context");
        audioCtxRef.current = window._multiCircleAudioContext;
        await resumeIfSuspended(audioCtxRef.current, 'shared audio context');
      } else if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        // We already have our own context
        console.log("[MultiCircle] Using existing audio context");
        await resumeIfSuspended(audioCtxRef.current, 'existing audio context');
      } else {
        // Create a new context if needed
        console.log("[MultiCircle] Creating new audio context");
        try {
          const newCtx = initAudioContext();
          if (!newCtx) {
            throw new Error('Failed to create AudioContext');
          }
          
          audioCtxRef.current = newCtx;
          window._multiCircleAudioContext = newCtx;
          await resumeIfSuspended(newCtx, 'new audio context');
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
          
          await loadMissingDirectSounds(audioCtxRef.current, { normalBufferRef, accentBufferRef, firstBufferRef });
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
    
    // Make sure audio context is running (decodeAudioData might still work if resuming fails)
    await resumeIfSuspended(audioCtxRef.current, 'audio context');
    
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
      
      try {
        await loadMissingDirectSounds(audioCtxRef.current, { normalBufferRef, accentBufferRef, firstBufferRef });
        
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
