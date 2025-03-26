// Updated src/components/Menu/SettingsContent.js
import React, { useState, useEffect, useCallback } from 'react';
import { getAllSoundSets, setActiveSoundSet, getActiveSoundSetIdFromCookie } from '../../services/soundSetService';
import { loadAccessibilitySettings, playAudioFeedback } from '../../utils/accessibility/accessibilityUtils';
// Unused import removed

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
  const [audioContext] = useState(null); // Removed unused setter
  // Removed unused state variable completely
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

  // Initialize accessibility settings with correct values on component mount
  const [accessibilitySettings, setAccessibilitySettings] = useState(() => {
    // First ensure settings are properly loaded
    const loadedSettings = loadAccessibilitySettings();
    console.log('Initial settings loaded in SettingsContent:', loadedSettings);
    
    // Return object with current settings state
    return {
      highContrast: document.body.classList.contains('high-contrast'),
      largeText: document.body.classList.contains('large-text'), 
      reducedMotion: document.body.classList.contains('reduced-motion'),
      audioFeedback: window.audioFeedbackEnabled === true,
      screenReaderMessages: window.screenReaderMessagesEnabled !== false,
      focusIndicators: document.body.classList.contains('focus-visible-enabled'),
      hapticFeedback: window.hapticFeedbackEnabled === true,
      colorBlindMode: (document.body.classList.contains('protanopia') ? 'protanopia' :
                      document.body.classList.contains('deuteranopia') ? 'deuteranopia' :
                      document.body.classList.contains('tritanopia') ? 'tritanopia' :
                      document.body.classList.contains('monochromacy') ? 'monochromacy' : 'none'),
    };
  });
  
  // Listen for accessibility settings changes from other components
  useEffect(() => {
    const handleAccessibilitySettingsChanged = (event) => {
      if (event.detail && event.detail.setting) {
        console.log('Settings changed from outside, updating local state:', event.detail);
        
        // Update our local state to match
        setAccessibilitySettings(prev => ({
          ...prev,
          [event.detail.setting]: event.detail.value
        }));
      }
    };
    
    // Listen for settings changes
    window.addEventListener('accessibility-settings-changed', handleAccessibilitySettingsChanged);
    
    return () => {
      window.removeEventListener('accessibility-settings-changed', handleAccessibilitySettingsChanged);
    };
  }, []);
  
  // Function to update accessibility settings
  const updateAccessibilitySetting = (setting, value) => {
    console.log(`Updating accessibility setting: ${setting} to ${value}`);
    
    // Update the local state
    setAccessibilitySettings(prev => {
      const newSettings = { ...prev, [setting]: value };
      
      // Apply the setting immediately for better user feedback
      const kebabSetting = setting.replace(/([A-Z])/g, '-$1').toLowerCase();
      const localStorageKey = `accessibility-${kebabSetting}`;
      
      // Save to localStorage
      localStorage.setItem(localStorageKey, value.toString());
      
      // Apply setting to DOM and window globals for immediate feedback
      switch(setting) {
        case 'highContrast':
          document.body.classList.toggle('high-contrast', value);
          break;
        case 'largeText':
          document.body.classList.toggle('large-text', value);
          break;
        case 'reducedMotion':
          document.body.classList.toggle('reduced-motion', value);
          break;
        case 'focusIndicators':
          document.body.classList.toggle('focus-visible-enabled', value);
          window.focusIndicatorsEnabled = value;
          break;
        case 'audioFeedback':
          window.audioFeedbackEnabled = value;
          break;
        case 'screenReaderMessages':
          window.screenReaderMessagesEnabled = value;
          break;
        case 'hapticFeedback':
          window.hapticFeedbackEnabled = value;
          break;
        case 'colorBlindMode':
          // Remove all color blind classes first
          document.body.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
          
          // Apply new color blind mode if not 'none'
          if (value !== 'none') {
            document.body.classList.add('color-blind');
            document.body.classList.add(value);
            
            // Force SVG elements to repaint with new filter
            setTimeout(() => {
              const svgElements = document.querySelectorAll('svg');
              console.log(`Refreshing ${svgElements.length} SVG elements for color blind mode: ${value}`);
              
              svgElements.forEach(svg => {
                // This forces a repaint without changing visual appearance
                svg.style.transform = 'translateZ(0)';
                setTimeout(() => {
                  svg.style.transform = '';
                }, 0);
              });
            }, 50);
          }
          break;
        default:
          console.warn(`Unknown accessibility setting: ${setting}`);
          break;
      }
      
      // Dispatch event to notify the app about the change
      console.log(`Dispatching accessibility-settings-changed event for ${setting}=${value}`);
      window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
        detail: { setting, value }
      }));
      
      // Play audio feedback if enabled
      if (setting !== 'audioFeedback' && (prev.audioFeedback || (setting === 'audioFeedback' && value))) {
        playAudioFeedback('click');
      }
      
      return newSettings;
    });
  };
  
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
  
  // Pattern preview function removed as it's unused

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
    console.log("Applying all settings");
    
    // Update base metronome settings first - these take effect immediately
    setDefaultTempo(localTempo);
    setDefaultSubdivisions(localSubdivisions);
    
    // Apply all accessibility settings explicitly based on current state
    console.log("Applying accessibility settings:", accessibilitySettings);
    
    // Apply each setting explicitly using the values from state
    for (const [key, value] of Object.entries(accessibilitySettings)) {
      if (key === 'colorBlindMode') {
        localStorage.setItem('accessibility-color-blind-mode', value);
        
        // Clear all color blind classes first
        document.body.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
        
        // Apply appropriate classes based on selected mode
        if (value !== 'none') {
          document.body.classList.add('color-blind');
          document.body.classList.add(value);
        }
      } else {
        // Convert setting key to kebab-case for localStorage
        const storageKey = `accessibility-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        localStorage.setItem(storageKey, value.toString());
        
        // Apply to DOM if it's a class-based setting
        if (['highContrast', 'largeText', 'reducedMotion', 'focusIndicators'].includes(key)) {
          const className = key === 'highContrast' ? 'high-contrast' : 
                           key === 'largeText' ? 'large-text' :
                           key === 'reducedMotion' ? 'reduced-motion' : 'focus-visible-enabled';
          
          if (value) {
            document.body.classList.add(className);
          } else {
            document.body.classList.remove(className);
          }
        }
        
        // Apply to window globals if it's a non-class setting
        if (key === 'audioFeedback') window.audioFeedbackEnabled = value;
        if (key === 'screenReaderMessages') window.screenReaderMessagesEnabled = value;
        if (key === 'hapticFeedback') window.hapticFeedbackEnabled = value;
      }
      
      // Dispatch an event for each setting to notify the application
      window.dispatchEvent(new CustomEvent('accessibility-settings-changed', {
        detail: { setting: key, value: value }
      }));
    }
    
    // For extra safety, also run loadAccessibilitySettings to ensure consistency
    loadAccessibilitySettings();
    
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
        <button
          className={`settings-subtab ${activeSubTab === 'accessibility' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('accessibility')}
        >
          Accessibility
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
      
      {/* Accessibility settings */}
      <div className={`settings-section ${activeSubTab === 'accessibility' ? 'active' : ''}`}>
        <div className="settings-group">
          <h3>Display Options</h3>
          <div className="settings-row checkbox-row">
            <label>
              <input 
                type="checkbox" 
                checked={accessibilitySettings.highContrast} 
                onChange={e => updateAccessibilitySetting('highContrast', e.target.checked)} 
              />
              <span>High Contrast Mode</span>
            </label>
            <p className="setting-description">Increases contrast for better visibility</p>
          </div>
          
          <div className="settings-row checkbox-row">
            <label>
              <input 
                type="checkbox" 
                checked={accessibilitySettings.largeText} 
                onChange={e => updateAccessibilitySetting('largeText', e.target.checked)} 
              />
              <span>Large Text</span>
            </label>
            <p className="setting-description">Increases text size throughout the app</p>
          </div>
          
          <div className="settings-row checkbox-row">
            <label>
              <input 
                type="checkbox" 
                checked={accessibilitySettings.reducedMotion} 
                onChange={e => updateAccessibilitySetting('reducedMotion', e.target.checked)} 
              />
              <span>Reduced Motion</span>
            </label>
            <p className="setting-description">Minimizes animations and motion effects</p>
          </div>
          
          <div className="settings-row checkbox-row">
            <label>
              <input 
                type="checkbox" 
                checked={accessibilitySettings.focusIndicators !== false} 
                onChange={e => updateAccessibilitySetting('focusIndicators', e.target.checked)} 
              />
              <span>Enhanced Focus Indicators</span>
            </label>
            <p className="setting-description">Shows clear visual indicators for keyboard focus</p>
          </div>
          
          <div className="settings-row color-blind-mode">
            <label htmlFor="color-blind-mode">Color Blind Mode</label>
            <select 
              id="color-blind-mode" 
              value={accessibilitySettings.colorBlindMode || 'none'} 
              onChange={e => updateAccessibilitySetting('colorBlindMode', e.target.value)}
              aria-describedby="color-blind-desc"
            >
              <option value="none">None</option>
              <option value="protanopia">Protanopia (Red-Blind)</option>
              <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
              <option value="tritanopia">Tritanopia (Blue-Blind)</option>
              <option value="monochromacy">Monochromacy (Full Color Blindness)</option>
            </select>
            <p id="color-blind-desc" className="setting-description">Adjusts colors for different types of color vision deficiency</p>
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Feedback Options</h3>
          <div className="settings-row checkbox-row">
            <label>
              <input 
                type="checkbox" 
                checked={accessibilitySettings.audioFeedback} 
                onChange={e => updateAccessibilitySetting('audioFeedback', e.target.checked)} 
              />
              <span>Audio Feedback</span>
            </label>
            <p className="setting-description">Plays sounds for actions and notifications</p>
          </div>
          
          <div className="settings-row checkbox-row">
            <label>
              <input 
                type="checkbox" 
                checked={accessibilitySettings.screenReaderMessages !== false} 
                onChange={e => updateAccessibilitySetting('screenReaderMessages', e.target.checked)} 
              />
              <span>Screen Reader Announcements</span>
            </label>
            <p className="setting-description">Provides detailed announcements for screen readers</p>
          </div>
          
          <div className="settings-row checkbox-row">
            <label>
              <input 
                type="checkbox" 
                checked={accessibilitySettings.hapticFeedback} 
                onChange={e => {
                  updateAccessibilitySetting('hapticFeedback', e.target.checked);
                  
                  // Provide a test vibration when enabling
                  if (e.target.checked && window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(100);
                  }
                }} 
              />
              <span>Haptic Feedback</span>
            </label>
            <p className="setting-description">
              Provides vibration feedback on mobile devices
              {!window.navigator.vibrate && <span className="note"> (Not supported in this browser)</span>}
            </p>
          </div>
        </div>
        
        <div className="settings-group">
          <h3>Keyboard Shortcuts</h3>
          <div className="keyboard-shortcuts-list">
            <div className="shortcut-item">
              <kbd>Space</kbd>
              <span>Play/Pause metronome</span>
            </div>
            <div className="shortcut-item">
              <kbd>T</kbd>
              <span>Tap tempo</span>
            </div>
            <div className="shortcut-item">
              <kbd>↑</kbd><kbd>↓</kbd>
              <span>Adjust tempo by 1 BPM</span>
            </div>
            <div className="shortcut-item">
              <kbd>←</kbd><kbd>→</kbd>
              <span>Adjust tempo by 5 BPM</span>
            </div>
            <div className="shortcut-item">
              <kbd>1</kbd> - <kbd>9</kbd>
              <span>Set beats per measure</span>
            </div>
            <div className="shortcut-item">
              <kbd>+</kbd><kbd>-</kbd>
              <span>Adjust volume</span>
            </div>
            <div className="shortcut-item">
              <kbd>ESC</kbd>
              <span>Close dialogs</span>
            </div>
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