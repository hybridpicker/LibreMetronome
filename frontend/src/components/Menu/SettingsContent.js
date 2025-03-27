// Updated src/components/Menu/SettingsContent.js
import React, { useState, useEffect, useCallback } from 'react';
import { getAllSoundSets, setActiveSoundSet, getActiveSoundSetIdFromCookie } from '../../services/soundSetService';
import { loadAccessibilitySettings, playAudioFeedback, announceToScreenReader, triggerHapticFeedback } from '../../utils/accessibility/accessibilityUtils';
import './settings-accessibility.css';

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
      
      // Get all elements we need to update
      const metronomeElements = document.querySelectorAll('.metronome-container, .metronome-canvas, .metronome-controls, .beat-grid, .circle-display, .analog-display, canvas, svg');
      const controlElements = document.querySelectorAll('.control-section, .tempo-display, .beats-display, .volume-control');
      const headerFooterElements = document.querySelectorAll('header, footer');
      
      // Apply setting to DOM and window globals for immediate feedback
      switch(setting) {
        case 'highContrast':
          // Apply to main elements
          document.body.classList.toggle('high-contrast', value);
          
          // Force refresh on specific metronome elements
          metronomeElements.forEach(el => {
            el.classList.toggle('high-contrast', value);
            // Add a slight transform to force a repaint
            el.style.transform = 'translateZ(0)';
            setTimeout(() => { el.style.transform = ''; }, 0);
          });
          
          // Handle SVGs and Canvas specifically for high contrast mode
          const svgElements = document.querySelectorAll('svg');
          const canvasElements = document.querySelectorAll('canvas');
          
          if (value) {
            // Apply high contrast mode to SVGs
            svgElements.forEach(svg => {
              // Apply styles directly to SVG elements
              svg.style.filter = 'brightness(2) contrast(1.5)';
              
              // For each individual SVG element
              const paths = svg.querySelectorAll('path, circle, rect, line, polygon');
              paths.forEach(path => {
                path.setAttribute('stroke', '#FFFFFF');
                path.setAttribute('stroke-width', '2');
                if (!path.getAttribute('fill') || path.getAttribute('fill') === 'none') {
                  path.setAttribute('fill', 'none');
                } else {
                  path.setAttribute('fill', '#000000');
                }
              });
            });
            
            // Apply high contrast mode to Canvas
            canvasElements.forEach(canvas => {
              canvas.style.filter = 'brightness(2) contrast(1.5) invert(1)';
            });
          } else {
            // Remove high contrast mode from SVGs
            svgElements.forEach(svg => {
              svg.style.filter = '';
              
              // Reset SVG element styles
              const paths = svg.querySelectorAll('path, circle, rect, line, polygon');
              paths.forEach(path => {
                path.removeAttribute('stroke');
                path.removeAttribute('stroke-width');
                path.removeAttribute('fill');
              });
            });
            
            // Remove high contrast mode from Canvas
            canvasElements.forEach(canvas => {
              canvas.style.filter = '';
            });
          }
          
          // Update header/footer
          headerFooterElements.forEach(el => {
            el.classList.toggle('high-contrast', value);
          });
          
          // Update controls
          controlElements.forEach(el => {
            el.classList.toggle('high-contrast', value);
          });
          
          // Announce change
          if (window.screenReaderMessagesEnabled) {
            const message = value ? 'High contrast mode enabled' : 'High contrast mode disabled';
            announceToScreenReader(message, 'polite');
          }
          break;
          
        case 'largeText':
          // Apply to document
          document.body.classList.toggle('large-text', value);
          
          // Update controls and texts
          controlElements.forEach(el => {
            el.classList.toggle('large-text', value);
          });
          
          // Update header/footer
          headerFooterElements.forEach(el => {
            el.classList.toggle('large-text', value);
          });
          
          // Force layout refresh for elements that might not adjust automatically
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            
            // Force reflow of specific containers that may need adjustment
            const containers = document.querySelectorAll('.metronome-container, .menu-modal, .settings-content');
            containers.forEach(container => {
              // This triggers a reflow
              const height = container.offsetHeight;
              container.style.transform = 'translateZ(0)';
              setTimeout(() => {
                container.style.transform = '';
              }, 10);
            });
          }, 50);
          
          // Announce change
          if (window.screenReaderMessagesEnabled) {
            const message = value ? 'Large text mode enabled' : 'Large text mode disabled';
            announceToScreenReader(message, 'polite');
          }
          break;
          
        case 'reducedMotion':
          // Apply to document
          document.body.classList.toggle('reduced-motion', value);
          
          // Apply to metronome elements specifically
          metronomeElements.forEach(el => {
            el.classList.toggle('reduced-motion', value);
          });
          
          // Announce change
          if (window.screenReaderMessagesEnabled) {
            const message = value ? 'Reduced motion enabled' : 'Reduced motion disabled';
            announceToScreenReader(message, 'polite');
          }
          break;
          
        case 'focusIndicators':
          // Apply to document
          document.body.classList.toggle('focus-visible-enabled', value);
          window.focusIndicatorsEnabled = value;
          
          // Announce change
          if (window.screenReaderMessagesEnabled) {
            const message = value ? 'Enhanced focus indicators enabled' : 'Enhanced focus indicators disabled';
            announceToScreenReader(message, 'polite');
          }
          break;
          
        case 'audioFeedback':
          window.audioFeedbackEnabled = value;
          
          // Announce change but only if not disabling audio feedback itself
          if (window.screenReaderMessagesEnabled) {
            const message = value ? 'Audio feedback enabled' : 'Audio feedback disabled';
            announceToScreenReader(message, 'polite');
          }
          
          // Play a test sound when enabling
          if (value) {
            setTimeout(() => playAudioFeedback('click'), 100);
          }
          break;
          
        case 'screenReaderMessages':
          window.screenReaderMessagesEnabled = value;
          
          // We don't announce this change since it would be redundant
          break;
          
        case 'hapticFeedback':
          window.hapticFeedbackEnabled = value;
          
          // Provide a test vibration when enabling
          if (value && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([50, 50, 50]);
          }
          
          // Announce change
          if (window.screenReaderMessagesEnabled) {
            const message = value ? 'Haptic feedback enabled' : 'Haptic feedback disabled';
            announceToScreenReader(message, 'polite');
          }
          break;
          
        case 'colorBlindMode':
          console.log(`🎨 Applying color blind mode: ${value}`);
          // Remove all color blind classes first
          document.body.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
          
          // Apply new color blind mode if not 'none'
          if (value !== 'none') {
            document.body.classList.add('color-blind');
            document.body.classList.add(value);
            
            // Apply to specific elements
            metronomeElements.forEach(el => {
              el.classList.add('color-blind', value);
            });
            
            headerFooterElements.forEach(el => {
              el.classList.add('color-blind', value);
            });
            
            controlElements.forEach(el => {
              el.classList.add('color-blind', value);
            });
            
            // Force SVG elements and images to repaint with new filter
            setTimeout(() => {
              // Force SVG repaint
              const svgElements = document.querySelectorAll('svg');
              console.log(`Refreshing ${svgElements.length} SVG elements for color blind mode: ${value}`);
              
              svgElements.forEach(svg => {
                // This forces a repaint without changing visual appearance
                svg.style.transform = 'translateZ(0)';
                setTimeout(() => {
                  svg.style.transform = '';
                }, 0);
              });
              
              // Force canvas repaint for metronome visuals
              const canvasElements = document.querySelectorAll('canvas');
              canvasElements.forEach(canvas => {
                canvas.style.transform = 'translateZ(0)';
                setTimeout(() => {
                  canvas.style.transform = '';
                }, 0);
              });
              
              // Force image repaint
              const images = document.querySelectorAll('img');
              console.log(`Refreshing ${images.length} images for color blind mode: ${value}`);
              
              images.forEach(img => {
                // Force repaint by briefly changing opacity
                const originalOpacity = img.style.opacity || '1';
                img.style.transition = 'none';
                img.style.opacity = '0.99';
                
                setTimeout(() => {
                  img.style.opacity = originalOpacity;
                  img.style.transition = '';
                }, 10);
              });
              
              // Force metronome container repaint
              const metronomeContainer = document.querySelector('.metronome-container');
              if (metronomeContainer) {
                metronomeContainer.style.transform = 'translateZ(0)';
                setTimeout(() => {
                  metronomeContainer.style.transform = '';
                }, 0);
              }
              
              // Announce the change to screen readers
              if (window.screenReaderMessagesEnabled) {
                let message = value === 'none' 
                  ? 'Color blind mode disabled' 
                  : `Color blind mode set to ${value}`;
                  
                announceToScreenReader(message, 'polite');
              }
              
              // Provide haptic feedback if enabled
              if (window.hapticFeedbackEnabled && navigator.vibrate) {
                triggerHapticFeedback('short');
              }
            }, 50);
          } else {
            // Remove color blind classes from specific elements
            metronomeElements.forEach(el => {
              el.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
            });
            
            headerFooterElements.forEach(el => {
              el.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
            });
            
            controlElements.forEach(el => {
              el.classList.remove('color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy');
            });
            
            // Force repaint
            document.body.style.transform = 'translateZ(0)';
            setTimeout(() => {
              document.body.style.transform = '';
            }, 0);
            
            // Announce the change
            if (window.screenReaderMessagesEnabled) {
              announceToScreenReader('Color blind mode disabled', 'polite');
            }
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

  // Helper function for screen reader announcements
  const announceToScreenReader = (message, priority = 'polite') => {
    if (!window.screenReaderMessagesEnabled) return;
    
    const announcer = document.getElementById('settings-change-announcement');
    if (announcer) {
      announcer.textContent = message;
      
      // Clear after a short delay to ensure it'll be announced again if the same message is sent
      setTimeout(() => {
        announcer.textContent = '';
      }, 100);
    }
  };

  // Apply settings and close the overlay
  const handleApply = () => {
    console.log("Applying all settings");
    
    // Update base metronome settings first - these take effect immediately
    setDefaultTempo(localTempo);
    setDefaultSubdivisions(localSubdivisions);
    
    // No need to re-apply the accessibility settings here as they're already
    // applied when the user interacts with the controls
    console.log("Finalizing accessibility settings:", accessibilitySettings);
    
    // For extra safety, also run loadAccessibilitySettings to ensure consistency
    loadAccessibilitySettings();
    
    // Announce that settings have been applied (for screen readers)
    if (window.screenReaderMessagesEnabled) {
      announceToScreenReader("All settings applied and saved", "polite");
    }
    
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
          {/* Hidden announcement for screen readers when settings change */}
          <div aria-live="polite" className="sr-only" id="settings-change-announcement"></div>
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
          
          {/* Screen Reader Announcements and Haptic Feedback options removed */}
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
      
      <div className="settings-action-row">
        <div className="settings-status">
          {/* Show a message indicating settings are applied immediately */}
          <span className="settings-status-text">
            Settings are applied immediately upon change
          </span>
        </div>
        <button className="settings-save-button" onClick={handleApply}>
          Apply All & Close
        </button>
      </div>
    </div>
  );
};

export default SettingsContent;