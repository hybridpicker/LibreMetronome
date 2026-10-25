// src/components/metronome/MultiCircleMode/index.js
import MultiCircleMetronome from './MultiCircleMetronome';

// Fixed audio context initialization for MultiCircleMode
import { initAudioContext } from '../../../hooks/useMetronomeLogic/audioBuffers';

// Initialize a shared audio context immediately to avoid issues when switching to this mode
let sharedAudioContext;
try {
  sharedAudioContext = initAudioContext();
  
  // Try to resume it immediately
  if (sharedAudioContext) {
    sharedAudioContext.resume().then(() => {
      console.log("Audio context initialized and resumed for MultiCircleMode");
    }).catch(err => {
      console.warn("Failed to resume audio context:", err);
    });
  }
} catch (err) {
  console.error("Error creating shared audio context:", err);
}

// Make it globally available
if (sharedAudioContext) {
  window._multiCircleAudioContext = sharedAudioContext;
}

export default MultiCircleMetronome;
