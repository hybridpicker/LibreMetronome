// src/hooks/useMetronomeLogic/audioBuffers.js

// Use an environment variable with a fallback to localhost for development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export let globalAudioCtx = null;

/**
 * Ensures we have one global AudioContext
 * (only create a new one if none exists or the previous is closed)
 * 
 * Note: Modern browsers require user interaction to start the audio context.
 * You must call resumeAudioContext() after a user gesture (like a click event)
 */
export function initAudioContext() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.error('Web Audio API is not supported in this browser');
      return null;
    }

    // Create and return a new audio context optimized for expert-level precision
    const context = new AudioContext({
      // Use 48kHz sample rate for professional audio quality (if supported)
      sampleRate: 48000,
      // Set latencyHint to 'interactive' for better timing precision
      latencyHint: 'interactive'
    });
    
    console.log(`New AudioContext created, state: ${context.state}, sample rate: ${context.sampleRate}Hz`);
    
    // Add user info about the context state
    if (context.state === 'suspended') {
      console.log('Audio context is suspended and requires user interaction to start');
    }
    
    // Request prioritized thread scheduling for audio processing if possible
    if (navigator.scheduling && navigator.scheduling.isInputPending) {
      console.log('Using prioritized scheduling for audio processing');
    }
    
    // Store in window for debugging
    window._audioContext = context;
    
    return context;
  } catch (err) {
    console.error('Error creating AudioContext:', err);
    // Fall back to default audio context if optimized version fails
    try {
      const fallbackContext = new AudioContext();
      console.log('Using fallback AudioContext');
      window._audioContext = fallbackContext;
      return fallbackContext;
    } catch (fallbackErr) {
      console.error('Error creating fallback AudioContext:', fallbackErr);
      return null;
    }
  }
}

/**
 * Attempts to resume the audio context.
 * Must be called in response to a user gesture (click, tap, etc.)
 */
export async function resumeAudioContext(audioCtx) {
  if (!audioCtx) return false;
  
  if (audioCtx.state === 'suspended') {
    try {
      console.log('Attempting to resume suspended audio context...');
      await audioCtx.resume();
      console.log(`Audio context resumed, state is now: ${audioCtx.state}`);
      return audioCtx.state === 'running';
    } catch (err) {
      console.error('Failed to resume audio context:', err);
      return false;
    }
  }
  
  return audioCtx.state === 'running';
}

/**
 * Loads a single audio file and decodes it into a Web Audio buffer.
 */
