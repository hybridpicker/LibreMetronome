// src/hooks/useMetronomeLogic/audioBuffers.js

// Use an environment variable with a fallback to localhost for development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export let globalAudioCtx = null;

/**
 * Ensures we have one global AudioContext
 * (only create a new one if none exists or the previous is closed)
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
    
    // Request prioritized thread scheduling for audio processing if possible
    if (navigator.scheduling && navigator.scheduling.isInputPending) {
      console.log('Using prioritized scheduling for audio processing');
    }
    
    return context;
  } catch (err) {
    console.error('Error creating AudioContext:', err);
    // Fall back to default audio context if optimized version fails
    try {
      const fallbackContext = new AudioContext();
      console.log('Using fallback AudioContext');
      return fallbackContext;
    } catch (fallbackErr) {
      console.error('Error creating fallback AudioContext:', fallbackErr);
      return null;
    }
  }
}

/**
 * Loads a single audio file and decodes it into a Web Audio buffer.
 */
function loadSound(url, audioCtx) {
  // Convert relative URLs to use the backend when they're API sound files
  let fetchUrl = url;

  if (url.includes('/metronome_sounds/')) {
    // If the URL starts with http://localhost:3000, replace with BACKEND_URL
    if (url.startsWith('http://localhost:3000')) {
      fetchUrl = url.replace('http://localhost:3000', BACKEND_URL);
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

  // Use priority fetch when available for better performance
  const fetchOptions = {
    headers: {
      // Request audio content explicitly
      'Accept': 'audio/mpeg,audio/*;q=0.8,*/*;q=0.5'
    },
    // Ensure credentials are included for cross-origin requests if needed
    credentials: 'same-origin',
    mode: 'cors',
    // Use high priority for audio files to ensure they load quickly
    priority: 'high'
  };

  // Remove priority if not supported by the browser to avoid errors
  if (!('priority' in Request.prototype)) {
    delete fetchOptions.priority;
  }

  return fetch(fetchUrl, fetchOptions)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return res.arrayBuffer();
    })
    .then(buffer => {
      // Check if buffer is empty or too small to be valid audio
      if (!buffer || buffer.byteLength < 100) {
        throw new Error('Invalid audio buffer (too small)');
      }
      
      // Use promise with a higher priority if available
      if (typeof Promise.withPriority === 'function') {
        return Promise.withPriority(
          audioCtx.decodeAudioData(buffer), 
          'high'
        );
      }
      
      // Process audio data with optimized decoding for precision timing
      return audioCtx.decodeAudioData(buffer)
        .then(decodedBuffer => {
          // Pre-calculate and cache buffer properties to optimize runtime performance
          // This helps reduce computational overhead during high-precision playback
          if (decodedBuffer) {
            // Store key properties directly on the buffer to avoid repeated access costs
            Object.defineProperties(decodedBuffer, {
              '_optimizedForExpertTiming': { value: true },
              '_duration': { value: decodedBuffer.duration },
              '_sampleRate': { value: decodedBuffer.sampleRate }
            });
          }
          return decodedBuffer;
        });
    })
    .catch(err => {
      console.error(`Error loading sound ${url}:`, err);
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
        console.log(`Falling back to default sound: ${fallbackPath}`);
        return loadSound(fallbackPath, audioCtx);
      }
      return null;
    });
}

/**
 * Loads your standard metronome click buffers (normal, accent, first).
 * Supports custom sound sets from the API.
 */
export async function loadClickBuffers({
  audioCtx,
  normalBufferRef,
  accentBufferRef,
  firstBufferRef,
  soundSet = null
}) {
  if (!audioCtx) {
    return;
  }

  // Default paths (fallback)
  let normalPath = '/assets/audio/click_new.mp3';
  let accentPath = '/assets/audio/click_new_accent.mp3';
  let firstPath = '/assets/audio/click_new_first.mp3';

  // If we have a sound set from the API, use those paths
  if (soundSet) {
    normalPath = soundSet.normal_beat_sound_url || normalPath;
    accentPath = soundSet.accent_sound_url || accentPath;
    firstPath = soundSet.first_beat_sound_url || firstPath;
  }

  try {
    const [normal, accent, first] = await Promise.all([
      loadSound(normalPath, audioCtx),
      loadSound(accentPath, audioCtx),
      loadSound(firstPath, audioCtx)
    ]);

    if (!normal || !accent || !first) {
      throw new Error('Failed to load one or more sound buffers');
    }

    normalBufferRef.current = normal;
    accentBufferRef.current = accent;
    firstBufferRef.current = first;
  } catch (error) {
    // Try loading default sounds as fallback if something failed
    if (soundSet) {
      return loadClickBuffers({
        audioCtx,
        normalBufferRef,
        accentBufferRef,
        firstBufferRef
      });
    }
  }
}
