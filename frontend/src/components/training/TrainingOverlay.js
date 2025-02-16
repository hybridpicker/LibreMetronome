// File: src/components/training/TrainingOverlay.js
import React, { useState, useEffect } from 'react';
import './TrainingOverlay.css';
import trainingButtonIcon from '../../assets/svg/training-button.svg';       // Icon when training mode is off
import trainingButtonOnIcon from '../../assets/svg/training-button-on.svg';    // Icon when training mode is on

/**
 * TrainingModal displays the training mode settings.
 */
const TrainingModal = ({ onClose, trainingSettings, setTrainingSettings }) => {
  const [localSettings, setLocalSettings] = useState(trainingSettings);

  useEffect(() => {
    console.log("[TrainingModal] Received trainingSettings:", trainingSettings);
    setLocalSettings(trainingSettings);
  }, [trainingSettings]);

  const handleChange = (field, value) => {
    console.log(`[TrainingModal] ${field} changed to:`, value);
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log("[TrainingModal] Saving settings:", localSettings);
    setTrainingSettings(localSettings);
    onClose();
  };

  return (
    <div className="training-overlay" role="dialog" aria-modal="true">
      <div className="training-modal">
        <button 
          className="training-close-button" 
          onClick={() => { console.log("[TrainingModal] Close clicked"); onClose(); }} 
          aria-label="Close Training Overlay"
        >
          &times;
        </button>
        <h2>Training Mode Settings</h2>
        <div className="training-section">
          <h3>Macro-Timing</h3>
          <label>
            Macro Mode:
            <select
              value={localSettings.macroMode}
              onChange={(e) => handleChange('macroMode', Number(e.target.value))}
            >
              <option value={0}>Off</option>
              <option value={1}>Fixed Silence (Mode I)</option>
              <option value={2}>Random Silence (Mode II)</option>
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
        <div className="training-section">
          <h3>Speed Training</h3>
          <label>
            Speed Mode:
            <select
              value={localSettings.speedMode}
              onChange={(e) => handleChange('speedMode', Number(e.target.value))}
            >
              <option value={0}>Off</option>
              <option value={1}>Auto Increase (Mode I)</option>
              <option value={2}>Manual Increase (Mode II - press "U")</option>
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
            </div>
          )}
        </div>
        <button className="training-save-button" onClick={handleSave}>
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
  console.log("[TrainingButton] Render, active =", active);
  return (
    <button className="training-button" onClick={onClick} aria-label="Toggle Training Overlay">
      <img src={active ? trainingButtonOnIcon : trainingButtonIcon} alt="Training" />
    </button>
  );
};

/**
 * TrainingOverlay combines the TrainingButton and the TrainingModal.
 */
const TrainingOverlay = ({ trainingSettings, setTrainingSettings }) => {
  const [isVisible, setIsVisible] = useState(false);
  // Training is active if either macroMode or speedMode is not 0.
  const trainingActive = trainingSettings.macroMode !== 0 || trainingSettings.speedMode !== 0;

  const toggleOverlay = () => {
    console.log("[TrainingOverlay] Toggling overlay. New state:", !isVisible);
    setIsVisible(prev => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log("[TrainingOverlay] Escape pressed, closing overlay.");
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
        />
      )}
    </>
  );
};

export default TrainingOverlay;