function loadSound(url, audioCtx) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Loading sound: ${url}`);
      
      // Handle null or undefined URLs
      if (!url) {
        console.error("Null or undefined URL provided to loadSound");
        throw new Error("Invalid URL provided");
      }
      
      // Convert relative URLs to use the backend when they're API sound files
      let fetchUrl = url;

      if (url.includes('/metronome_sounds/')) {
        // If the URL starts with http://localhost:3000 or http://localhost:3001, replace with BACKEND_URL
        if (url.startsWith('http://localhost:3000') || url.startsWith('http://localhost:3001')) {
          fetchUrl = url.replace(/http:\/\/localhost:(3000|3001)/, BACKEND_URL);
        }
        // If the URL doesn't start with http/https, prepend BACKEND_URL
        else if (!(url.startsWith('http://') || url.startsWith('https://'))) {
          fetchUrl = `${BACKEND_URL}${url}`;
        } else {
          // URL is already absolute (http/https), so we keep it as is
          fetchUrl = url;
        }
      } else {
        // Non-metronome_sounds paths remain unchanged
        fetchUrl = url;
      }

      // Add a timestamp to bust cache if needed
      const cacheBuster = `${fetchUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;
      fetchUrl = `${fetchUrl}${cacheBuster}`;
      
      console.log(`Fetching sound from: ${fetchUrl}`);

      // Use priority fetch when available for better performance
      const fetchOptions = {
        headers: {
          // Request audio content explicitly
          'Accept': 'audio/mpeg,audio/*;q=0.8,*/*;q=0.5'
        },
        // Ensure credentials are included for cross-origin requests if needed
        credentials: 'include',
        mode: 'cors',
        // Use high priority for audio files to ensure they load quickly
        priority: 'high',
        // Add timeout for fetch
        signal: AbortSignal.timeout(10000) // 10 second timeout
      };

      // Remove priority if not supported by the browser to avoid errors
      if (!('priority' in Request.prototype)) {
        delete fetchOptions.priority;
      }

      let response;
      try {
        response = await fetch(fetchUrl, fetchOptions);
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        console.error(`Fetch error for ${fetchUrl}:`, fetchError);
        // If the URL is from metronome_sounds, try a direct fallback
        if (url.includes('/metronome_sounds/')) {
          let fallbackPath;
          if (url.includes('first_')) {
            fallbackPath = '/assets/audio/click_new_first.mp3';
          } else if (url.includes('accent_') || url.includes('second_')) {
            fallbackPath = '/assets/audio/click_new_accent.mp3';
          } else {
            fallbackPath = '/assets/audio/click_new.mp3';
          }
          console.log(`Fetch failed. Falling back to default sound: ${fallbackPath}`);
          resolve(await loadSound(fallbackPath, audioCtx));
          return;
        }
        throw fetchError;
      }

      try {
        const buffer = await response.arrayBuffer();
        
        // Check if buffer is empty or too small to be valid audio
        if (!buffer || buffer.byteLength < 100) {
          throw new Error('Invalid audio buffer (too small)');
        }
        
        // Decode the audio data
        let decodedBuffer;
        try {
          // Use promise with a higher priority if available
          if (typeof Promise.withPriority === 'function') {
            decodedBuffer = await Promise.withPriority(
              audioCtx.decodeAudioData(buffer), 
              'high'
            );
          } else {
            decodedBuffer = await audioCtx.decodeAudioData(buffer);
          }
        } catch (decodeError) {
          console.error(`Error decoding audio data for ${fetchUrl}:`, decodeError);
          throw decodeError;
        }
        
        // Pre-calculate and cache buffer properties to optimize runtime performance
        if (decodedBuffer) {
          // Store key properties directly on the buffer to avoid repeated access costs
          Object.defineProperties(decodedBuffer, {
            '_optimizedForExpertTiming': { value: true },
            '_duration': { value: decodedBuffer.duration },
            '_sampleRate': { value: decodedBuffer.sampleRate }
          });
          console.log(`Sound loaded successfully: ${url}, duration: ${decodedBuffer.duration.toFixed(2)}s`);
          resolve(decodedBuffer);
        } else {
          throw new Error('Decoded buffer is null or undefined');
        }
      } catch (processError) {
        console.error(`Error processing sound ${url}:`, processError);
        
        // Fall back to default sounds if loading fails
        if (url.includes('/metronome_sounds/')) {
          let fallbackPath;
          if (url.includes('first_')) {
            fallbackPath = '/assets/audio/click_new_first.mp3';
          } else if (url.includes('accent_') || url.includes('second_')) {
            fallbackPath = '/assets/audio/click_new_accent.mp3';
          } else {
            fallbackPath = '/assets/audio/click_new.mp3';
          }
          console.log(`Processing failed. Falling back to default sound: ${fallbackPath}`);
          resolve(await loadSound(fallbackPath, audioCtx));
          return;
        }
        reject(processError);
      }
    } catch (error) {
      console.error(`Critical error loading sound ${url}:`, error);
      reject(error);
    }
  });
}

/**
 * Helper function to get the active sound set ID from cookie
 */
