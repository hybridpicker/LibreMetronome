// src/components/metronome/MultiCircleMode/index.js
import MultiCircleMetronome from './MultiCircleMetronome';
import CircleRenderer from './CircleRenderer';
import BeatVisualizer from './BeatVisualizer';
import AddCircleButton from './AddCircleButton';
import PlayButton from './PlayButton';
import TrainingStatus from './TrainingStatus';
import CircleControls from './CircleControls';
import { useMultiCircleLogic } from './hooks';

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

export {
  MultiCircleMetronome as default,
  CircleRenderer,
  BeatVisualizer,
  AddCircleButton,
  PlayButton,
  TrainingStatus,
  CircleControls,
  useMultiCircleLogic
};