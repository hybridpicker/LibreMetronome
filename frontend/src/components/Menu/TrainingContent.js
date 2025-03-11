// src/components/Menu/TrainingContent.js
import React, { useState, useEffect } from 'react';

const TrainingContent = ({ 
  trainingSettings, 
  setTrainingSettings, 
  setMode, 
  setIsPaused, 
  onClose 
}) => {
  const [localSettings, setLocalSettings] = useState(trainingSettings);
  const [activeSubTab, setActiveSubTab] = useState('macro'); // 'macro' or 'speed'

  useEffect(() => {
    setLocalSettings(trainingSettings);
  }, [trainingSettings]);

  const handleChange = (field, value) => {
    // If the user chooses a non-zero macroMode, set speedMode to 0.
    if (field === 'macroMode') {
      const macroVal = Number(value);
      setLocalSettings(prev => ({
        ...prev,
        macroMode: macroVal,
        speedMode: (macroVal !== 0) ? 0 : prev.speedMode
      }));
    } else if (field === 'speedMode') {
      setLocalSettings(prev => ({
        ...prev,
        speedMode: Number(value)
      }));
    } else {
      setLocalSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = () => {
    setTrainingSettings(localSettings);
    setIsPaused(true);
    onClose();
    if (localSettings.macroMode !== 0 || localSettings.speedMode !== 0) {
      setMode(prevMode => prevMode);
    }
  };

  return (
    <div className="training-content">
      <h2>Training Mode</h2>
      
      {/* Training Tabs */}
      <div className="training-subtabs">
        <button 
          className={`training-subtab ${activeSubTab === 'macro' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('macro')}
        >
          Macro-Timing
        </button>
        <button 
          className={`training-subtab ${activeSubTab === 'speed' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('speed')}
        >
          Speed Training
        </button>
      </div>

      {/* Macro-Timing Section */}
      <div className={`training-section ${activeSubTab === 'macro' ? 'active' : ''}`}>
        <div className="training-overview">
          <p>
            Macro-timing training helps develop your internal sense of rhythm by temporarily muting the metronome, 
            challenging you to maintain the tempo without audio cues.
          </p>
        </div>
        
        <div className="training-control">
          <label className="training-select-label">
            Mode:
            <select
              value={localSettings.macroMode}
              onChange={(e) => handleChange('macroMode', e.target.value)}
              className="training-select"
            >
              <option value={0}>Off</option>
              <option value={1}>Fixed Silence Intervals</option>
              <option value={2}>Random Silence</option>
            </select>
          </label>
        </div>
        
        {localSettings.macroMode === 1 && (
          <div className="training-options">
            <div className="training-explanation">
              <p>In Fixed Silence mode, the metronome will play for a set number of measures, then mute for a specified duration, and repeat this pattern.</p>
            </div>
            <label className="training-input-label">
              <span>Measures until mute:</span>
              <input
                type="number"
                min="1"
                value={localSettings.measuresUntilMute}
                onChange={(e) => handleChange('measuresUntilMute', Number(e.target.value))}
                className="training-input"
              />
              <span className="input-description">Number of measures the metronome will play before muting</span>
            </label>
            <label className="training-input-label">
              <span>Mute duration:</span>
              <input
                type="number"
                min="1"
                value={localSettings.muteDurationMeasures}
                onChange={(e) => handleChange('muteDurationMeasures', Number(e.target.value))}
                className="training-input"
              />
              <span className="input-description">Number of measures the metronome will remain silent</span>
            </label>
          </div>
        )}
        
        {localSettings.macroMode === 2 && (
          <div className="training-options">
            <div className="training-explanation">
              <p>In Random Silence mode, each measure has a probability of being muted, creating an unpredictable pattern that challenges your timing skills.</p>
            </div>
            <label className="training-input-label">
              <span>Mute probability:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.muteProbability}
                onChange={(e) => handleChange('muteProbability', Number(e.target.value))}
                className="training-slider"
              />
              <span className="slider-value">{localSettings.muteProbability}</span>
              <span className="input-description">Higher values increase the chance of muted measures (0 = never, 1 = always)</span>
            </label>
          </div>
        )}
      </div>

      {/* Speed Training Section */}
      <div className={`training-section ${activeSubTab === 'speed' ? 'active' : ''}`}>
        <div className="training-overview">
          <p>
            Speed training gradually increases the tempo to help you build speed and technical facility in a controlled, 
            progressive manner.
          </p>
        </div>
        
        <div className="training-control">
          <label className="training-select-label">
            Mode:
            <select
              value={localSettings.speedMode}
              onChange={(e) => handleChange('speedMode', e.target.value)}
              className="training-select"
            >
              <option value={0}>Off</option>
              <option value={1}>Auto Increase</option>
              <option value={2}>Manual Increase</option>
            </select>
          </label>
        </div>
        
        {(localSettings.speedMode === 1 || localSettings.speedMode === 2) && (
          <div className="training-options">
            <div className="training-explanation">
              {localSettings.speedMode === 1 ? (
                <p>In Auto Increase mode, the tempo will automatically increase after a set number of measures, helping you gradually build speed without interruption.</p>
              ) : (
                <p>In Manual Increase mode, you control when to increase the tempo by clicking the "Accelerate" button that will appear in the metronome interface.</p>
              )}
            </div>
            
            {localSettings.speedMode === 1 && (
              <label className="training-input-label">
                <span>Measures between increases:</span>
                <input
                  type="number"
                  min="1"
                  value={localSettings.measuresUntilSpeedUp}
                  onChange={(e) => handleChange('measuresUntilSpeedUp', Number(e.target.value))}
                  className="training-input"
                />
                <span className="input-description">Number of measures to play before automatically increasing tempo</span>
              </label>
            )}
            
            <label className="training-input-label">
              <span>Tempo increase (%):</span>
              <input
                type="range"
                min="1"
                max="20"
                value={localSettings.tempoIncreasePercent}
                onChange={(e) => handleChange('tempoIncreasePercent', Number(e.target.value))}
                className="training-slider"
              />
              <span className="slider-value">{localSettings.tempoIncreasePercent}%</span>
              <span className="input-description">Percentage by which the tempo will increase each time</span>
            </label>
            
            <div className="training-tip">
              <div className="tip-icon">💡</div>
              <div className="tip-content">
                <strong>Practice Tip:</strong> Start at a comfortable tempo where you can play with perfect technique. Small, incremental increases (3-5%) are most effective for building speed safely.
              </div>
            </div>
          </div>
        )}
      </div>

      <button 
        className="training-save-button" 
        onClick={handleSave}
      >
        Apply Settings
      </button>
    </div>
  );
};

export default TrainingContent;