function getActiveSoundSetIdFromCookie() {
  if (typeof document === 'undefined') return null;
  
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith('activeSoundSetId=')) {
        cookieValue = decodeURIComponent(cookie.substring('activeSoundSetId='.length));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Loads your standard metronome click buffers (normal, accent, first).
 * Supports custom sound sets from the API with enhanced error handling.
 * Prioritizes cookie-based sound set selection for better consistency.
 * @returns {Promise<boolean>} - Returns true if successfully loaded all sounds
 */
export async function loadClickBuffers({
  audioCtx,
  normalBufferRef,
  accentBufferRef,
  firstBufferRef,
  soundSet = null
}) {
  if (!audioCtx) {
    console.error("No audio context provided to loadClickBuffers");
    return false;
  }

  // Default paths (fallback)
  let normalPath = '/assets/audio/click_new.mp3';
  let accentPath = '/assets/audio/click_new_accent.mp3';
  let firstPath = '/assets/audio/click_new_first.mp3';

  // Check cookie first for most consistent sound selection
  const cookieSoundSetId = getActiveSoundSetIdFromCookie();
  
  // If we have a cookie set, ensure our sound set matches it
  // This is vital for proper sound reloading with cookies
  if (cookieSoundSetId) {
    const cookieId = cookieSoundSetId.toString();
    
    if (soundSet && soundSet.id && soundSet.id.toString() !== cookieId) {
      console.log(`Cookie sound set ID (${cookieId}) doesn't match provided sound set (${soundSet.id}), using cookie preference`);
      // We'll continue and handle this in the path selection below
    }
    
    // Cookie-based sound set selection
    if (cookieId === 'default-woodblock' || cookieId === 'woodblock') {
      console.log('Using woodblock sounds from cookie preference');
      normalPath = '/metronome_sounds/wood_normal_sound.mp3';
      accentPath = '/metronome_sounds/wood_accent_sound.mp3';
      firstPath = '/metronome_sounds/wood_first_sound.mp3';
    } else if (cookieId === 'default-drums' || cookieId === 'drums') {
      console.log('Using drum sounds from cookie preference');
      normalPath = '/metronome_sounds/drum_normal_sound.mp3';
      accentPath = '/metronome_sounds/drum_accent_sound.mp3';
      firstPath = '/metronome_sounds/drum_first_sound.mp3';
    } else if (soundSet && soundSet.id && soundSet.id.toString() === cookieId) {
      // Use the provided sound set if it matches the cookie
      console.log(`Using sound set (${soundSet.name}) from API that matches cookie ID: ${cookieId}`);
      normalPath = soundSet.normal_beat_sound_url || normalPath;
      accentPath = soundSet.accent_sound_url || accentPath;
      firstPath = soundSet.first_beat_sound_url || firstPath;
    } else {
      // Cookie refers to a custom sound set but we don't have its details
      // We'll try to load it directly from standard API paths
      console.log(`Using direct path construction for cookie sound set ID: ${cookieId}`);
      // Typically each sound set has its own directory structure
      normalPath = `/api/sound-sets/${cookieId}/normal-beat-sound/`;
      accentPath = `/api/sound-sets/${cookieId}/accent-sound/`;
      firstPath = `/api/sound-sets/${cookieId}/first-beat-sound/`;
    }
  } else if (soundSet) {
    // No cookie set, use the provided sound set
    console.log(`Loading sound set from API: ${soundSet.name}`);
    normalPath = soundSet.normal_beat_sound_url || normalPath;
    accentPath = soundSet.accent_sound_url || accentPath;
    firstPath = soundSet.first_beat_sound_url || firstPath;
  }
  
  console.log(`Sound paths:`, { normalPath, accentPath, firstPath });

  try {
    // Load sounds sequentially instead of in parallel for better reliability
    console.log("Loading normal beat sound...");
    const normal = await loadSound(normalPath, audioCtx);
    
    console.log("Loading accent sound...");
    const accent = await loadSound(accentPath, audioCtx);
    
    console.log("Loading first beat sound...");
    const first = await loadSound(firstPath, audioCtx);

    if (!normal || !accent || !first) {
      throw new Error('Failed to load one or more sound buffers');
    }

    normalBufferRef.current = normal;
    accentBufferRef.current = accent;
    firstBufferRef.current = first;
    
    console.log("All sound buffers loaded successfully!");
    
    // Make the loaded buffers available for the debug helper
    if (window.metronomeDebug) {
      window.metronomeDebug.audioBuffers = {
        normal: normal,
        accent: accent,
        first: first
      };
      window.metronomeDebug.audioContext = audioCtx;
    }
    
    return true;
  } catch (error) {
    console.error("Error loading sound buffers:", error);
    
    // Try loading default sounds as fallback if something failed with custom sounds
    if (soundSet || cookieSoundSetId) {
      console.log("Falling back to default sounds...");
      try {
        // Use default paths (clear soundSet to use defaults)
        return await loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet: null
        });
      } catch (fallbackError) {
        console.error("Even fallback sounds failed to load:", fallbackError);
        return false;
      }
    }
    return false;
  }
}
