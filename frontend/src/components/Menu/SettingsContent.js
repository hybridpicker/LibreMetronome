// Updated src/components/Menu/SettingsContent.js
import React, { useState, useEffect } from 'react';
import { getAllSoundSets, setActiveSoundSet } from '../../services/soundSetService';

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
  const [customSoundSets, setCustomSoundSets] = useState([
    { id: 'woodblock', name: 'Wood Block', is_active: false },
    { id: 'drums', name: 'Drums', is_active: false }
  ]);

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
  }, []);

  // Fetch sound sets from the API
  useEffect(() => {
    setLoadingSoundSets(true);
    getAllSoundSets()
      .then((data) => {
        setSoundSets(data);
        
        // Determine active sound set
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
  const getBackendUrl = (path) => {
    const base =
      process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:8000';
    return `${base}${path}`;
  };
  const [soundPaths, setSoundPaths] = useState({
    normal: getBackendUrl("/metronome_sounds/wood_normal_sound.mp3"),
    accent: getBackendUrl("/metronome_sounds/wood_accent_sound.mp3"),
    first: getBackendUrl("/metronome_sounds/wood_first_sound.mp3")
  });
  
  useEffect(() => {
    if (activeSoundSetId) {
      if (activeSoundSetId === 'woodblock') {
        setSoundPaths({
          normal: getBackendUrl("/metronome_sounds/wood_normal_sound.mp3"),
          accent: getBackendUrl("/metronome_sounds/wood_accent_sound.mp3"),
          first: getBackendUrl("/metronome_sounds/wood_first_sound.mp3")
        });
      } else if (activeSoundSetId === 'drums') {
        setSoundPaths({
          normal: getBackendUrl("/metronome_sounds/drum_normal_sound.mp3"),
          accent: getBackendUrl("/metronome_sounds/drum_accent_sound.mp3"),
          first: getBackendUrl("/metronome_sounds/drum_first_sound.mp3")
        });
      } else {
        const activeSet = soundSets.find(set => set.id === activeSoundSetId);
        if (activeSet && activeSet.first_beat_sound_url && activeSet.accent_sound_url && activeSet.normal_beat_sound_url) {
          setSoundPaths({
            normal: getBackendUrl(activeSet.normal_beat_sound_url),
            accent: getBackendUrl(activeSet.accent_sound_url),
            first: getBackendUrl(activeSet.first_beat_sound_url)
          });
        }
      }
    }
  }, [activeSoundSetId, soundSets]);

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
  const handleSoundSetChange = (id) => {
    // Update local state
    setActiveSoundSetId(id);
    
    // Call API to set active sound set
    setActiveSoundSet(id)
      .then(() => {
        // Clear existing audio buffers
        setAudioBuffers({});
        
        // Trigger reload of audio buffers
        if (setSoundSetReloadTrigger) {
          setSoundSetReloadTrigger(prev => prev + 1);
          console.log("Sound set changed, triggering audio buffer reload");
          window.dispatchEvent(new Event('soundSetChanged'));
        }
      })
      .catch((error) => {
        console.error('Error updating sound set:', error);
      });
  };

  // Handler for volume changes
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setLocalVolume(newVolume);
    setVolume(newVolume);
  };

  // Apply settings and close the overlay
  const handleApply = () => {
    setDefaultTempo(localTempo);
    setDefaultSubdivisions(localSubdivisions);
    
    // Trigger reload of audio buffers if any sound settings were changed
    if (setSoundSetReloadTrigger) {
      setSoundSetReloadTrigger(prev => prev + 1);
      console.log("Settings applied, triggering audio buffer reload");
      // Ensure the event with sound set ID is properly dispatched to trigger reload
      window.dispatchEvent(new CustomEvent('soundSetChanged', { 
        detail: { soundSetId: activeSoundSetId } 
      }));
    }
    
    if (onClose) {
      onClose();
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
                  checked={activeSoundSetId === set.id}
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