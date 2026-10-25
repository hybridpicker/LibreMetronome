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
    // Check if we're in a test environment
    const isTestEnvironment = process.env.NODE_ENV === 'test';
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext && !isTestEnvironment) {
      console.error('Web Audio API is not supported in this browser');
      return null;
    }

    // iOS only grants reliable playback to an AudioContext unlocked by a user
    // gesture. Reuse that context across every metronome mode instead of
    // silently creating another suspended context for each view.
    const existingContext = globalAudioCtx || window._audioContextInit || window._audioContext;
    if (existingContext && existingContext.state !== 'closed') {
      globalAudioCtx = existingContext;
      window._audioContext = existingContext;
      window._audioContextInit = existingContext;
      return existingContext;
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
    window._audioContextInit = context;
    globalAudioCtx = context;
    
    return context;
  } catch (err) {
    console.error('Error creating AudioContext:', err);
    // Fall back to default audio context if optimized version fails
    try {
      const fallbackContext = new AudioContext();
      console.log('Using fallback AudioContext');
      window._audioContext = fallbackContext;
      window._audioContextInit = fallbackContext;
      globalAudioCtx = fallbackContext;
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
  
  // WebKit can expose an additional `interrupted` state after an iOS route or
  // app lifecycle change. Calling resume is required for both states.
  if (audioCtx.state !== 'running' && audioCtx.state !== 'closed') {
    try {
      console.log('Attempting to resume suspended audio context...');
      
      // First attempt with standard resume
      await audioCtx.resume();
      
      // If still not running, try alternative approaches
      if (audioCtx.state !== 'running') {
        console.log('Initial resume didn\'t work, trying additional methods...');
        
        // Create a silent audio buffer and play it to help unlock audio
        const silentBuffer = audioCtx.createBuffer(1, 1, 22050);
        const source = audioCtx.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(audioCtx.destination);
        source.start();
        
        // Try resume again after buffer play
        await audioCtx.resume();
        
        // Final status check
        if (audioCtx.state !== 'running') {
          console.warn(`Audio context still not running after multiple resume attempts. Current state: ${audioCtx.state}`);
        } else {
          console.log('Audio context successfully resumed after additional methods');
        }
      } else {
        console.log('Audio context resumed successfully on first attempt');
      }
      
      console.log(`Audio context final state: ${audioCtx.state}`);
      return audioCtx.state === 'running';
    } catch (err) {
      console.error('Failed to resume audio context:', err);
      return false;
    }
  } else if (audioCtx.state === 'closed') {
    console.error('Cannot resume a closed audio context');
    return false;
  }
  
  return audioCtx.state === 'running';
}

/**
 * Resume every shared context reference after an iOS app or visibility
 * interruption. References are de-duplicated because all modes normally point
 * to the same user-unlocked AudioContext.
 */
export async function resumeSharedAudioContexts() {
  const contexts = [...new Set([
    globalAudioCtx,
    window._audioContext,
    window._audioContextInit,
    window._multiCircleAudioContext
  ].filter((context) => context && context.state !== 'closed'))];

  const results = await Promise.all(contexts.map((context) => resumeAudioContext(context)));
  return contexts.length > 0 && results.every(Boolean);
}

const SOUND_FETCH_TIMEOUT_MS = 10000;
// Anything smaller cannot be a valid encoded audio file
const MIN_AUDIO_BYTES = 100;
const BACKEND_SOUND_DIR = '/metronome_sounds/';

/**
 * Backend sound URLs are relative to the Django server (or point at the local dev server).
 */
function resolveSoundUrl(url) {
  if (!url.includes(BACKEND_SOUND_DIR)) return url;
  // The dev server URLs are replaced by the backend
  if (url.startsWith('http://localhost:3000') || url.startsWith('http://localhost:3001')) {
    return url.replace(/http:\/\/localhost:(3000|3001)/, BACKEND_URL);
  }
  // Relative paths go to the backend; absolute http(s) URLs stay as they are
  if (!(url.startsWith('http://') || url.startsWith('https://'))) {
    return `${BACKEND_URL}${url}`;
  }
  return url;
}

/** Bundled click that stands in for a backend sound which cannot be loaded. */
function fallbackClickPath(url) {
  if (url.includes('first_')) return '/assets/audio/click_new_first.wav';
  if (url.includes('accent_') || url.includes('second_')) return '/assets/audio/click_new_accent.wav';
  return '/assets/audio/click_new.wav';
}

async function fetchSound(fetchUrl) {
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
    signal: AbortSignal.timeout(SOUND_FETCH_TIMEOUT_MS)
  };

  // Remove priority if not supported by the browser to avoid errors
  if (!('priority' in Request.prototype)) {
    delete fetchOptions.priority;
  }

  const response = await fetch(fetchUrl, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }
  return response;
}

