// src/components/Menu/DirectSoundPreview.js
import React, { useState, useEffect, useRef } from 'react';
import { getActiveSoundSet } from '../../services/soundSetService';

// Simple component that directly plays sounds without relying on events
const DirectSoundPreview = ({ volume = 1.0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState(null);
  const [soundPaths, setSoundPaths] = useState({
    first: null,
    accent: null,
    normal: null
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    console.log("[DirectSoundPreview] Updated soundPaths:", soundPaths);
  }, [soundPaths]);
  
  // Refs for audio context and buffers
  const audioContextRef = useRef(null);
  const audioBuffersRef = useRef({});
  
  // Load the active sound set and prepare audio buffers
  useEffect(() => {
    const loadSoundSet = async () => {
      try {
        setIsLoading(true);
        
        // Get the active sound set
        const soundSet = await getActiveSoundSet();
        if (!soundSet) {
          console.error('No active sound set found');
          setIsLoading(false);
          return;
        }
        
        console.log('Direct preview using sound set:', soundSet);
        
        // Set sound paths
        setSoundPaths({
          first: soundSet.first_beat_sound_url,
          accent: soundSet.accent_sound_url,
          normal: soundSet.normal_beat_sound_url
        });
        
        // Removed automatic creation of AudioContext.
        // The AudioContext will be created on demand in the playSound function.
        
        // Load the sound files
        await loadSoundBuffers(
          audioContextRef.current,
          audioBuffersRef.current,
          {
            first: soundSet.first_beat_sound_url,
            accent: soundSet.accent_sound_url,
            normal: soundSet.normal_beat_sound_url
          }
        );
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading sound set:', error);
        setIsLoading(false);
      }
    };
    
    loadSoundSet();
    
    // Cleanup
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // audioContextRef.current.close();
      }
    };
  }, []);
  
  // Function to load sound buffers
  const loadSoundBuffers = async (context, buffers, paths) => {
    const baseUrl = 'http://localhost:8000'; // Base URL for sounds
    
    for (const [type, path] of Object.entries(paths)) {
      try {
        console.log(`Loading ${type} sound from ${baseUrl}${path}`);
        const response = await fetch(`${baseUrl}${path}`);
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        
        buffers[type] = audioBuffer;
        console.log(`Loaded ${type} sound buffer`);
      } catch (error) {
        console.error(`Error loading ${type} sound:`, error);
      }
    }
  };
  
  // Function to play a sound
  const playSound = async (type) => {
    if (isPlaying) return;
    
    try {
      // Fetch the latest active sound set and update soundPaths and audio buffers
      const soundSet = await getActiveSoundSet();
      if (soundSet) {
        setSoundPaths({
          first: soundSet.first_beat_sound_url,
          accent: soundSet.accent_sound_url,
          normal: soundSet.normal_beat_sound_url
        });
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        await loadSoundBuffers(
          audioContextRef.current,
          audioBuffersRef.current,
          {
            first: soundSet.first_beat_sound_url,
            accent: soundSet.accent_sound_url,
            normal: soundSet.normal_beat_sound_url
          }
        );
      }
      setIsPlaying(true);
      setSelectedSound(type);
      
      console.log(`⏺️ Playing ${type} sound preview`);
      console.log(`[DirectSoundPreview] Sound details: type=${type}, soundPaths=${JSON.stringify(soundPaths)}, audioBuffers available: ${JSON.stringify(Object.keys(audioBuffersRef.current))}`);
      
      // Make sure we have a context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      console.log(`[DirectSoundPreview] [playSound] AudioContext state after resume: ${audioContextRef.current.state}`);
      
      // Make sure we have the buffer
      if (!audioBuffersRef.current[type]) {
        console.error(`No buffer available for ${type}`);
        setIsPlaying(false);
        setSelectedSound(null);
        return;
      }
      
      // Create source and play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffersRef.current[type];
      
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      source.start(0);
      
      // Reset state when done
      source.onended = () => {
        setIsPlaying(false);
        setSelectedSound(null);
      };
      
      // Safety reset in case onended doesn't fire
      setTimeout(() => {
        setIsPlaying(false);
        setSelectedSound(null);
      }, 500);
      
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
      setSelectedSound(null);
    }
  };
  
  // Play a pattern
  const playPattern = async () => {
    if (isPlaying) return;
    
    try {
      setIsPlaying(true);
      console.log('⏺️ Playing pattern preview');
      
      // Make sure we have a context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Check if we have all needed buffers
      if (!audioBuffersRef.current.first || 
          !audioBuffersRef.current.normal || 
          !audioBuffersRef.current.accent) {
        console.error('Missing buffers for pattern preview');
        setIsPlaying(false);
        return;
      }
      
      // Play a pattern: first, normal, normal, accent
      const beatDuration = 60 / 120; // 120 BPM
      const types = ['first', 'normal', 'normal', 'accent'];
      
      types.forEach((type, index) => {
        setTimeout(() => {
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffersRef.current[type];
          
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = volume;
          
          source.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          
          source.start(0);
          
          // Reset state after the last beat
          if (index === types.length - 1) {
            setTimeout(() => {
              setIsPlaying(false);
            }, 300);
          }
        }, index * beatDuration * 1000);
      });
      
    } catch (error) {
      console.error('Error playing pattern:', error);
      setIsPlaying(false);
    }
  };
  
  return (
    <div className="sound-preview">
      <h3>Sound Preview</h3>
      <p className="settings-description">
        Click buttons below to hear how each beat type will sound with current settings.
      </p>
      
      <div className="sound-preview-buttons">
        <button
          className={`preview-button first-beat ${selectedSound === 'first' ? 'playing' : ''}`}
          onClick={() => { console.log('[DirectSoundPreview] First Beat button clicked.'); playSound('first'); }}
          disabled={isPlaying || isLoading}
        >
          First Beat
        </button>
        <button
          className={`preview-button accent-beat ${selectedSound === 'accent' ? 'playing' : ''}`}
          onClick={() => { console.log('[DirectSoundPreview] Accent button clicked.'); playSound('accent'); }}
          disabled={isPlaying || isLoading}
        >
          Accent
        </button>
        <button
          className={`preview-button normal-beat ${selectedSound === 'normal' ? 'playing' : ''}`}
          onClick={() => { console.log('[DirectSoundPreview] Normal button clicked.'); playSound('normal'); }}
          disabled={isPlaying || isLoading}
        >
          Normal
        </button>
      </div>
      
      <button 
        className={`preview-pattern-button ${isPlaying && !selectedSound ? 'playing' : ''}`}
        onClick={playPattern}
        disabled={isPlaying || isLoading}
      >
        Play Pattern Example
      </button>
      
      {isLoading && <div className="loading-indicator">Loading sounds...</div>}
    </div>
  );
};

export default DirectSoundPreview;