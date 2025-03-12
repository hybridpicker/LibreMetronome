// File: src/components/Menu/SettingsContent.js
import React, { useState, useEffect } from 'react';
import { getAllSoundSets, setActiveSoundSet } from '../../services/soundSetService';
import { getCookie } from '../../services/cookieUtils';

const SettingsContent = ({
  volume,
  setVolume,
  defaultTempo,
  setDefaultTempo,
  defaultSubdivisions,
  setDefaultSubdivisions,
  currentMode,
  onClose, // Callback to close the overlay
  setSoundSetReloadTrigger // Add this new prop
}) => {
  // Local state for basic values (tempo, beats per bar, etc.)
  const [localVolume, setLocalVolume] = useState(volume);
  const [localTempo, setLocalTempo] = useState(defaultTempo || 120);
  const [localSubdivisions, setLocalSubdivisions] = useState(defaultSubdivisions || 4);
  const [activeSubTab, setActiveSubTab] = useState('general');

  // State for sound sets from the API
  const [soundSets, setSoundSets] = useState([]);
  const [activeSoundSetId, setActiveSoundSetId] = useState(null);
  const [loadingSoundSets, setLoadingSoundSets] = useState(false);
  const [errorSoundSets, setErrorSoundSets] = useState(null);

  // Update local state when props change
  useEffect(() => {
    setLocalVolume(volume);
    setLocalTempo(defaultTempo || 120);
    setLocalSubdivisions(defaultSubdivisions || 4);
  }, [volume, defaultTempo, defaultSubdivisions]);

  // Fetch sound sets from the API when the component mounts
  useEffect(() => {
    setLoadingSoundSets(true);
    getAllSoundSets()
      .then((data) => {
        setSoundSets(data);
        // Determine the currently active sound set and set its ID
        const activeSet = data.find((set) => set.is_active);
        if (activeSet) {
          setActiveSoundSetId(activeSet.id);
        }
        setLoadingSoundSets(false);
      })
      .catch((error) => {
        setErrorSoundSets(error.message);
        setLoadingSoundSets(false);
      });
  }, []);

  // Handler to change the active sound set
  const handleSoundSetChange = (id) => {
    // Read CSRF token from cookies
    const csrfToken = getCookie('csrftoken');
    setActiveSoundSet(id, csrfToken)
      .then((updatedSet) => {
        setActiveSoundSetId(updatedSet.id);
        
        // Trigger reload of audio buffers
        if (setSoundSetReloadTrigger) {
          setSoundSetReloadTrigger(prev => prev + 1);
          console.log("Sound set changed, triggering audio buffer reload");
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
          {soundSets.length > 0 && (
            <div className="sound-sets-list">
              {soundSets.map((set) => (
                <label key={set.id} style={{ display: 'block', marginBottom: '5px' }}>
                  <input
                    type="radio"
                    name="soundSet"
                    checked={activeSoundSetId === set.id}
                    onChange={() => handleSoundSetChange(set.id)}
                  />
                  <span style={{ marginLeft: '8px' }}>{set.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <button className="settings-save-button" onClick={handleApply}>
        Apply Settings
      </button>
    </div>
  );
};

export default SettingsContent;