async function decodeSound(response, audioCtx, fetchUrl, url) {
  const buffer = await response.arrayBuffer();

  if (!buffer || buffer.byteLength < MIN_AUDIO_BYTES) {
    throw new Error('Invalid audio buffer (too small)');
  }

  let decodedBuffer;
  try {
    // Use promise with a higher priority if available
    if (typeof Promise.withPriority === 'function') {
      decodedBuffer = await Promise.withPriority(audioCtx.decodeAudioData(buffer), 'high');
    } else {
      decodedBuffer = await audioCtx.decodeAudioData(buffer);
    }
  } catch (decodeError) {
    console.error(`Error decoding audio data for ${fetchUrl}:`, decodeError);
    throw decodeError;
  }

  if (!decodedBuffer) {
    throw new Error('Decoded buffer is null or undefined');
  }

  // Store key properties directly on the buffer to avoid repeated access costs
  Object.defineProperties(decodedBuffer, {
    '_optimizedForExpertTiming': { value: true },
    '_duration': { value: decodedBuffer.duration },
    '_sampleRate': { value: decodedBuffer.sampleRate }
  });
  console.log(`Sound loaded successfully: ${url}, duration: ${decodedBuffer.duration.toFixed(2)}s`);
  return decodedBuffer;
}

/**
 * Loads a single audio file and decodes it into a Web Audio buffer.
 * Backend sounds fall back to the bundled clicks when fetching or decoding fails.
 */
async function loadSound(url, audioCtx) {
  try {
    console.log(`Loading sound: ${url}`);

    // Handle null or undefined URLs
    if (!url) {
      console.error("Null or undefined URL provided to loadSound");
      throw new Error("Invalid URL provided");
    }

    // Add a timestamp to bust cache if needed
    const resolvedUrl = resolveSoundUrl(url);
    const fetchUrl = `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;
    console.log(`Fetching sound from: ${fetchUrl}`);

    const isBackendSound = url.includes(BACKEND_SOUND_DIR);

    let response;
    try {
      response = await fetchSound(fetchUrl);
    } catch (fetchError) {
      console.error(`Fetch error for ${fetchUrl}:`, fetchError);
      if (!isBackendSound) throw fetchError;
      const fallbackPath = fallbackClickPath(url);
      console.log(`Fetch failed. Falling back to default sound: ${fallbackPath}`);
      return await loadSound(fallbackPath, audioCtx);
    }

    try {
      return await decodeSound(response, audioCtx, fetchUrl, url);
    } catch (processError) {
      console.error(`Error processing sound ${url}:`, processError);
      if (!isBackendSound) {
        // Returned (not awaited) on purpose: it must not reach the "critical error" log below
        return Promise.reject(processError);
      }
      const fallbackPath = fallbackClickPath(url);
      console.log(`Processing failed. Falling back to default sound: ${fallbackPath}`);
      return await loadSound(fallbackPath, audioCtx);
    }
  } catch (error) {
    console.error(`Critical error loading sound ${url}:`, error);
    throw error;
  }
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

const DEFAULT_SOUND_PATHS = {
  normal: '/assets/audio/click_new.wav',
  accent: '/assets/audio/click_new_accent.wav',
  first: '/assets/audio/click_new_first.wav'
};

// Built-in sound sets that are selectable by cookie without an API record
const BUILT_IN_SOUND_SETS = {
  'default-woodblock': { label: 'woodblock', prefix: 'wood' },
  woodblock: { label: 'woodblock', prefix: 'wood' },
  'default-drums': { label: 'drum', prefix: 'drum' },
  drums: { label: 'drum', prefix: 'drum' }
};

const builtInSoundPaths = (prefix) => ({
  normal: `/metronome_sounds/${prefix}_normal_sound.mp3`,
  accent: `/metronome_sounds/${prefix}_accent_sound.mp3`,
  first: `/metronome_sounds/${prefix}_first_sound.mp3`
});

const soundSetPaths = (soundSet) => ({
  normal: soundSet.normal_beat_sound_url || DEFAULT_SOUND_PATHS.normal,
  accent: soundSet.accent_sound_url || DEFAULT_SOUND_PATHS.accent,
  first: soundSet.first_beat_sound_url || DEFAULT_SOUND_PATHS.first
});

/**
 * Decide which three sound files to load. A cookie preference wins over the
 * provided sound set; without either the bundled clicks are used.
 */
function resolveSoundPaths(soundSet, cookieSoundSetId) {
  if (cookieSoundSetId) {
    const cookieId = cookieSoundSetId.toString();
    const matchesProvidedSet = Boolean(soundSet && soundSet.id) && soundSet.id.toString() === cookieId;

    if (soundSet && soundSet.id && !matchesProvidedSet) {
      console.log(`Cookie sound set ID (${cookieId}) doesn't match provided sound set (${soundSet.id}), using cookie preference`);
    }

    const builtIn = BUILT_IN_SOUND_SETS[cookieId];
    if (builtIn) {
      console.log(`Using ${builtIn.label} sounds from cookie preference`);
      return builtInSoundPaths(builtIn.prefix);
    }
    if (matchesProvidedSet) {
      console.log(`Using sound set (${soundSet.name}) from API that matches cookie ID: ${cookieId}`);
      return soundSetPaths(soundSet);
    }
    // Cookie refers to a custom sound set but we don't have its details:
    // try the standard API paths directly
    console.log(`Using direct path construction for cookie sound set ID: ${cookieId}`);
    return {
      normal: `/api/sound-sets/${cookieId}/normal-beat-sound/`,
      accent: `/api/sound-sets/${cookieId}/accent-sound/`,
      first: `/api/sound-sets/${cookieId}/first-beat-sound/`
    };
  }

  if (soundSet) {
    console.log(`Loading sound set from API: ${soundSet.name}`);
    return soundSetPaths(soundSet);
  }
  return { ...DEFAULT_SOUND_PATHS };
}

