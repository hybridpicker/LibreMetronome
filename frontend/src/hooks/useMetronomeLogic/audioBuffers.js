// src/hooks/useMetronomeLogic/audioBuffers.js
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
    
    // Create and return a new audio context
    const context = new AudioContext();
    console.log('New AudioContext created, state:', context.state);
    return context;
  } catch (err) {
    console.error('Error creating AudioContext:', err);
    return null;
  }
}

/**
 * Loads a single audio file and decodes it into a Web Audio buffer.
 */
function loadSound(url, audioCtx) {
  // Convert relative URLs to use the Django backend when they're API sound files
  let fetchUrl = url;
  if (url.includes('/metronome_sounds/')) {
    if (url.startsWith('http://localhost:3000')) {
      // Replace frontend domain with backend domain
      fetchUrl = url.replace('http://localhost:3000', 'http://localhost:8000');
      
    } else if (!(url.startsWith('http://') || url.startsWith('https://'))) {
      fetchUrl = `http://localhost:8000${url}`;
      
    } else {
      fetchUrl = url;
    }
  } else {
    fetchUrl = url;
  }
  
  // Add a timestamp to bust cache if needed
  const cacheBuster = `${fetchUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;
  fetchUrl = `${fetchUrl}${cacheBuster}`;
  
  return fetch(fetchUrl, {
    headers: {
      // Request audio content explicitly
      'Accept': 'audio/mpeg,audio/*;q=0.8,*/*;q=0.5'
    },
    // Ensure credentials are included for cross-origin requests if needed
    credentials: 'same-origin',
    mode: 'cors'
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return res.arrayBuffer();
    })
    .then(buffer => {
      // Check if buffer is empty or too small to be valid audio
      if (!buffer || buffer.byteLength < 100) {
        
        throw new Error('Invalid audio buffer (too small)');
      }
      
      return audioCtx.decodeAudioData(buffer);
    })
    .catch(err => {
      
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
        return loadSound(fallbackPath, audioCtx);
      }
      return null;
    });
}

/**
 * Loads your standard metronome click buffers (normal, accent, first).
 * Now supports custom sound sets from the API
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
    
    
    
  } else {
    
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
    
    // Try loading default sounds as fallback
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