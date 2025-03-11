import React, { useState, useEffect } from 'react';

const SettingsContent = ({
  volume,
  setVolume,
  defaultTempo,
  setDefaultTempo,
  defaultSubdivisions,
  setDefaultSubdivisions,
  currentMode,
  onClose // Add onClose prop
}) => {
  // Local state for settings
  const [localVolume, setLocalVolume] = useState(volume);
  const [localTempo, setLocalTempo] = useState(defaultTempo || 120);
  const [localSubdivisions, setLocalSubdivisions] = useState(defaultSubdivisions || 4);
  const [activeSubTab, setActiveSubTab] = useState('general');
  
  // Update local state when props change
  useEffect(() => {
    setLocalVolume(volume);
    setLocalTempo(defaultTempo || 120);
    setLocalSubdivisions(defaultSubdivisions || 4);
  }, [volume, defaultTempo, defaultSubdivisions]);
  
  // Apply volume changes immediately
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setLocalVolume(newVolume);
    setVolume(newVolume); // This updates the actual metronome
  };
  
  // Apply other settings
  const handleApply = () => {
    setDefaultTempo(localTempo);
    setDefaultSubdivisions(localSubdivisions);
    
    // Close the menu when settings are applied
    if (onClose) {
      onClose();
    }
  };
  
  return (
    <div className="settings-content">
      <h2>Settings</h2>
      
      {/* Settings Tabs */}
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
      
      {/* General Settings */}
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </label>
          </div>
          
          <div className="settings-row">
            <label>
              <span>Current Mode:</span>
              <span className="settings-value">{currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Audio Settings */}
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
      </div>
      
      <button 
        className="settings-save-button" 
        onClick={handleApply}
      >
        Apply Settings
      </button>
    </div>
  );
};

export default SettingsContent;