const PROCEDURAL_CLICK_SECONDS = 0.045;
const PROCEDURAL_CLICK_DECAY = 95;
// Frequency (Hz) and amplitude of the synthesized fallback clicks
const PROCEDURAL_CLICKS = {
  normal: { frequency: 1650, amplitude: 0.64 },
  accent: { frequency: 2150, amplitude: 0.78 },
  first: { frequency: 2700, amplitude: 0.9 }
};

function createProceduralClick(audioCtx, frequency, amplitude) {
  const frameCount = Math.ceil(audioCtx.sampleRate * PROCEDURAL_CLICK_SECONDS);
  const buffer = audioCtx.createBuffer(1, frameCount, audioCtx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / audioCtx.sampleRate;
    const envelope = Math.exp(-time * PROCEDURAL_CLICK_DECAY);
    channel[frame] = amplitude * envelope * (
      0.82 * Math.sin(2 * Math.PI * frequency * time) +
      0.18 * Math.sin(2 * Math.PI * frequency * 2.03 * time)
    );
  }
  return buffer;
}

/**
 * The bundled samples should always be available, but a procedural click
 * prevents a professional practice session from failing silently if WebKit
 * cannot fetch or decode an asset.
 */
function loadProceduralClicks(audioCtx, normalBufferRef, accentBufferRef, firstBufferRef) {
  try {
    const { normal, accent, first } = PROCEDURAL_CLICKS;
    normalBufferRef.current = createProceduralClick(audioCtx, normal.frequency, normal.amplitude);
    accentBufferRef.current = createProceduralClick(audioCtx, accent.frequency, accent.amplitude);
    firstBufferRef.current = createProceduralClick(audioCtx, first.frequency, first.amplitude);
    console.warn('Using procedural metronome clicks as an audio fallback');
    return true;
  } catch (fallbackError) {
    console.error('Unable to create procedural fallback clicks:', fallbackError);
    return false;
  }
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
  soundSet = null,
  ignorePreferences = false
}) {
  if (!audioCtx) {
    console.error("No audio context provided to loadClickBuffers");
    return false;
  }

  // Check cookie first for most consistent sound selection
  const cookieSoundSetId = ignorePreferences ? null : getActiveSoundSetIdFromCookie();
  if (ignorePreferences) soundSet = null;

  const { normal: normalPath, accent: accentPath, first: firstPath } = resolveSoundPaths(soundSet, cookieSoundSetId);
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
      window.metronomeDebug.audioBuffers = { normal, accent, first };
      window.metronomeDebug.audioContext = audioCtx;
    }
    
    return true;
  } catch (error) {
    console.error("Error loading sound buffers:", error);
    
    // Try loading default sounds as fallback if something failed with custom sounds
    if (!ignorePreferences && (soundSet || cookieSoundSetId)) {
      console.log("Falling back to default sounds...");
      try {
        // Ignore a stale preference on this retry. Without this guard, a
        // missing custom set recursively requests the same unavailable URL.
        return await loadClickBuffers({
          audioCtx,
          normalBufferRef,
          accentBufferRef,
          firstBufferRef,
          soundSet: null,
          ignorePreferences: true
        });
      } catch (fallbackError) {
        console.error("Even fallback sounds failed to load:", fallbackError);
        return false;
      }
    }
    return loadProceduralClicks(audioCtx, normalBufferRef, accentBufferRef, firstBufferRef);
  }
}
