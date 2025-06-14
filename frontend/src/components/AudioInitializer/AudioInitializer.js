import React, { useState, useEffect } from 'react';
import './AudioInitializer.css';

const AudioInitializer = ({ onInitialized }) => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    // Check if audio context already exists and is running
    if (window._audioContextInit && window._audioContextInit.state === 'running') {
      setIsAudioReady(true);
      if (onInitialized) onInitialized();
    }
  }, [onInitialized]);

  const initializeAudio = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      
      // Create or get existing audio context
      if (!window._audioContextInit || window._audioContextInit.state === 'closed') {
        window._audioContextInit = new AudioContext({
          sampleRate: 48000,
          latencyHint: 'interactive'
        });
      }

      // Resume if suspended
      if (window._audioContextInit.state === 'suspended') {
        await window._audioContextInit.resume();
      }

      // Play a silent sound to ensure activation
      const oscillator = window._audioContextInit.createOscillator();
      const gainNode = window._audioContextInit.createGain();
      gainNode.gain.value = 0.001;
      oscillator.connect(gainNode);
      gainNode.connect(window._audioContextInit.destination);
      oscillator.start();
      oscillator.stop(window._audioContextInit.currentTime + 0.1);

      console.log('Audio context initialized:', window._audioContextInit.state);
      
      setIsAudioReady(true);
      setHasUserInteracted(true);
      if (onInitialized) onInitialized();
      
      // Store initialization state
      sessionStorage.setItem('audioInitialized', 'true');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  // Check if audio was previously initialized in this session
  useEffect(() => {
    if (sessionStorage.getItem('audioInitialized') === 'true') {
      setHasUserInteracted(true);
    }
  }, []);

  if (isAudioReady) {
    return null;
  }

  return (
    <div className={`audio-initializer ${hasUserInteracted ? 'hidden' : ''}`}>
      <div className="audio-initializer-overlay">
        <div className="audio-initializer-content">
          <h2>Welcome to LibreMetronome</h2>
          <p>Click to enable audio and start using the metronome</p>
          <button 
            className="audio-init-button"
            onClick={initializeAudio}
          >
            Enable Audio & Start
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioInitializer;