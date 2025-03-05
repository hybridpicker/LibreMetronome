import React, { useState, useEffect } from 'react';
import './TrainingOverlay.css';
import trainingButtonIcon from '../../../assets/svg/training-button.svg';
import trainingButtonOnIcon from '../../../assets/svg/training-button-on.svg';

/**
 * TrainingModal displays the training mode settings.
 */
const TrainingModal = ({ onClose, trainingSettings, setTrainingSettings, setMode, setIsPaused }) => {
  const [localSettings, setLocalSettings] = useState(trainingSettings);

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
    <div className="training-overlay" role="dialog" aria-modal="true">
      <div className="training-modal">
        <button 
          className="training-close-button" 
          onClick={() => {
            onClose();
            if (setIsPaused) {
              setIsPaused(true);
            }
          }} 
          aria-label="Close Training Overlay"
        >
          &times;
        </button>
        <h2>Training Mode Settings</h2>

        {/* Macro-Timing Section */}
        <div className="training-section">
          <h3>Macro-Timing</h3>
          <label>
            Macro Mode:
            <select
              value={localSettings.macroMode}
              onChange={(e) => handleChange('macroMode', e.target.value)}
            >
              <option value={0}>Off</option>
              <option value={1}>Fixed Silence</option>
              <option value={2}>Random Silence</option>
            </select>
          </label>
          {localSettings.macroMode === 1 && (
            <div className="training-options">
              <label>
                Measures until Mute:
                <input
                  type="number"
                  value={localSettings.measuresUntilMute}
                  onChange={(e) => handleChange('measuresUntilMute', Number(e.target.value))}
                />
              </label>
              <label>
                Mute Duration (measures):
                <input
                  type="number"
                  value={localSettings.muteDurationMeasures}
                  onChange={(e) => handleChange('muteDurationMeasures', Number(e.target.value))}
                />
              </label>
            </div>
          )}
          {localSettings.macroMode === 2 && (
            <div className="training-options">
              <label>
                Mute Probability (0-1):
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={localSettings.muteProbability}
                  onChange={(e) => handleChange('muteProbability', Number(e.target.value))}
                />
              </label>
            </div>
          )}
        </div>

        {/* Speed Training Section */}
        <div className="training-section">
          <h3>Speed Training</h3>
          <label>
            Speed Mode:
            <select
              value={localSettings.speedMode}
              onChange={(e) => handleChange('speedMode', e.target.value)}
            >
              <option value={0}>Off</option>
              <option value={1}>Auto Increase Tempo</option>
              <option value={2}>Manual Increase Only</option>
            </select>
          </label>
          {(localSettings.speedMode === 1 || localSettings.speedMode === 2) && (
            <div className="training-options">
              {localSettings.speedMode === 1 && (
                <label>
                  Measures until Speed Up:
                  <input
                    type="number"
                    value={localSettings.measuresUntilSpeedUp}
                    onChange={(e) => handleChange('measuresUntilSpeedUp', Number(e.target.value))}
                  />
                </label>
              )}
              <label>
                Tempo Increase (%):
                <input
                  type="number"
                  value={localSettings.tempoIncreasePercent}
                  onChange={(e) => handleChange('tempoIncreasePercent', Number(e.target.value))}
                />
              </label>
              <div className="training-info-text" style={{
                marginTop: '10px',
                padding: '8px',
                backgroundColor: '#f0f8ff',
                border: '1px solid #cce5ff',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <p style={{ margin: '0 0 5px 0' }}>
                  <strong>Speed Training Modes:</strong>
                </p>
                {localSettings.speedMode === 1 && (
                  <>
                    <p style={{ margin: '0 0 5px 0' }}>
                      <strong>Auto Increase:</strong> Tempo increases automatically after the specified number of measures.
                    </p>
                    <p style={{ margin: '0' }}>
                      The "Accelerate" button also appears, allowing you to manually increase tempo at any time.
                    </p>
                  </>
                )}
                {localSettings.speedMode === 2 && (
                  <p style={{ margin: '0' }}>
                    <strong>Manual Increase Only:</strong> An "Accelerate" button will appear. Click it to manually increase tempo by the specified percentage.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          className="training-save-button" 
          onClick={handleSave}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

/**
 * TrainingButton displays a button with an icon that changes when training mode is active.
 */
const TrainingButton = ({ onClick, active }) => {
  return (
    <button 
      className={`training-button ${active ? 'training-button-active' : ''}`}
      onClick={onClick} 
      aria-label="Toggle Training Overlay"
    >
      Training
    </button>
  );
};

/**
 * TrainingOverlay combines the TrainingButton and the TrainingModal.
 */
const TrainingOverlay = ({ trainingSettings, setTrainingSettings, onToggleInfo, setMode, setIsPaused }) => {
  const [isVisible, setIsVisible] = useState(false);
  const trainingActive = trainingSettings.macroMode !== 0 || trainingSettings.speedMode !== 0;

  const toggleOverlay = () => {
    setIsVisible(prev => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <TrainingButton onClick={toggleOverlay} active={trainingActive} />
      {isVisible && (
        <TrainingModal
          onClose={toggleOverlay}
          trainingSettings={trainingSettings}
          setTrainingSettings={setTrainingSettings}
          setMode={setMode}
          setIsPaused={setIsPaused}
        />
      )}
    </>
  );
};

export default TrainingOverlay;