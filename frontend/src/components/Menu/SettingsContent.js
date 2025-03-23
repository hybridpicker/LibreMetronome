// Updated src/components/Menu/SettingsContent.js
import React, { useState, useEffect, useCallback } from 'react';
import { getAllSoundSets, setActiveSoundSet, getActiveSoundSetIdFromCookie } from '../../services/soundSetService';
import { getCookie } from '../../services/cookieUtils';

const SettingsContent = ({
  volume,
  setVolume,
  defaultTempo,
  setDefaultTempo,
  defaultSubdivisions,
  setDefaultSubdivisions,
  currentMode,
  onClose,
  setSoundSetReloadTrigger
}) => {
  // Local state for basic values
  const [localVolume, setLocalVolume] = useState(volume);
  const [localTempo, setLocalTempo] = useState(defaultTempo || 120);
  const [localSubdivisions, setLocalSubdivisions] = useState(defaultSubdivisions || 4);
  const [activeSubTab, setActiveSubTab] = useState('general');
  
  // Sound sets state
  const [soundSets, setSoundSets] = useState([]);
  const [activeSoundSetId, setActiveSoundSetId] = useState(null);
  const [loadingSoundSets, setLoadingSoundSets] = useState(false);
  const [errorSoundSets, setErrorSoundSets] = useState(null);

  // Audio context for sound preview
  const [audioContext, setAudioContext] = useState(null);
  const [audioBuffers, setAudioBuffers] = useState({});
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setLocalVolume(volume);
    setLocalTempo(defaultTempo || 120);
    setLocalSubdivisions(defaultSubdivisions || 4);
  }, [volume, defaultTempo, defaultSubdivisions]);

  // Initialize audio context
  useEffect(() => {
    // We'll create the AudioContext on-demand when user interacts
    // This is to comply with browser autoplay policies
    return () => {
      // Clean up audio context on unmount
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioContext]);

  // Fetch sound sets from the API
  useEffect(() => {
    setLoadingSoundSets(true);
    // Get the cookie id first for more reliable state
    const cookieId = getActiveSoundSetIdFromCookie();
    
    getAllSoundSets()
      .then((data) => {
        setSoundSets(data);
        
        // First check for active sound set from cookie
        if (cookieId) {
          const cookieIdStr = cookieId.toString();
          const matchingSet = data.find(set => set.id.toString() === cookieIdStr);
          if (matchingSet) {
            setActiveSoundSetId(matchingSet.id);
            setLoadingSoundSets(false);
            return;
          }
        }
        
        // Otherwise find the active set from API response
        const activeSet = data.find((set) => set.is_active);
        if (activeSet) {
          setActiveSoundSetId(activeSet.id);
        } else if (data.length > 0) {
          // Default to first sound set if none is active
          setActiveSoundSetId(data[0].id);
        }
        
        setLoadingSoundSets(false);
      })
      .catch((error) => {
        setErrorSoundSets(error.message);
        setLoadingSoundSets(false);
      });
  }, []);

  // State for sound paths
  const getBackendUrl = useCallback((path) => {
    if (!path) return null;
    const base =
      process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:8000';
    return `${base}${path}`;
  }, []);

  const [soundPaths, setSoundPaths] = useState({
    normal: getBackendUrl("/metronome_sounds/wood_normal_sound.mp3"),
    accent: getBackendUrl("/metronome_sounds/wood_accent_sound.mp3"),
    first: getBackendUrl("/metronome_sounds/wood_first_sound.mp3")
  });
  
  // Update sound paths when active sound set changes
  useEffect(() => {
    if (!activeSoundSetId) return;
    
    // Find the active sound set in our loaded sound sets
    const activeSet = soundSets.find(set => set.id.toString() === activeSoundSetId.toString());
    
    if (activeSet) {
      // For backend sound sets
      if (activeSet.first_beat_sound_url && activeSet.accent_sound_url && activeSet.normal_beat_sound_url) {
        setSoundPaths({
          normal: getBackendUrl(activeSet.normal_beat_sound_url),
          accent: getBackendUrl(activeSet.accent_sound_url),
          first: getBackendUrl(activeSet.first_beat_sound_url)
        });
        return;
      }
    }
    
    // Fallback based on ID for custom sound sets
    if (activeSoundSetId === 'woodblock' || activeSoundSetId === 'default-woodblock') {
      setSoundPaths({
        normal: getBackendUrl("/metronome_sounds/wood_normal_sound.mp3"),
        accent: getBackendUrl("/metronome_sounds/wood_accent_sound.mp3"),
        first: getBackendUrl("/metronome_sounds/wood_first_sound.mp3")
      });
    } else if (activeSoundSetId === 'drums' || activeSoundSetId === 'default-drums') {
      setSoundPaths({
        normal: getBackendUrl("/metronome_sounds/drum_normal_sound.mp3"),
        accent: getBackendUrl("/metronome_sounds/drum_accent_sound.mp3"),
        first: getBackendUrl("/metronome_sounds/drum_first_sound.mp3")
      });
    } else {
      // Default fallback if we cannot determine the sound set
      console.warn(`Could not find sound paths for ID: ${activeSoundSetId}, using default`);
      setSoundPaths({
        normal: getBackendUrl("/metronome_sounds/wood_normal_sound.mp3"),
        accent: getBackendUrl("/metronome_sounds/wood_accent_sound.mp3"),
        first: getBackendUrl("/metronome_sounds/wood_first_sound.mp3")
      });
    }
  }, [activeSoundSetId, soundSets, getBackendUrl]);

  // Sound preview functions
  const playSound = async (type) => {
    if (isPreviewPlaying) return;
    
    try {
      const url = soundPaths[type];
      if (!url) {
        console.error(`No sound URL found for type: ${type}`);
        return;
      }
      setIsPreviewPlaying(true);
      const audio = new Audio(url);
      audio.volume = localVolume;
      audio.play();
      audio.onended = () => {
        setIsPreviewPlaying(false);
      };
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPreviewPlaying(false);
    }
  };
  
  // Play pattern preview
  const playPatternPreview = async () => {
    if (isPreviewPlaying) return;
    
    try {
      // Create audio context on demand if it doesn't exist
      const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioContext) {
        setAudioContext(ctx);
      }
      
      // Resume context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      setIsPreviewPlaying(true);
      
      const beatDuration = 60 / 120; // 120 BPM for preview
      const types = ['first', 'normal', 'normal', 'accent'];
      
      // Play pattern
      types.forEach((type, index) => {
        setTimeout(() => {
          // Create oscillator for each beat
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          // Configure based on beat type
          switch(type) {
            case 'first':
              oscillator.type = 'triangle';
              oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
              break;
            case 'accent':
              oscillator.type = 'triangle';
              oscillator.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
              break;
            case 'normal':
            default:
              oscillator.type = 'triangle';
              oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
              break;
          }
          
          // Set volume and envelope
          gainNode.gain.setValueAtTime(localVolume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          
          // Connect and play
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.1);
          
          // Reset playing state after last beat
          if (index === types.length - 1) {
            setTimeout(() => {
              setIsPreviewPlaying(false);
            }, 100);
          }
        }, index * beatDuration * 1000);
      });
    } catch (error) {
      console.error('Error playing pattern:', error);
      setIsPreviewPlaying(false);
    }
  };

  // Handler to change the active sound set
  const handleSoundSetChange = async (id) => {
    // Don't do anything if we're already using this sound set
    if (id.toString() === activeSoundSetId?.toString()) {
      console.log(`Sound set ${id} is already active, no change needed`);
      return;
    }
    
    // Update local state immediately for UI responsiveness
    setActiveSoundSetId(id);
    
    try {
      console.log(`Changing sound set to: ${id}`);
      
      // Call the service function which handles both API and local storage
      await setActiveSoundSet(id);
      
      // Force immediate audio buffer reload - this works even when playing
      if (setSoundSetReloadTrigger) {
        setSoundSetReloadTrigger(prev => prev + 1);
        console.log("Sound set changed, triggering immediate audio buffer reload");
      }
      
      // Play a preview of the new sound after a short delay to confirm the change worked
      setTimeout(() => {
        try {
          playSound('first');
        } catch (error) {
          // Ignore preview errors - it's just a convenience
        }
      }, 300);
    } catch (error) {
      console.error('Error updating sound set:', error);
    }
  };

  // Handler for volume changes
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setLocalVolume(newVolume);
    setVolume(newVolume);
  };

  // Apply settings and close the overlay
  const handleApply = () => {
    // Update base metronome settings first - these take effect immediately
    setDefaultTempo(localTempo);
    setDefaultSubdivisions(localSubdivisions);
    
    // Apply sound set changes and ensure immediate reload
    if (activeSoundSetId) {
      console.log("Applying settings with sound set: " + activeSoundSetId);
      
      // First dispatch a high-priority event to ensure any playing metronome 
      // gets notified about the settings change
      window.dispatchEvent(new CustomEvent('metronome-settings-applied', { 
        detail: { 
          tempo: localTempo,
          subdivisions: localSubdivisions,
          volume: localVolume,
          soundSetId: activeSoundSetId.toString()
        } 
      }));
      
      // Then update the sound set through the service
      setActiveSoundSet(activeSoundSetId)
        .then(() => {
          // Force trigger reload of audio buffers - this works even during playback
          if (setSoundSetReloadTrigger) {
            setSoundSetReloadTrigger(prev => prev + 1);
            console.log("Settings applied, triggered immediate audio buffer reload");
          }
          
          // Finally close the settings overlay
          if (onClose) {
            onClose();
          }
        })
        .catch(error => {
          console.error("Failed to update sound set:", error);
          // Still close the overlay even if there was an error
          if (onClose) {
            onClose();
          }
        });
    } else {
      // No sound set changes, just close the overlay
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <div className="settings-content">
      <h2>Settings</h2>
      
      {/* Tabs for settings */}
      <div className="settings-subtabs">
        <button
          className={`settings-subtab ${activeSubTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('general')}
        >
          General
        </button>
        <button
          className={`settings-subtab ${activeSubTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('audio')}
        >
          Audio
        </button>
      </div>
      
      {/* General settings */}
      <div className={`settings-section ${activeSubTab === 'general' ? 'active' : ''}`}>
        <div className="settings-group">
          <h3>Values</h3>
          <div className="settings-row">
            <label>
              <span>Tempo (BPM):</span>
              <input
                type="number"
                min="15"
                max="240"
                value={localTempo}
                onChange={(e) => setLocalTempo(Number(e.target.value))}
                className="settings-input"
              />
            </label>
          </div>
          <div className="settings-row">
            <label>
              <span>Beats per Bar:</span>
              <select
                value={localSubdivisions}
                onChange={(e) => setLocalSubdivisions(Number(e.target.value))}
                className="settings-select"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="settings-row">
            <label>
              <span>Current Mode:</span>
              <span className="settings-value">
                {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode
              </span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Audio settings */}
      <div className={`settings-section ${activeSubTab === 'audio' ? 'active' : ''}`}>
        <div className="settings-group">
          <h3>Volume Control</h3>
          <div className="settings-row">
            <label>
              <span>Master Volume: {Math.round(localVolume * 100)}%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localVolume}
                onChange={handleVolumeChange}
                className="settings-slider"
              />
            </label>
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Sound Sets</h3>
          {loadingSoundSets && <p>Loading sound sets…</p>}
          {errorSoundSets && <p>Error: {errorSoundSets}</p>}
          
          <div className="sound-sets-list">
            {soundSets.map((set) => (
              <label key={set.id} className="sound-set-option">
                <input
                  type="radio"
                  name="soundSet"
                  checked={activeSoundSetId?.toString() === set.id.toString()}
                  onChange={() => handleSoundSetChange(set.id)}
                />
                <span>{set.name}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Sound Preview</h3>
          <p className="settings-description">
            Click buttons below to hear how each beat type will sound with current settings.
          </p>
          
          <div className="sound-preview-buttons">
            <button 
              className="preview-button first-beat" 
              onClick={() => playSound('first')}
              disabled={isPreviewPlaying}
            >
              First Beat
            </button>
            <button 
              className="preview-button accent-beat" 
              onClick={() => playSound('accent')}
              disabled={isPreviewPlaying}
            >
              Accent
            </button>
            <button 
              className="preview-button normal-beat" 
              onClick={() => playSound('normal')}
              disabled={isPreviewPlaying}
            >
              Normal
            </button>
          </div>
        </div>
      </div>
      
      <button className="settings-save-button" onClick={handleApply}>
        Apply Settings
      </button>
    </div>
  );
};

export default SettingsContent;